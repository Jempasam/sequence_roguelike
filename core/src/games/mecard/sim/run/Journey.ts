import type { Text } from "../../../../semantic"
import type { Rng } from "../base/Rng"
import type { Monster } from "../catalog/monsters"
import type { Floor, FloorContext } from "../floor/Floor"

/** What a place of the journey holds. */
export type PlaceKind =
    | "battle"|"elite"|"boss"|"hospital"|"shop"|"chest"|"removal"|"altar"|"forge"|"butcher"|"enchanter"
    | "alchemist"|"merchant"|"witch"|"inventor"|"tavern"|"trainer"|"demon"|"antiquarian"|"magician"
    | "madDoctor"|"weaver"|"strategist"|"necromancer"|"exit"

/** The kinds of fights a place may hold. */
export type FightKind = "battle"|"elite"|"boss"

/** The kinds of halts: the places that hold no fight, but a visit. */
export type HaltKind = Exclude<PlaceKind, FightKind>

/** Is a kind of place a halt, visited rather than fought? */
export function isHalt(kind: PlaceKind): kind is HaltKind {
    return kind !== "battle" && kind !== "elite" && kind !== "boss"
}

/** What the players are told of a kind of place: its name, and what it does. */
export interface PlaceInfo {
    readonly name: string
    readonly description: Text
}

/** Where a place lies on a map. */
export interface Spot {
    /** Its row, from 0 at the bottom of the map. */
    readonly layer: number

    /** Where it lies across its row, from 0 on the left to 1 on the right. */
    readonly across: number
}

/** A place of the journey: what it holds, where it lies, and where it leads. */
export interface Place extends Spot {
    readonly kind: PlaceKind

    /** The places it leads to, from left to right. */
    readonly next: Place[]

    /** The floor it leads out to, none but on an exit. */
    readonly exitTo: Floor|null

    /** The monsters of its fight, none on a halt. */
    readonly monsters: readonly Monster[]
}

/**
 * The map of a floor: places, and the links leading from one to another. The players go from place to place,
 * choosing among those the one they stand on leads to.
 *
 * @remarks
 * It makes no place by itself and holds no rule on how they lie: its floor fills it through
 * {@link FloorContext}, and anything holding it may change it afterwards. The way in is no one's to lay: it
 * is the places nothing leads to. An exit leads to the other exits, so the players can look through one and
 * take another.
 */
export class Journey implements FloorContext {


    /** The seed of what lies on the map for the look of it, the same however often it is drawn. */
    public readonly scenery: number

    /** The floors its exits lead to, from left to right. */
    public exits: readonly Floor[] = []

    constructor(
        public readonly rng: Rng,

        /** The seed of its scenery, drawn by default: a map read back keeps its own. */
        scenery = rng.int(2 ** 31),
    ){
        this.scenery = scenery
    }


    /** Every place of the map, in the order they were laid. */
    public get places(): readonly Place[] {
        return this.#places
    }

    /** The places of each row of the map, from left to right. */
    public get layers(): readonly (readonly Place[])[] {
        const count = Math.max(-1, ...this.#places.map(place => place.layer)) + 1
        return Array.from({ length: count }, (_, layer) => {
            return this.#places.filter(place => place.layer === layer).sort((a, b) => a.across - b.across)
        })
    }

    /** The places a party starts from: those nothing leads to. */
    public get entries(): readonly Place[] {
        const reached = new Set(this.#places.flatMap(place => place.next))
        return this.#places.filter(place => !reached.has(place))
    }

    /** Lay a fight on the map, with its monsters. */
    public addFight(kind: FightKind, monsters: readonly Monster[], at: Spot): Place {
        return this.#add({ ...at, kind, next: [], exitTo: null, monsters })
    }

    /** Lay a halt on the map. */
    public addHalt(kind: Exclude<HaltKind, "exit">, at: Spot): Place {
        return this.#add({ ...at, kind, next: [], exitTo: null, monsters: [] })
    }

    /** Make a place lead to another. */
    public link(from: Place, to: Place): void {
        from.next.push(to)
    }

    /** Lay an exit to each floor, a row past the map, every place leading nowhere leading to them all. */
    public addExits(floors: readonly Floor[]): void {
        const ends = this.#places.filter(place => place.next.length === 0)
        const layer = this.layers.length
        this.exits = floors
        floors.forEach((exitTo, index) => {
            const across = (index + 0.5) / floors.length
            const exit = this.#add({ kind: "exit", layer, across, next: [], exitTo, monsters: [] })
            for(const end of ends) this.link(end, exit)
        })
    }

    /** The places a party may go to from where it stands: the entries when it stands nowhere yet. */
    public nextOf(place: Place|null): readonly Place[] {
        if(!place) return this.entries
        if(!place.exitTo) return place.next
        return this.#places.filter(other => other.exitTo && other !== place)
    }


    readonly #places: Place[] = []

    #add(place: Place): Place {
        this.#places.push(place)
        return place
    }
}
