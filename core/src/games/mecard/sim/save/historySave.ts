import type { SaveFormat } from "../../../../engine/save"
import type { Run } from "../run/Run"

import type { Ghost } from "../fight/FightType"

import type { Travel } from "../travel/Travel"

import { loadedHeroes, savedHero } from "./runSave"
import type { SavedHero } from "./runSave"

/** The version of the shape of a game of the history, raised whenever it changes. */
export const HISTORY_VERSION = 2

/** One row of the map of a floor, as the way the party took across it is told. */
export interface SavedRouteLayer {
    /** What the place of the row, the one the party stood on or else the first, holds. */
    readonly kind: "fight"|"halt"

    /** Did the party stand on a place of this row? */
    readonly taken: boolean

    /** The id of the fight of the place the party stood on, none for a row not crossed or a halt alone. */
    readonly fight?: string

    /** The id of the halt of the place the party stood on, none for a row not crossed or a fight alone. */
    readonly halt?: string
}

/** The way the party took across the map of the floor it fell on, a row at a time. */
export interface SavedRoute {
    /** The rows of the map, from the first. */
    readonly layers: readonly SavedRouteLayer[]

    /** The row the party fell on, from 0. */
    readonly fallAt: number
}

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

    /** Which floor of the game it was, from 1: none for a game written before it was told. */
    readonly floorNumber?: number

    /** The name of the fight lost: none for a game written before it was told. */
    readonly fight?: string

    /** The way taken across the map of the floor: none for a game written before it was told. */
    readonly route?: SavedRoute

    /** The version of the game that wrote it: none for a game written before it was told. */
    readonly gameVersion?: string
}

/** The games that ended, the oldest first. */
export interface History {
    readonly entries: readonly HistoryEntry[]
}

/** The game a run just ended on, written down. */
export function historyEntry(run: Run, seed: number, date: number, gameVersion?: string): HistoryEntry {
    const { travel } = run
    return {
        version: HISTORY_VERSION, date, seed,
        depth: travel.depth, floor: travel.floor.type.name, gold: run.gold,
        heroes: run.heroes.map(savedHero),
        ...travel.floorNumber === null ? {} : { floorNumber: travel.floorNumber, route: savedRoute(travel) },
        ...run.lastFight ? { fight: run.lastFight.type.name } : {},
        ...gameVersion ? { gameVersion } : {},
    }
}

/** The way a journey took across its map: each row, and the row the party stands on. */
export function savedRoute(travel: Travel): SavedRoute {
    const rows = travel.journey.layers
        .map(places => places.filter(place => !place.exitTo))
        .filter(places => places.length > 0)
    const layers = rows.map((places): SavedRouteLayer => {
        const visited = places.find(place => travel.trail.includes(place))
        if(!visited) return { kind: places[0].fight ? "fight" : "halt", taken: false }
        return {
            kind: visited.fight ? "fight" : "halt", taken: true,
            ...visited.fight ? { fight: visited.fight.id } : {},
            ...visited.halt ? { halt: visited.halt.id } : {},
        }
    })
    const standing = travel.place
    const fallAt = standing ? Math.max(0, rows.findIndex(places => places.includes(standing))) : 0
    return { layers, fallAt }
}

/** The game of an entry as a ghost the fights may bring back: its party as it fell, made anew each fight. */
export function ghostOfEntry(entry: HistoryEntry): Ghost {
    return { depth: entry.depth, party: () => loadedHeroes(entry.heroes) }
}

/** How the history is written to the player's storage. */
export const HISTORY_FORMAT: SaveFormat<History> = {
    version: 2,
    migrations: [
        /** The games of the first version keep what they told, and none of what came after. */
        json => {
            const history = json as { entries?: readonly { version?: number }[] }
            if(!Array.isArray(history?.entries)) throw new Error("It is not the history of the games.")
            return { ...history, entries: history.entries.map(entry => ({ ...entry, version: 2 })) }
        },
    ],
    encode: history => history,
    decode: json => {
        const history = json as Partial<History>|null
        const sound = typeof history === "object" && history !== null && Array.isArray(history.entries)
            && history.entries.every(each => each?.version === HISTORY_VERSION && Array.isArray(each.heroes))
        if(!sound) throw new Error("It is not the history of the games, or one of another version.")
        return { entries: (history as History).entries.map(checkedEntry) }
    },
}

/** Is a value a whole number from a floor up? */
function isCount(value: unknown, floor: number): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= floor
}

/** Is a value a route the screen may draw: rows of known kinds, and a row fallen on that is one of them? */
function isRoute(value: unknown): value is SavedRoute {
    const route = value as Partial<SavedRoute>|null
    if(typeof route !== "object" || route === null) return false
    const { layers, fallAt } = route
    return Array.isArray(layers) && layers.length > 0 && isCount(fallAt, 0) && fallAt < layers.length
        && layers.every(layer => (layer?.kind === "fight" || layer?.kind === "halt") && typeof layer.taken === "boolean")
}

/** An entry without the details it holds that are not sound: it is shown without them, not refused. */
function checkedEntry(entry: HistoryEntry): HistoryEntry {
    const { floorNumber, fight, route, gameVersion, ...kept } = entry
    return {
        ...kept,
        ...isCount(floorNumber, 1) ? { floorNumber } : {},
        ...typeof fight === "string" ? { fight } : {},
        ...isRoute(route) ? { route } : {},
        ...typeof gameVersion === "string" ? { gameVersion } : {},
    }
}
