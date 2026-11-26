import { STRIDES_PER_SECOND } from "../../rules"
import type { Pose } from "../../Action"
import type { Battle } from "../../Battle"
import type { SignalKey } from "../../ObserverMap"
import type { Unit } from "../../Unit"

import { tell } from "./relocate"
import type { GlideSignal } from "./signals"

/** The strides being gathered: where the unit started, how fast it goes, and how long they took so far. */
interface Gathered {
    readonly unit: Unit
    readonly from: Pose
    readonly speed: number
    readonly told: SignalKey<GlideSignal>
    seconds: number
}

/**
 * The strides of a unit, moved again and again, told as one move: its start, and where it is when something
 * else is told, or when the glide is. A battle holds one.
 */
export class Glide {


    constructor(
        private readonly battle: Battle,
    ){}


    /**
     * Start gathering the strides of a unit, what was gathered before told.
     *
     * @param speed - How fast the unit goes, in meters per second: how long the move is shown taking.
     * @param told - What the move is told as.
     */
    public start(unit: Unit, speed: number, told: SignalKey<GlideSignal>): void {
        this.tell()
        const from = { position: unit.position, direction: unit.direction }
        this.#gathered = { unit, from, speed, told, seconds: 0 }
    }

    /** Tell the move gathered so far, and stop gathering. */
    public tell(): void {
        const gathered = this.#gathered
        if(!gathered) return
        this.#gathered = null
        const { unit, from, told } = gathered
        if(from.position.equals(unit.position) && from.direction.equals(unit.direction)) return
        const duration = Math.max(1 / STRIDES_PER_SECOND, gathered.seconds)
        const to = { position: unit.position, direction: unit.direction }
        tell(this.battle, told, { unit, from, to, duration })
    }

    /** Tell what is gathered unless it is the strides of a unit, told as a given move: before it moves. */
    public keep(unit: Unit, told: SignalKey<GlideSignal>): void {
        const gathered = this.#gathered
        if(gathered && (gathered.unit !== unit || gathered.told !== told)) this.tell()
    }

    /** Tell what is gathered when it is the strides of a unit: before it jumps. */
    public cut(unit: Unit): void {
        if(this.#gathered?.unit === unit) this.tell()
    }

    /**
     * Add a stride to what is gathered.
     *
     * @param distance - How long the stride is, in meters.
     * @returns Is anything being gathered? The stride is to be told on its own otherwise.
     */
    public gather(distance: number): boolean {
        const gathered = this.#gathered
        if(!gathered) return false
        gathered.seconds += distance / gathered.speed
        return true
    }

    /** Forget what is gathered, told to nobody. */
    public reset(): void {
        this.#gathered = null
    }


    #gathered: Gathered|null = null
}
