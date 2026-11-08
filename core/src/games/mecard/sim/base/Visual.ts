/** A color, its three channels from 0 to 1. */
export type VisualColor = [number, number, number]

/** What a {@link Visual} is once written down: plain data, for saves and for the network. */
export interface VisualData {
    readonly visual: string
    readonly coloration: VisualColor | null
    readonly letter: string
    readonly description: string
    readonly color: VisualColor
}

/** What {@link Visual.with} changes. */
export type VisualPatch = Partial<VisualData>

/** The look of a picture, by its key: whatever else it says is made from the key. */
export function visual(key: string, patch: VisualPatch = {}): Visual {
    return new Visual({ visual: key, ...patch })
}

/** A visual written down, none for none. */
export function savedVisual(visual: Visual|null | undefined): VisualData|null {
    return visual ? visual.toData() : null
}

/**
 * A visual read back, none for none. An old save wrote the name of a sprite of a unit alone: it is
 * read as the picture of that unit.
 */
export function loadedVisual(saved: VisualData|string|null | undefined): Visual|null {
    if(!saved) return null
    if(typeof saved === "string") return new Visual({ visual: `units/${saved}` })
    return Visual.of(saved)
}

const GREY: VisualColor = [0.6, 0.6, 0.6]

/**
 * How something looks, as the simulation says it: which picture, and what to show in its stead when the
 * screen has none. The screen decides how to draw it, the simulation never sees a file.
 */
export class Visual implements VisualData {

    /**
     * Which picture, such as `statuses/burn`: a name the screen resolves as it wishes, to a file or to
     * nothing. The simulation does not know which exist.
     */
    public readonly visual: string

    /** A tint the picture is multiplied by, channel by channel, none to draw it as it is. */
    public readonly coloration: VisualColor | null

    /** Two letters to write where the picture is not available. */
    public readonly letter: string

    /** A short name of what the picture shows, for who does not see it. */
    public readonly description: string

    /** The color to draw with where the picture is not available. */
    public readonly color: VisualColor

    constructor(init: Partial<VisualData> & Pick<VisualData, "visual">){
        const name = init.visual.slice(init.visual.lastIndexOf("/") + 1)
        this.visual = init.visual
        this.coloration = init.coloration ?? null
        this.letter = init.letter ?? (name.charAt(0).toUpperCase() + name.charAt(1).toLowerCase())
        this.description = init.description ?? name.replace(/_/g, " ")
        this.color = init.color ?? GREY
    }

    /** The same, but for what the patch changes. */
    public with(patch: VisualPatch): Visual {
        return new Visual({
            ...this.toData(),
            ...patch,
        })
    }

    public toData(): VisualData {
        return {
            visual: this.visual,
            coloration: this.coloration,
            letter: this.letter,
            description: this.description,
            color: this.color,
        }
    }

    public static of(data: VisualData): Visual {
        return new Visual(data)
    }
}
