/** How a picture is drawn over the hitbox of its unit: the modes the file of data of a picture may name. */
export const SPRITE_MODES = ["feet", "center", "cover", "wall", "repeat", "tile", "spin", "capped"] as const

/** One of the ways to draw a picture over a hitbox, see {@link SPRITE_MODES}. */
export type SpriteMode = typeof SPRITE_MODES[number]

/** What each mode does, as the bench shows it. */
export const SPRITE_MODE_HELP: Readonly<Record<SpriteMode, string>> = {
    feet: "le bas du sprite sur la position, large comme le cercle qui contient la hitbox",
    center: "le sprite centré sur la position, large comme le cercle qui contient la hitbox",
    cover: "tourné et étiré sur la boîte englobante",
    wall: "3 parties : le tiers haut est le dessus, sur la boîte ; en dessous, 2/3 gauche la face longue, 1/3 droit la face courte",
    repeat: "répété sur la longueur de la boîte, large comme elle",
    tile: "répété dans les deux sens pour remplir la boîte",
    spin: "centré, tourné dans le sens où l'unité regarde",
    capped: "un bout, un milieu répété et un bout, sur la longueur de la boîte",
}

/** How the picture of a unit is drawn: written beside it, in the JSON file of its name. */
export interface SpriteLook {
    /** Which way to draw it, none to draw it as its hitbox says: standing for a disc, covering for a box. */
    readonly mode: SpriteMode|null

    /** How far over the ground it floats, in meters: its shade stays where the unit is. */
    readonly lift: number
}

/** The look of a picture with no file of data. */
export const DEFAULT_LOOK: SpriteLook = { mode: null, lift: 0 }

/** The keys of the JSON file of a picture that mean something. */
const KEYS: readonly string[] = ["mode", "lift"]

/**
 * What the file of data of a picture says, checked.
 *
 * @param data - What the file holds, none when the picture has no file.
 * @throws {@link Error} Saying what is wrong, where, and what to write instead.
 */
export function readSpriteLook(data: unknown): SpriteLook {
    if(data === null || data === undefined) return DEFAULT_LOOK
    if(typeof data !== "object" || Array.isArray(data)){
        throw new Error(`le fichier doit contenir un objet, par exemple { "mode": "feet" }`)
    }
    const fields = data as Record<string, unknown>
    for(const key of Object.keys(fields)){
        if(!KEYS.includes(key)) throw new Error(`"${key}" n'est pas connu : écris ${KEYS.map(each => `"${each}"`).join(" ou ")}`)
    }
    const { mode, lift } = fields
    if(mode !== undefined && !SPRITE_MODES.includes(mode as SpriteMode)){
        throw new Error(`"mode" vaut ${JSON.stringify(mode)} : écris l'un de ${SPRITE_MODES.join(", ")}`)
    }
    if(lift !== undefined && (typeof lift !== "number" || !Number.isFinite(lift))){
        throw new Error(`"lift" vaut ${JSON.stringify(lift)} : écris un nombre de mètres`)
    }
    return { mode: (mode as SpriteMode|undefined) ?? null, lift: (lift as number|undefined) ?? 0 }
}

/** A look written as the JSON that gives it back, nothing for what is by default. */
export function writtenSpriteLook(look: SpriteLook): string {
    const fields: Record<string, unknown> = {}
    if(look.mode !== null) fields.mode = look.mode
    if(look.lift !== 0) fields.lift = look.lift
    return JSON.stringify(fields)
}
