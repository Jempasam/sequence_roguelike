import type { Sprite } from "../../../../../engine/gpu"
import type { ParticleSystem, Random } from "../../../../../engine/particles"
import type { FloorType } from "../../../sim/floor/Floor"
import type { FightType } from "../../../sim/fight/FightType"
import type { HaltType } from "../../../sim/halt/HaltType"
import type { Place } from "../../../sim/run/Journey"
import type { Visual } from "../../../sim/base/Visual"
import type { ParticlePoint } from "../ParticleContext"

/** A fight of the map, as the ambient effects know it. */
export interface AmbientFight {
    readonly place: Place
    readonly type: FightType

    /** Where its token lies in the interface. */
    readonly position: ParticlePoint

    /** The party went through it already. */
    readonly visited: boolean
}

/** A halt of the map, as the ambient effects know it. */
export interface AmbientHalt {
    readonly place: Place
    readonly type: HaltType

    /** Where its token lies in the interface. */
    readonly position: ParticlePoint
}

/** What the ambient effects may know of the map shown, read only. */
export interface AmbientMap {

    /** The halts of the map whose token is shown. */
    halts(): readonly AmbientHalt[]

    /** The fights of the map whose token is shown. */
    fights(): readonly AmbientFight[]

    /** The size of the interface. */
    size(): { readonly width: number, readonly height: number }

    /** Where the party stands on the map, none before its first place. */
    heroPosition(): ParticlePoint|null

    /** The sort of the floor shown. */
    floor(): FloorType

    /** The sprite of a visual, none while the sprites are not loaded. */
    sprite(visual: Visual|null): Sprite|null

    /** The coin of the gold, none while it is not loaded. */
    coin(): Sprite|null
}

/** What an effect draws with. */
export interface AmbientParticles {
    readonly alpha: ParticleSystem
    readonly additive: ParticleSystem
    readonly random: Random
}

/** An effect being played. */
export interface AmbientPlay {

    /**
     * Move it on, emitting the particles of the moment.
     *
     * @returns False once it is over.
     */
    update(dt: number): boolean
}

/** A sort of ambient effect, which a director starts from time to time. */
export interface AmbientEffect {
    readonly id: string

    /**
     * How likely it is, relative to the others: 0 when it cannot play on this map.
     */
    weight(map: AmbientMap): number

    /**
     * Start it. It chooses what it needs of the map.
     *
     * @returns What plays it, or none when it finally cannot.
     */
    start(map: AmbientMap, particles: AmbientParticles): AmbientPlay|null
}
