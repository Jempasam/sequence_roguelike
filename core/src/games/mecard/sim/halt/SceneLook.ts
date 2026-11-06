import type { ImagePath, LayeredImagePath } from "../../../../engine/assets"
import { rgba } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"

import type { PnjHatName, PnjItemName, PnjMaskName } from "./PnjHats"

/**
 * A moment of a visit the character of a halt reacts to: the party arriving, a choice taken, what came of
 * the visit, a refusal or a step back.
 */
export type HaltMoment = "arrive"|"pick"|"done"|"refuse"

/** A move a character may play, by its name: the interface knows what each one moves. */
export type PnjCue = "pomp"|"strike"|"fear"|"yes"|"no"|"surprise"|"laugh"|"spin"

/** The character of a scene: its painting, what it wears, and what it plays at the moments of a visit. */
export interface ScenePnj {
    readonly painting: LayeredImagePath

    /** Its hat, none bare-headed. */
    readonly hat: PnjHatName|null

    /** The color of its clothes, none to keep those painted. */
    readonly clothes: Rgba|null

    /** The color of its hat, none to keep the one painted. */
    readonly hatColor: Rgba|null

    /** The mask on its face, none unmasked. */
    readonly mask: PnjMaskName|null

    /** The color of its mask, none to keep the one painted. */
    readonly maskColor: Rgba|null

    /** The object in its hands, none empty-handed. */
    readonly item: PnjItemName|null

    /** The color of its object, none to keep the one painted. */
    readonly itemColor: Rgba|null

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
    readonly pnj?: ScenePnj
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

/** How many layers a parallax has, unless its place says otherwise. */
export const LAYER_COUNT = 5

/**
 * A look from the color of its panels, as bytes, and the folder of its pictures: the layers `1.png` up to
 * the count given, the farthest first, and `border.png`.
 */
export function sceneLook(
    red: number, green: number, blue: number, folder: string, layerCount = LAYER_COUNT,
    borderScale = BORDER_SCALE,
): SceneLook {
    const layers = Array.from({ length: layerCount }, (_, index) => `${folder}/${index + 1}.png` as ImagePath)
    return {
        layers, border: `${folder}/border.png` as ImagePath, borderScale,
        color: rgba(red / 255, green / 255, blue / 255),
    }
}

/**
 * A character from what it says, the rest being filled: the common painting, nothing worn, and the default
 * move at each moment it does not play otherwise.
 */
export function scenePnj(pnj: Partial<ScenePnj>): ScenePnj {
    return {
        painting: PNJ_PAINTING,
        hat: null,
        clothes: null,
        hatColor: null,
        mask: null,
        maskColor: null,
        item: null,
        itemColor: null,
        ...pnj,
        cues: { ...DEFAULT_CUES, ...pnj.cues },
    }
}
