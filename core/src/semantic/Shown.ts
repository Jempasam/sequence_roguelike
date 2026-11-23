import type { Text, TextColor } from "./Text"

/**
 * A picture a reader puts in the text it shows: what a {@link TextDisplay} answers for an object, never what
 * a game writes. It stays a free key, which the reader that lays the text out turns into a picture, or into
 * nothing when it has none.
 */
export interface Picture {
    /** What it shows, a key only the reader knows. */
    readonly picture: string

    /** What it stands for in a plain string, none to leave nothing there. */
    readonly alt?: string
}

/** A part of what a reader shows, in a color of its own. */
export interface ShownColor {
    readonly color: TextColor
    readonly text: Shown
}

/** A part of what a reader shows, standing for something its reader may point at. */
export interface ShownLink {
    readonly link: object
    readonly text: Shown
}

/**
 * What a reader shows of an object: a {@link Text}, with pictures too, which may lie in its colored and
 * linked parts. The texts a game writes are only {@link Text}s, so a game cannot put a picture in one.
 */
export type Shown = Text|Picture|ShownColor|ShownLink|readonly Shown[]

export function isPicture(shown: object): shown is Picture {
    return typeof (shown as Partial<Picture>).picture === "string"
}
