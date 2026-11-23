import type { Theme } from "../../../../engine/ui"
import type { TextPicture, TextPictures } from "../../../../engine/text"

/**
 * The pictures of the texts of the theme. The theme is made before the sprites are loaded, so it holds this
 * shelf, empty until a game lends it its sprites: a text shown before has no picture, and lays out without.
 */
export class PictureShelf implements TextPictures {


    /** The picture of a key, none while the shelf has no sprites or for a key with none. */
    public of(key: string): TextPicture|null {
        return this.#source?.(key) ?? null
    }

    /** Take the pictures from a source, the sprites of a game. */
    public lend(source: (key: string) => TextPicture|null): void {
        this.#source = source
    }


    #source: ((key: string) => TextPicture|null)|null = null
}

/** Lend the pictures of a game to the texts of a theme, when the theme has a shelf for them. */
export function lendPictures(theme: Theme, source: (key: string) => TextPicture|null): void {
    if(theme.textPictures instanceof PictureShelf) theme.textPictures.lend(source)
}
