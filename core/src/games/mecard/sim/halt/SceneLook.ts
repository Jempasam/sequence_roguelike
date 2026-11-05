import type { ImagePath, LayeredImagePath } from "../../../../engine/assets"
import { rgba } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"

import type { PnjHatName } from "./PnjHats"

/**
 * A moment of a visit the character of a halt reacts to: the party arriving, a choice taken, what came of
 * the visit, a refusal or a step back.
 */
export type HaltMoment = "arrive"|"pick"|"done"|"refuse"

/** A move a character may play, by its name: the interface knows what each one moves. */
export type PnjCue = "pomp"|"strike"|"fear"|"yes"|"no"|"surprise"|"laugh"|"spin"

/** The character of a halt: its painting, what it wears, and what it plays at the moments of a visit. */
export interface HaltPnj {
    readonly painting: LayeredImagePath

    /** Its hat, none bare-headed. */
    readonly hat: PnjHatName|null

    /** The color of its clothes, none to keep those painted. */
    readonly clothes: Rgba|null

    /** The color of its hat, none to keep the one painted. */
    readonly hatColor: Rgba|null

    /** The move it plays at each moment, nothing at one it does not say. */
    readonly cues: Readonly<Partial<Record<HaltMoment, PnjCue>>>
}

/** How the journey looks at a place: the pictures behind the panels, the frame over them, their color. */
export interface SceneLook {
    /** The layers of its parallax, the farthest first. */
    readonly layers: readonly ImagePath[]

    /** The thin frame over the whole interface, cut in three by three equal parts. */
    readonly border: ImagePath

    /** How many virtual pixels a pixel of its frame takes, a whole number: how thick the frame is drawn. */
    readonly borderScale: number

    /** The color of its panels, opaque: they let it show through on their own. */
    readonly color: Rgba

    /** The character standing before its parallax, behind the panels, none where nobody stands. */
    readonly pnj?: HaltPnj
}

/** What the characters play at the moments of a visit, unless their halt says otherwise. */
export const DEFAULT_CUES: Readonly<Record<HaltMoment, PnjCue>> = {
    arrive: "pomp",
    pick: "yes",
    done: "laugh",
    refuse: "no",
}

/** How many virtual pixels a pixel of a frame takes, unless its place says otherwise. */
export const BORDER_SCALE = 2

/** The painting every character of the halts is drawn from, for now. */
const PNJ_PAINTING: LayeredImagePath = "mecard/pnj/merchant.ora"

/**
 * A look from the color of its panels, as bytes, its pictures, its character, and how thick its frame is
 * drawn.
 */
export function sceneLook(
    red: number, green: number, blue: number, layers: readonly ImagePath[], border: ImagePath,
    pnj?: HaltPnj, borderScale = BORDER_SCALE,
): SceneLook {
    const color = rgba(red / 255, green / 255, blue / 255)
    return pnj ? { layers, border, borderScale, color, pnj } : { layers, border, borderScale, color }
}

/** A color as its channels, none for none. */
type Rgb = readonly [number, number, number]|null

/**
 * A character of a halt from its hat, the color of its clothes and that of its hat, and what it plays apart
 * from the default.
 */
export function haltPnj(
    hat: PnjHatName, clothes: Rgb, hatColor: Rgb, cues: Partial<Record<HaltMoment, PnjCue>> = {},
): HaltPnj {
    return {
        painting: PNJ_PAINTING,
        hat,
        clothes: clothes ? rgba(...clothes) : null,
        hatColor: hatColor ? rgba(...hatColor) : null,
        cues: { ...DEFAULT_CUES, ...cues },
    }
}
