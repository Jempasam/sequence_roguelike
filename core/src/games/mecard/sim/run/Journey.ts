import type { Text } from "../../../../semantic"
import type { Rng } from "../base/Rng"
import type { Floor, FloorContext } from "../floor/Floor"
import type { HaltType } from "../halt/HaltType"

import { NO_FIGHT_CONTEXT } from "../fight/FightType"
import type { FightContext, FightType } from "../fight/FightType"

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
    /** The fight it holds, fought first, none when it holds none. */
    readonly fight: FightType|null

    /** The halt it holds, visited after its fight when it has one, none when it holds none. */
    readonly halt: HaltType|null

    /** The places it leads to, from left to right. */
    readonly next: Place[]

    /** The floor it leads out to, none but on an exit. */
    readonly exitTo: Floor|null

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

    /** What the run is like, for the floor drawing its fights: nothing special by default. */
    public fights: FightContext = NO_FIGHT_CONTEXT

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

    /**
     * Lay a fight on the map, and the halt visited once it is won, none to go back to the map.
     * What a won fight gives is the halt's: nothing is given where none is laid.
     */
    public addFight(type: FightType, at: Spot, halt: HaltType|null = null): Place {
        return this.#add({ ...at, fight: type, halt, next: [], exitTo: null })
    }

    /** Lay a halt on the map. */
    public addHalt(type: HaltType, at: Spot): Place {
        return this.#add({ ...at, fight: null, halt: type, next: [], exitTo: null })
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

    /**
     * Lay a whole row of halts between two rows of the map, one behind each place of the row before: the place
     * leads to its halt alone, and the halt leads where the place led, so every path goes on as it went, through
     * a halt more. The rows from that place on, the exits' too, move down one. In the first row, nothing leading
     * to the places of the row it takes the place of, there is one in front of each, a way in; past the last row
     * of the map, the halts lead to the exits if there are any, and nowhere otherwise.
     *
     * @param layer - Where the row lies once laid, from 0: from the first row to just past the last.
     * @returns The halts laid, from left to right: as many as the row before has, or the row after in the first.
     * @throws {@link Error} When the row is not one from the first to just past the last before the exits.
     */
    public insertLayer(type: HaltType, layer: number): readonly Place[] {
        const layers = this.layers
        const rows = layers.length - (this.exits.length > 0 ? 1 : 0)
        if(layer < 0 || layer > rows) throw new Error(`The map has ${rows} rows: no row ${layer} to lay between them.`)
        const before = layers[layer - 1] ?? []
        const after = layers[layer] ?? []
        for(const place of this.#places) if(place.layer >= layer) (place as { layer: number }).layer++
        const laid: Place[] = []
        if(before.length > 0){
            for(const place of before){
                const halt = this.addHalt(type, { layer, across: place.across })
                halt.next.push(...place.next)
                place.next.splice(0, place.next.length, halt)
                laid.push(halt)
            }
        } else {
            for(const place of after){
                const halt = this.addHalt(type, { layer, across: place.across })
                halt.next.push(place)
                laid.push(halt)
            }
        }
        // Before the exits, which stay the last, as a save reads them.
        const firstExit = this.#places.findIndex(place => place.exitTo !== null)
        if(firstExit >= 0 && firstExit < this.#places.length - laid.length){
            this.#places.splice(this.#places.length - laid.length, laid.length)
            this.#places.splice(firstExit, 0, ...laid)
        }
        return laid
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
            const place = this.#add({ fight: null, halt: exit, layer, across, next: [], exitTo })
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
