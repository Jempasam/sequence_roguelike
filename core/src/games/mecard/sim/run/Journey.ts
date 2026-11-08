import type { Text } from "../../../../semantic"
import type { Rng } from "../base/Rng"
import type { Monster } from "../catalog/monsters"
import type { Floor, FloorContext } from "../floor/Floor"
import type { HaltType } from "../halt/HaltType"

import type { FightType, PlaceType } from "./PlaceType"

/** What the players are told of a sort of place: its name, and what it does. */
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
    /** What it holds: a fight of some sort, or a halt. */
    readonly type: PlaceType

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
    public addFight(type: FightType, monsters: readonly Monster[], at: Spot): Place {
        return this.#add({ ...at, type, next: [], exitTo: null, monsters })
    }

    /** Lay a halt on the map. */
    public addHalt(type: HaltType, at: Spot): Place {
        return this.#add({ ...at, type, next: [], exitTo: null, monsters: [] })
    }

    /**
     * Lay a halt in a row of the map, in the widest gap of the row: every place of the row before leads to
     * it, and it leads to every place of the row after. In the first row nothing leads to it, so it is a way in.
     *
     * @throws {@link Error} When the row is not one before the exits, or past the map.
     */
    public insertHalt(type: HaltType, layer: number): Place {
        const layers = this.layers
        const rows = layers.length - (this.exits.length > 0 ? 1 : 0)
        if(layer < 0 || layer >= rows) throw new Error(`The map has ${rows} rows to lay a halt in.`)
        const edges = [0, ...layers[layer].map(place => place.across), 1]
        let gap = 0
        for(let i = 1; i < edges.length; i++) if(edges[i] - edges[i - 1] > edges[gap + 1] - edges[gap]) gap = i - 1
        const halt = this.addHalt(type, { layer, across: (edges[gap] + edges[gap + 1]) / 2 })
        for(const before of layers[layer - 1] ?? []) this.link(before, halt)
        for(const after of layers[layer + 1] ?? []) this.link(halt, after)
        return halt
    }

    /** Make a place lead to another. */
    public link(from: Place, to: Place): void {
        from.next.push(to)
    }

    /**
     * Lay an exit to each floor, a row past the map, every place leading nowhere leading to them all.
     *
     * @param exit - The sort of halt of the exits: the catalog's, which this does not read itself.
     */
    public addExits(floors: readonly Floor[], exit: HaltType): void {
        const ends = this.#places.filter(place => place.next.length === 0)
        const layer = this.layers.length
        this.exits = floors
        floors.forEach((exitTo, index) => {
            const across = (index + 0.5) / floors.length
            const place = this.#add({ type: exit, layer, across, next: [], exitTo, monsters: [] })
            for(const end of ends) this.link(end, place)
        })
    }

    /**
     * Lay a halt in each of some rows before the map, one after the other, the last leading to the places the
     * map started from: the first halt is the new way in. Every row of the map, the exits' too, moves up.
     */
    public addEntries(halts: readonly HaltType[]): void {
        if(halts.length === 0) return
        const starts = this.entries
        for(const place of this.#places) (place as { layer: number }).layer += halts.length
        let before: Place|null = null
        halts.forEach((type, layer) => {
            const halt = this.addHalt(type, { layer, across: 0.5 })
            if(before) this.link(before, halt)
            before = halt
        })
        for(const start of starts) this.link(before!, start)
        // First in the order they were laid, so the exits stay the last, as a save reads them.
        this.#places.unshift(...this.#places.splice(this.#places.length - halts.length))
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
