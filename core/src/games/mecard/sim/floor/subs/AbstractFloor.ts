import type { Rng } from "../../base/Rng"
import type { Monster } from "../../catalog/monsters"
import { isHalt } from "../../run/Journey"
import type { FightKind, Place, PlaceKind, Spot } from "../../run/Journey"
import type { Floor, FloorContext, FloorType } from "../Floor"

/** How many layers a floor lays, the boss in the last. */
export const LAYERS = 12

/** How likely two places side by side lead on together, rather than one of the two going on alone. */
const BOTH_ON = 0.3

/** How many places a layer has at least and at most, between the first and the last two. */
const MIN_WIDTH = 2
const MAX_WIDTH = 4

/** How many places the first layer has at least: as many paths to start on. */
const FIRST_WIDTH = 3

/** The first layer an elite may lie in, so the party meets a few battles before. */
const FIRST_ELITE_LAYER = 4

/** How many places of a same nature, halts or fights, a path may not meet in a row. */
const SAME_IN_A_ROW = 3

/** How many plans a floor draws at most to find one with no such row: few ever fail twice. */
const MOST_PLANS = 32

/** The kinds of place a floor lays: all but the exits, which are not its own. */
type LaidKind = Exclude<PlaceKind, "exit">

/** A place to come, not on the map yet: what it holds may still change, and its monsters are not drawn. */
interface PlannedPlace {
    kind: LaidKind
    readonly at: Spot
    readonly leading: readonly PlannedPlace[]
    readonly next: PlannedPlace[]
}

/** How often each kind of place turns up, relative to the others. */
export type PlaceWeights = Readonly<Partial<Record<LaidKind, number>>>

/** How often each kind of place turns up on a floor that says nothing else. */
const WEIGHTS: PlaceWeights = {
    battle: 28, elite: 7, hospital: 5, shop: 5, chest: 6, removal: 4, altar: 3, forge: 4, butcher: 2,
    enchanter: 4, alchemist: 3, merchant: 4, witch: 3, inventor: 3, tavern: 2, trainer: 2, demon: 1,
    antiquarian: 3, magician: 3, madDoctor: 1, weaver: 2, strategist: 3, necromancer: 2,
}

/**
 * A floor laid in layers of places, each leading to some of the next, from the battles of the first layer to
 * the boss, a hospital in every place before it. Each floor says only who lives there, and what it favours.
 *
 * @remarks
 * The paths never cross: each layer leads to the next as two rows zipped together, from left to right.
 * Every place is reached from the layer before and leads to the layer after. A place other than a battle
 * is never of the kind of a place leading to it, so a path does not meet the same shop twice in a row.
 * The map is planned before it is laid, for no path to meet three halts or three fights in a row: a battle
 * or a halt comes in the middle of them, which only the whole path tells.
 */
export abstract class AbstractFloor implements Floor {


    public abstract readonly type: FloorType

    constructor(public readonly level: number){}


    public fillMap(ctx: FloorContext): void {
        const plan = this.#planWithoutRows(ctx.rng)
        const places = plan.map(({ kind, at }) => this.#lay(ctx, kind, at))
        plan.forEach(({ next }, index) => {
            for(const to of next) ctx.link(places[index], places[plan.indexOf(to)])
        })
    }


    /** The monsters of a fight in a layer, drawn from some random numbers. */
    protected abstract monsters(fight: FightKind, layer: number, rng: Rng): Monster[]

    /** How often each kind of place turns up, in the layers of the middle. */
    protected weights(): PlaceWeights {
        return WEIGHTS
    }


    /**
     * A plan no path meets too many alike in a row on. Breaking its rows may fail, a place lying between a
     * row of halts and a row of fights: another plan is then drawn. A floor with nothing to break them with
     * ends on its last plan, rows and all.
     */
    #planWithoutRows(rng: Rng): PlannedPlace[] {
        for(let tries = 1; ; tries++){
            const plan = this.#plan(rng)
            this.#breakRows(plan, rng)
            if(tries === MOST_PLANS || !hasRows(plan)) return plan
        }
    }

