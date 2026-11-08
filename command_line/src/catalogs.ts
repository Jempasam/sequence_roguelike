import { plainText } from "@game/core"
import type { Text } from "@game/core"
import {
    ALL_BOOSTERS, ALL_CARDS, ALL_ITEMS, ALL_KITS, ALL_MONSTERS, ALL_PETS, ALL_USABLES,
} from "@game/core/mecard"
import { mecardDisplay } from "@game/core/mecard/text-display"

/** One entry of a catalog, as the command line shows it. */
export interface CatalogEntry {
    readonly name: string

    /** What follows `Nom: ` with `--desc`, on one line. */
    readonly description: string
}

/** A catalog the command line can list. */
export interface Catalog {
    readonly name: string
    readonly entries: () => readonly CatalogEntry[]
}

/** A text as one line: groups on a single line, spaces collapsed. */
function oneLine(text: Text): string {
    return plainText(text, mecardDisplay).replace(/\s*\n\s*/g, " ").trim()
}

/** Names between brackets, `[Pas, Pas]`. */
function names(values: readonly { readonly name: string }[]): string {
    return `[${values.map(value => value.name).join(", ")}]`
}

interface Described {
    readonly name: string
    readonly description: Text
}

interface Unit {
    readonly name: string
    readonly hearts: number
    readonly draw: number
    readonly size?: number
    readonly cards: readonly { readonly name: string }[]
}

function described(values: readonly Described[]): readonly CatalogEntry[] {
    return values.map(value => ({ name: value.name, description: oneLine(value.description) }))
}

function units(values: readonly Unit[]): readonly CatalogEntry[] {
    return values.map(value => ({
        name: value.name,
        description: [
            `PV ${value.hearts}`,
            `pioche ${value.draw}`,
            ...value.size === undefined ? [] : [`taille ${value.size}`],
            `cartes ${names(value.cards)}`,
        ].join(", "),
    }))
}

/** Every catalog, in the order `list all` shows them. */
export const CATALOGS: readonly Catalog[] = [
    { name: "cards", entries: () => described(ALL_CARDS) },
    { name: "kits", entries: () => ALL_KITS.map(kit => ({
        name: kit.name,
        description: `cartes ${names(kit.cards)}, objets ${names(kit.items)}, usables ${names(kit.usables)}`,
    })) },
    { name: "monsters", entries: () => units(ALL_MONSTERS) },
    { name: "pets", entries: () => units(ALL_PETS) },
    { name: "items", entries: () => described(ALL_ITEMS) },
    { name: "usables", entries: () => described(ALL_USABLES) },
    { name: "boosters", entries: () => ALL_BOOSTERS.map(booster => ({
        name: booster.name,
        description: booster.pools.map(pool => `${pool.count} parmi ${names(pool.pool)}`).join(", "),
    })) },
]
