import type { Hero } from "../../sim/run/Hero"
import type { Unit } from "../../sim/battle/Unit"
import type { Place } from "../../sim/run/Journey"

/** A point of the interface, in virtual pixels. */
export interface ParticlePoint {
    readonly x: number
    readonly y: number
}

/**
 * Where the particles of an event start and go, told by the screen that shows it: each method gives a point
 * of the interface, or none when what it asks for is not shown.
 */
export interface ParticleContext {

    /** The middle of a unit on the arena. */
    unitPosition(unit: Unit): ParticlePoint|null

    /** The hearts of a unit on the arena. */
    heartsOf(unit: Unit): ParticlePoint|null

    /** The feet of a unit on the arena. */
    feetOf(unit: Unit): ParticlePoint|null

    /** The coin of the gold counter. */
    goldCounter(): ParticlePoint|null

    /** The deck of the party, as a pile of cards. */
    deckPile(): ParticlePoint|null

    /** A character of the party: its portrait, where its hearts, items and usables are told. */
    heroPortrait(hero: Hero): ParticlePoint|null

    /** A place of the map. */
    placePosition(place: Place): ParticlePoint|null

    /** The pointer of the player. */
    pointer(): ParticlePoint

    /** The middle of the interface. */
    center(): ParticlePoint

    /** The size of the interface. */
    size(): { readonly width: number, readonly height: number }
}

/** What the screen of a battle places. */
export type BattleAnchors = Pick<ParticleContext, "unitPosition"|"heartsOf"|"feetOf"|"deckPile">

/** What the screen of the journey places. */
export type TravelAnchors = Pick<ParticleContext, "goldCounter"|"deckPile"|"heroPortrait"|"placePosition">