    /** The places to come, layer after layer, each after those leading to it. */
    #plan(rng: Rng): PlannedPlace[] {
        const plan: PlannedPlace[] = []
        let previous: PlannedPlace[] = []
        for(let layer = 0; layer < LAYERS; layer++){
            const width = widthOf(layer, rng)
            const links = layer === 0 ? [] : zipped(previous.length, width, () => rng.chance(BOTH_ON))
            const row: PlannedPlace[] = []
            for(let index = 0; index < width; index++){
                const leading = links.filter(([, to]) => to === index).map(([from]) => previous[from])
                const kind = this.#kindOf(layer, leading, rng)
                const at = { layer, across: (index + 0.5) / width }
                const place: PlannedPlace = { kind, at, leading, next: [] }
                for(const from of leading) from.next.push(place)
                row.push(place)
            }
            plan.push(...row)
            previous = row
        }
        return plan
    }

    /** Lay a place on the map, its monsters with it when it holds a fight. */
    #lay(ctx: FloorContext, kind: LaidKind, at: Spot): Place {
        if(isHalt(kind)) return ctx.addHalt(kind, at)
        return ctx.addFight(kind, this.monsters(kind, at.layer, ctx.rng), at)
    }

    /** The kind of a place of a layer, the places leading to it known. */
    #kindOf(layer: number, leading: readonly PlannedPlace[], rng: Rng): LaidKind {
        if(layer === 0) return "battle"
        if(layer === LAYERS - 1) return "boss"
        if(layer === LAYERS - 2) return "hospital"
        return drawn(this.#allowed(layer, leading), rng) ?? "battle"
    }

    /** The kinds a place of a layer may be, with their weights, the places next to it known. */
    #allowed(layer: number, around: readonly PlannedPlace[]): [LaidKind, number][] {
        return (Object.entries(this.weights()) as [LaidKind, number][]).filter(([kind]) => {
            if(kind === "elite" && layer < FIRST_ELITE_LAYER) return false
            if(kind === "shop" && layer === 1) return false
            return kind === "battle" || !around.some(place => place.kind === kind)
        })
    }

    /** The halts a fight may turn into. */
    #haltsFor({ at, leading, next }: PlannedPlace): [LaidKind, number][] {
        return this.#allowed(at.layer, [...leading, ...next]).filter(([kind]) => isHalt(kind))
    }

    /**
     * Turn halts into battles and fights into halts until no path meets too many alike in a row, each time
     * as much in the middle of the rows as can be: one change may so break all the paths going through it.
     * A place changes once at most, for a change undoing another not to go on forever.
     */
    #breakRows(plan: readonly PlannedPlace[], rng: Rng): void {
        const changed = new Set<PlannedPlace>()
        const free = (place: PlannedPlace): boolean => {
            return !changed.has(place) && place.at.layer > 0 && place.at.layer < LAYERS - 2
        }
        const replaceable = (place: PlannedPlace): boolean => free(place) && this.#haltsFor(place).length > 0
        for(;;){
            const halt = rng.pick(middlesOfRows(plan, isHaltPlace, free))
            const place = halt ?? rng.pick(middlesOfRows(plan, isFightPlace, replaceable))
            if(!place) return
            place.kind = halt ? "battle" : drawn(this.#haltsFor(place), rng) ?? place.kind
            changed.add(place)
        }
    }
}

const isHaltPlace = (place: PlannedPlace): boolean => isHalt(place.kind)
const isFightPlace = (place: PlannedPlace): boolean => !isHalt(place.kind)

/** Does a path of a plan meet too many alike in a row? */
function hasRows(plan: readonly PlannedPlace[]): boolean {
    return middlesOfRows(plan, isHaltPlace).length > 0 || middlesOfRows(plan, isFightPlace).length > 0
}

/** One of the kinds, the heavier the likelier, none for none. */
function drawn(kinds: readonly [LaidKind, number][], rng: Rng): LaidKind|undefined {
    let roll = rng.next() * kinds.reduce((sum, [, weight]) => sum + weight, 0)
    for(const [kind, weight] of kinds){
        roll -= weight
        if(roll < 0) return kind
    }
    return undefined
}

/**
 * The places lying the most in the middle of the rows of too many places alike, among those that may change,
 * none when there is no such place.
 */
function middlesOfRows(
    plan: readonly PlannedPlace[],
    alike: (place: PlannedPlace) => boolean,
    free: (place: PlannedPlace) => boolean = () => true,
): PlannedPlace[] {
    const before = rowsAlong(plan, alike, place => place.leading)
    const after = rowsAlong([...plan].reverse(), alike, place => place.next)
    const centrality = (place: PlannedPlace): number => Math.min(before(place), after(place))
    const inRow = plan.filter(place => before(place) + after(place) - 1 >= SAME_IN_A_ROW && free(place))
    const most = Math.max(...inRow.map(centrality))
    return inRow.filter(place => centrality(place) === most)
}

/**
 * How many places alike in a row end on each place, itself counted, coming from the places given by `from`.
 *
 * @param places Each after those it comes from.
 */
function rowsAlong(
    places: readonly PlannedPlace[],
    alike: (place: PlannedPlace) => boolean,
    from: (place: PlannedPlace) => readonly PlannedPlace[],
): (place: PlannedPlace) => number {
    const counts = new Map<PlannedPlace, number>()
    const count = (place: PlannedPlace): number => counts.get(place) ?? 0
    for(const place of places){
        counts.set(place, alike(place) ? 1 + Math.max(0, ...from(place).map(count)) : 0)
    }
    return count
}

/** How many places a layer has. */
function widthOf(layer: number, rng: Rng): number {
    if(layer === LAYERS - 1) return 1
    if(layer === 0) return FIRST_WIDTH + rng.int(MAX_WIDTH - FIRST_WIDTH + 1)
    return MIN_WIDTH + rng.int(MAX_WIDTH - MIN_WIDTH + 1)
}

/**
 * The links between a row of places and the next, as pairs of indices, zipped from left to right: both
 * start at their first place and end at their last, each step going on in one of the two rows, or in both
 * when they are side by side and the coin says so. No two links cross, and every place has one at least.
 */
export function zipped(fromWidth: number, toWidth: number, both: () => boolean): [number, number][] {
    const links: [number, number][] = [[0, 0]]
    let from = 0
    let to = 0
    while(from < fromWidth - 1 || to < toWidth - 1){
        if(from === fromWidth - 1) to++
        else if(to === toWidth - 1) from++
        else {
            // The row whose next place lies further left goes on, so the links follow the places across.
            const fromNext = (from + 1.5) / fromWidth
            const toNext = (to + 1.5) / toWidth
            if(both()){
                from++
                to++
            } else if(fromNext < toNext) from++
            else to++
        }
        links.push([from, to])
    }
    return links
}
