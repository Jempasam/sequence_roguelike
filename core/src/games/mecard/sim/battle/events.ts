import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import type { Vector2 } from "../base/Vector2"
import type { Card } from "../card/Card"
import type { Heart } from "../heart/Heart"
import type { HeartKind } from "../heart/HeartKind"

import type { Area } from "./Area"
import type { Battle } from "./Battle"
import type { Team } from "./Team"
import type { Unit } from "./Unit"
import { HeartCount } from "./words"

/** What harm is made of: the dodge ignores the physical one. */
export type Nature = "physical"|"elemental"

/** A unit lashing out at an area, whether it touches anyone or not. */
export interface AttackEvent {
    readonly attacker: Unit
    readonly area: Area
}

/** An attack of a unit that touched another. */
export interface HitEvent {
    readonly attacker: Unit
    readonly target: Unit

    /** How many hearts it took, after every protection. */
    readonly amount: number
}

/** Damage about to land, which the listeners may lower: the dodge sets it to none. */
export interface IncomingDamage {
    readonly target: Unit
    readonly source: Unit|null
    readonly nature: Nature

    /** Is it an echo of another wound, which sets off nothing a wound does? */
    readonly derived: boolean

    /** How many hearts will land. */
    amount: number
}

/** A unit losing hearts. */
export interface HurtEvent {
    readonly target: Unit
    readonly source: Unit|null
    readonly nature: Nature

    /** How many hearts it lost. */
    readonly amount: number
}

/** Hearts of a unit healed. */
export interface HealEvent {
    readonly unit: Unit

    /** How many came back. */
    readonly amount: number
}

/** A heart coming into a bar. */
export interface HeartEvent {
    readonly unit: Unit
    readonly heart: Heart

    /** Its place in the bar, once it came. */
    readonly index: number
}

/** Hearts of a kind leaving a bar together. */
export interface HeartLossEvent {
    readonly unit: Unit
    readonly kind: HeartKind

    /** Their places in the bar before they left, the last first. */
    readonly indexes: readonly number[]
}

/** Hearts of a kind leaving others in their place. */
export interface HeartReplaceEvent extends HeartLossEvent {
    /** What took their places, in the order of the places. */
    readonly replacements: readonly Heart[]
}

/** A heart lost: gone, or left as an empty place, as its kind says. */
export interface HeartLostEvent {
    readonly battle: Battle
    readonly unit: Unit
    readonly heart: Heart
    readonly source: Unit|null
}

/** A tree of the chain of a unit about to play: the first and the last of its cards, and those cards. */
export interface ActivationEvent {
    readonly unit: Unit
    readonly first: number
    readonly last: number
    readonly cards: readonly Card[]
}

/** A card of the chain of a unit that was to play and could not be built, an input missing. */
export interface CardInvalidEvent {
    readonly unit: Unit

    /** Its place in the chain. */
    readonly index: number
}

/** The chain of a unit as it is once it changed: a copy of its cards, and where its reading stands. */
export interface ChainChangeEvent {
    readonly unit: Unit
    readonly cards: readonly Card[]
    readonly cursor: number
}

/** A unit changing cell. */
export interface MoveEvent {
    readonly unit: Unit
    readonly from: Vector2
    readonly to: Vector2
}

/** A unit about to be moved by another: the listeners may shorten it. */
export interface IncomingShove {
    readonly target: Unit

    /** Who moves it, none when nobody does. */
    readonly by: Unit|null

    readonly direction: Vector2

    /** How far it will be moved, in meters. */
    distance: number
}

/** A unit dying. */
export interface DeathEvent {
    readonly unit: Unit
    readonly source: Unit|null
}

/**
 * Something that happened in the battle, in the log the screen plays back. The log says what happened,
 * not why: the state after each event is the truth.
 */
export type BattleEvent =
    | { readonly type: "round", readonly round: number }
    | { readonly type: "moved", readonly unit: Unit, readonly from: Vector2, readonly to: Vector2 }
    | { readonly type: "turned", readonly unit: Unit }
    | { readonly type: "blocked", readonly unit: Unit }
    | { readonly type: "struck", readonly unit: Unit|null, readonly area: Area, readonly nature: Nature }
    | { readonly type: "exploded", readonly area: Area }
    | { readonly type: "hurt", readonly unit: Unit, readonly amount: number }
    | { readonly type: "healed", readonly unit: Unit, readonly amount: number }
    | { readonly type: "dodged", readonly unit: Unit }
    | { readonly type: "died", readonly unit: Unit }
    | { readonly type: "spawned", readonly unit: Unit }
    | { readonly type: "status", readonly unit: Unit, readonly text: Text }
    | { readonly type: "skipped", readonly unit: Unit, readonly reason: Text }
    | { readonly type: "over", readonly winner: Team|null }
    | { readonly type: "error", readonly error: unknown }

/**
 * One line telling what happened, none for what the board shows well enough on its own. The units stay
 * units in it, each telling itself.
 */
export function eventText(event: BattleEvent): Text|null {
    switch(event.type){
        case "round": return `Round ${event.round}`
        case "hurt": return [event.unit, " perd ", new HeartCount(event.amount)]
        case "healed": return [event.unit, " récupère ", new HeartCount(event.amount)]
        case "dodged": return [event.unit, " esquive"]
        case "died": return [event.unit, " tombe"]
        case "spawned": return [event.unit, " apparaît"]
        case "status": return concat(event.unit, " : ", event.text)
        case "skipped": return concat(event.unit, " : ", event.reason)
        case "blocked": return [event.unit, " est bloqué"]
        case "exploded": return "Boum !"
        case "over": return event.winner ? [event.winner, " l'emporte"] : "Personne ne reste debout"
        case "error": return `Erreur : ${event.error instanceof Error ? event.error.message : String(event.error)}`
        case "moved":
        case "turned":
        case "struck":
            return null
        default: return null
    }
}
