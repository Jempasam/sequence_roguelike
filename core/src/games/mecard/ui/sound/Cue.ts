import type { SoundPath } from "../../../../engine/audio"

/** One sound of the game: the file, and how loud it is played to sit with the others. */
export interface Cue {
    /** The file of the sound. */
    readonly path: SoundPath

    /** The factor its volume is multiplied by, since the files are not recorded at the same level. */
    readonly volume: number
}
