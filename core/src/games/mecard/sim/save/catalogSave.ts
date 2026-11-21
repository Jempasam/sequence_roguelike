import type { SaveFormat } from "../../../../engine/save"

/** The key the catalogue of the player is kept under. */
export const CATALOG_SLOT_KEY = "mecard-catalog"

/** What the catalogue of the player counts, each a category of the catalogue of the game. */
export const CATALOG_CATEGORIES = [
    "cards", "boosters", "upgrades", "kits", "monsters", "pets", "fights", "hazards", "halts", "floors",
    "effects", "hearts", "tempHearts", "keptHearts", "items", "usables",
] as const

/** A category of the catalogue of the player. */
export type CatalogCategory = typeof CATALOG_CATEGORIES[number]

/** What the player found, by category: the name of each entry found, in order. */
export type CatalogSave = Readonly<Record<CatalogCategory, readonly string[]>>

/** How the catalogue of the player is written to the player's storage. */
export const CATALOG_FORMAT: SaveFormat<CatalogSave> = {
    version: 1,
    migrations: [],
    encode: found => found,
    decode: json => {
        const raw = json as Partial<Record<string, unknown>>|null
        if(typeof raw !== "object" || raw === null) throw new Error("It is not the catalogue of the player.")
        // A missing category is empty, a name that is not text is dropped.
        const save = {} as Record<CatalogCategory, string[]>
        for(const category of CATALOG_CATEGORIES){
            const names = raw[category]
            save[category] = Array.isArray(names) ? names.filter((name): name is string => typeof name === "string") : []
        }
        return save
    },
}
