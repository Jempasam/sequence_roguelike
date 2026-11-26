import type { AnyObservable } from "./Forwarded"
import type { Battle } from "../../sim/battle/Battle"
import type { Run } from "../../sim/run/Run"
import type { Travel } from "../../sim/travel/Travel"

/** The observables of a battle, apart from its signals, that screens forward: what happens in its rounds. */
export const BATTLE_FORWARDED = ["roundStarted", "onGetGold", "onGetCards"] as const satisfies readonly (keyof Battle)[]

/**
 * The observables of a battle that are not forwarded: the triggers the simulation reacts to, which its
 * signals tell again for a screen, and what the screen takes up at once.
 */
export const BATTLE_NOT_FORWARDED = [
    "prepEnded", "unitPrepared", "unitDied", "passStarted", "roundEnding", "roundEnded",
    "unitStepping", "unitStepped", "signals", "phaseChanged", "preparationEnding", "loaded",
] as const satisfies readonly (keyof Battle)[]

/** The observables of a travel that screens forward: what the journey and its visits go through. */
export const TRAVEL_FORWARDED = [
    "moved", "floorEntered", "mapDrawn", "visitStarted", "haltImpacted", "visitEnded", "fightEntered", "fightLeft",
] as const satisfies readonly (keyof Travel)[]

/** The observables of a travel that are not forwarded: what the screen takes up at once, the dialogs. */
export const TRAVEL_NOT_FORWARDED = [
    "phaseChanged", "fightReached", "offerAsked", "heroAsked", "cardsAsked", "catalogAsked", "confirmAsked", "told",
    "offerTaken", "heroTaken", "cardsTaken", "catalogTaken", "confirmAccepted", "wentBack", "reacted", "loaded",
] as const satisfies readonly (keyof Travel)[]

/** The observables of a run that screens forward: its battles, its end, and what it gains on the way. */
export const RUN_FORWARDED = [
    "battleStarted", "defeated", "goldChanged", "heroJoined", "heroLeft", "partyHealed", "deckChanged",
    "cardsGained", "boosterOpened", "upgradeApplied", "kitHired", "petTamed", "heartLootGiven", "itemGained",
    "usableGained", "heartGained",
] as const satisfies readonly (keyof Run)[]

/** The observables of a run that are not forwarded: what the screen takes up at once. */
export const RUN_NOT_FORWARDED = ["phaseChanged", "loaded"] as const satisfies readonly (keyof Run)[]

/** What a screen forwards of a battle: every signal, those of its mechanics, and what happens in its rounds. */
export function battleForwardables(battle: Battle): AnyObservable[] {
    return [...battle.signals.all(), ...battle.observers.shown(), ...BATTLE_FORWARDED.map(name => battle[name])]
}

/** What a screen forwards of a travel. */
export function travelForwardables(travel: Travel): AnyObservable[] {
    return TRAVEL_FORWARDED.map(name => travel[name])
}

/** What a screen forwards of a run, apart from its travel and its battles. */
export function runForwardables(run: Run): AnyObservable[] {
    return RUN_FORWARDED.map(name => run[name])
}
