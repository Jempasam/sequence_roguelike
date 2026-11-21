import type { SaveFormat } from "../../../../engine/save"
import type { Run } from "../run/Run"

import type { Ghost } from "../fight/FightType"

import { loadedHeroes, savedHero } from "./runSave"
import type { SavedHero } from "./runSave"

/** The version of the shape of a game of the history, raised whenever it changes. */
export const HISTORY_VERSION = 1

/** The key the history is kept under. */
export const HISTORY_SLOT_KEY = "mecard-history"

/** A game that ended, written down: when, how far it went, and the party as it stood at its end. */
export interface HistoryEntry {
    readonly version: number

    /** When the party fell, in milliseconds since 1970. */
    readonly date: number

    readonly seed: number

    /** How deep the party went: the number of floors gone through. */
    readonly depth: number

    /** The name of the floor the party fell on. */
    readonly floor: string

    readonly gold: number

    /** The party, its decks, its hearts, its items and its usables as they were. */
    readonly heroes: readonly SavedHero[]
}

/** The games that ended, the oldest first. */
export interface History {
    readonly entries: readonly HistoryEntry[]
}

/** The game a run just ended on, written down. */
export function historyEntry(run: Run, seed: number, date: number): HistoryEntry {
    return {
        version: HISTORY_VERSION, date, seed,
        depth: run.travel.depth, floor: run.travel.floor.type.name, gold: run.gold,
        heroes: run.heroes.map(savedHero),
    }
}

/** The game of an entry as a ghost the fights may bring back: its party as it fell, made anew for each fight. */
export function ghostOfEntry(entry: HistoryEntry): Ghost {
    return { depth: entry.depth, party: () => loadedHeroes(entry.heroes) }
}

/** How the history is written to the player's storage. */
export const HISTORY_FORMAT: SaveFormat<History> = {
    version: 1,
    migrations: [],
    encode: history => history,
    decode: json => {
        const history = json as Partial<History>|null
        const sound = typeof history === "object" && history !== null && Array.isArray(history.entries)
            && history.entries.every(each => each?.version === HISTORY_VERSION && Array.isArray(each.heroes))
        if(!sound) throw new Error("It is not the history of the games, or one of another version.")
        return history as History
    },
}
