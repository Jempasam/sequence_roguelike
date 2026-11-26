import type { Sprite } from "../../../../../engine/gpu"
import type { Area, Point } from "../../../../../engine/math"
import type { ParticleSystem, Random } from "../../../../../engine/particles"
import type { Visual } from "../../../sim/base/Visual"
import type { FloorType } from "../../../sim/floor/Floor"
import type { Place } from "../../../sim/run/Journey"

/** What an ambient effect reads of the map shown, and what it draws with. */
export interface AmbientContext {

    // DRAW //

    /** The particles that blend normally. */
    readonly alpha: ParticleSystem

    /** The particles that glow: they add up. */
    readonly additive: ParticleSystem

    /** The randomness of the display. */
    readonly random: Random

    // MAP //

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
