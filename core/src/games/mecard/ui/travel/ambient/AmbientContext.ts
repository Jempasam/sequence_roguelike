import type { Sprite } from "../../../../../engine/gpu"
import type { Area, Point } from "../../../../../engine/math"
import type { ParticleSystem, Random } from "../../../../../engine/particles"
import type { Visual } from "../../../sim/base/Visual"
import type { Unit } from "../../../sim/battle/Unit"
import type { FloorType } from "../../../sim/floor/Floor"
import type { Heart } from "../../../sim/heart/Heart"
import type { Hero } from "../../../sim/run/Hero"
import type { Place } from "../../../sim/run/Journey"

/** A unit of the space an ambient decorates, and where it stands. */
export interface AmbientUnit {
    readonly unit: Hero|Unit

    /** Where its feet are. */
    readonly position: Point

    /** Where the top of its picture is. */
    readonly head: Point

    /** Where it faces: a direction of length 1. */
    readonly facing: Point

    /** The hearts shown for it, which may lag behind the ones of the simulation while a battle plays. */
    readonly hearts: readonly Heart[]
}

/**
 * A space an ambient decorates, such as the map of a journey or the ground of a battle: what an ambient
 * effect reads of it, and what it draws with.
 */
export interface AmbientContext {

    // STATE //

    /** Are the effects to play in this space? */
    enabled(): boolean

    /** Is the space laid out and still, so an effect may be placed in it? */
    settled(): boolean

    /** What is decorated, none while there is nothing: another one starts the ambient over. */
    scene(): object|null

    // DRAW //

    /** The particles that blend normally. */
    readonly alpha: ParticleSystem

    /** The particles that glow: they add up. */
    readonly additive: ParticleSystem

    /** The randomness of the display. */
    readonly random: Random

    /** How large a thing of the ambient is drawn in this space: 1 for its own size, 2 for twice as large. */
    readonly scale: number

    // THEME //

    /** Is the space in the open air, under a sky? */
    outdoors(): boolean

    /** May travelers come in and go out by the edges of the space? */
    openEdges(): boolean

    // SPACE //

    /** The units of the space. */
    units(): readonly AmbientUnit[]

    /**
     * The places of the map whose token is shown. What a place holds (`place.fight`, `place.halt`) is read
     * from the place itself.
     */
    places(): readonly {
        readonly place: Place

        /** Where its token lies in the interface. */
        readonly position: Point

        /** The party went through it already. */
        readonly visited: boolean
    }[]

    /** The size of the interface. */
    size(): { readonly width: number, readonly height: number }

    /** The part of the interface the map is shown in: the whole interface when it is not placed. */
    area(): Area

    /** Where the party stands on the map, none before its first place. */
    heroPosition(): Point|null

    /** The sort of the floor shown. */
    floor(): FloorType

    /** The sprite of a visual, none while the sprites are not loaded. */
    sprite(visual: Visual|null): Sprite|null

    /** The coin of the gold, none while it is not loaded. */
    coin(): Sprite|null
}
