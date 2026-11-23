import type { Sprite } from "../gpu"

/** A picture lying in a text, as the reader that lays the text out knows it. */
export interface TextPicture {
    /** What is drawn, as many pixels wide and tall as it is. */
    readonly sprite: Sprite

    /**
     * Is it drawn in the color of the text around it, by a multiply, which a white picture takes whole?
     * Otherwise it is drawn as it is.
     */
    readonly tinted: boolean
}

/** The pictures a text may hold, by the key it names them with. */
export interface TextPictures {
    /** The picture of a key, none for a key with none, or while its pictures are not loaded. */
    of(key: string): TextPicture|null
}
