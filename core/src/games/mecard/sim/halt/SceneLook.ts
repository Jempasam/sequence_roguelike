import type { LayeredImagePath } from "../../../../engine/assets"
import { rgba } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"
import { visual } from "../base/Visual"
import type { Visual, VisualPatch } from "../base/Visual"

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

    /**
     * The sprite of a unit it is drawn from instead of its painting, cut in three and bent as a whole, none
     * to be drawn from its painting.
     */
    readonly unit: Visual|null

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
    /**
     * The parallax behind the panels: the screen resolves its key to its layers, its coloration tints them
     * all, and its color stands in where it has none.
     */
    readonly parallax: Visual

    /** The thin frame over the whole interface, a picture cut in three by three equal parts. */
    readonly border: Visual

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

/** The painting every character of the halts is drawn from, for now. */
const PNJ_PAINTING: LayeredImagePath = "mecard/pnj/merchant.ora"

/**
 * A look from the color of its panels, as bytes, and the name of its scene: the parallax `<id>`
 * and the frame `border/<id>`, the parallax changed by the patch given, its color that of the panels.
 */
export function sceneLook(
    red: number, green: number, blue: number, id: string, parallax: VisualPatch = {},
): SceneLook {
    const color = rgba(red / 255, green / 255, blue / 255)
    return {
        parallax: visual(id, {
            color: [color.r, color.g, color.b],
            ...parallax,
        }),
        border: visual(`border/${id}`),
        color,
    }
}

/** The look of a floor: a scene look whose frame is the one drawn for the floor, `floors/<id>/border`. */
export function floorLook(red: number, green: number, blue: number, id: string): SceneLook {
    return { ...sceneLook(red, green, blue, id), border: visual(`floors/${id}/border`) }
}

/**
 * A character from what it says, the rest being filled: the common painting, nothing worn, and the default
 * move at each moment it does not play otherwise.
 */
export function scenePnj(pnj: Partial<ScenePnj>): ScenePnj {
    return {
        painting: PNJ_PAINTING,
        unit: null,
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
