import { Sprite } from "../gpu"

/** One character of a bitmap font. */
export interface Glyph {
    /** The image of the character, none for a blank one such as a space. */
    readonly sprite: Sprite|null

    /** How far the pen moves after the character, in pixels of the font. */
    readonly advance: number

    /** Where the top left corner of the image lies, in pixels from the pen at the top of the line. */
    readonly offsetX: number
    readonly offsetY: number
}

/** How a bitmap font is described. */
export interface BitmapFontOptions {
    /** The glyph of each character, keyed by the character, one code point each. */
    readonly glyphs: ReadonlyMap<string, Glyph>

    /** The glyph drawn for a character the font lacks, so a missing one shows instead of vanishing. */
    readonly fallback: Glyph

    /** The distance between two lines, in pixels of the font. */
    readonly lineHeight: number

    /** Where the characters sit, in pixels from the top of the line. */
    readonly baseline: number
}

/** How a font is cut out of a grid of cells of the same size. */
export interface GridFontOptions {
    /** The characters of the cells, row after row, one code point per cell. */
    readonly characters: string

    /** The size of a cell, in texels. */
    readonly cellWidth: number
    readonly cellHeight: number

    /** How many cells a row holds, as many as fit in the sheet by default. */
    readonly columns?: number

    /** How far the pen moves after a character, the width of a cell by default. */
    readonly advance?: number

    /** Where the characters sit, in pixels from the top of the cell, the bottom of the cell by default. */
    readonly baseline?: number

    /** The distance between two lines, the height of a cell by default. */
    readonly lineHeight?: number

    /** The character of the cell drawn for the characters missing, which the characters must hold. */
    readonly fallback: string
}

/**
 * A font made of sprites, one per character, at a single native size: a larger text is the same font
 * scaled by a whole factor.
 *
 * @remarks
 * The glyphs are sprites of an atlas, ideally the one of the whole interface, so a text and the frame
 * around it draw in one batch. A character the font lacks is drawn with a fallback glyph, visible, rather
 * than skipped: a missing letter shows at once on screen.
 */
export class BitmapFont {


    /** The distance between two lines, in pixels of the font. */
    public readonly lineHeight: number

    /** Where the characters sit, in pixels from the top of the line. */
    public readonly baseline: number

    /** The glyph drawn for a character the font lacks. */
    public readonly fallback: Glyph

    /**
     * @throws {@link Error} When the line height is not a positive integer, or a glyph lies at a fractional
     * position.
     */
    constructor(options: BitmapFontOptions){
        if(!Number.isInteger(options.lineHeight) || options.lineHeight <= 0){
            throw new Error(`The line height of a font is a positive whole number of pixels, not ${options.lineHeight}.`)
        }
        for(const [character, glyph] of [...options.glyphs, ["fallback", options.fallback] as const]){
            const isWhole = [glyph.advance, glyph.offsetX, glyph.offsetY].every(Number.isInteger)
            if(!isWhole) throw new Error(`The glyph of "${character}" is placed at a fraction of a pixel.`)
        }
        this.#glyphs = options.glyphs
        this.fallback = options.fallback
        this.lineHeight = options.lineHeight
        this.baseline = options.baseline
    }

    /**
     * A font cut out of a sheet of cells of the same size, read row after row: the simplest format, enough
     * for a monospaced debug font.
     *
     * @param sheet - The region holding the cells, its top left cell first.
     * @throws {@link Error} When the cells do not fit in the sheet, or the fallback is not among the
     * characters.
     */
    public static grid(sheet: Sprite, options: GridFontOptions): BitmapFont {
        const { cellWidth, cellHeight } = options
        const columns = options.columns ?? Math.floor(sheet.width / cellWidth)
        const characters = [...options.characters]
        const rows = Math.ceil(characters.length / columns)
        if(columns <= 0 || columns * cellWidth > sheet.width || rows * cellHeight > sheet.height){
            throw new Error(`${characters.length} cells of ${cellWidth}×${cellHeight} in ${columns} columns`
                + ` do not fit in a sheet of ${sheet.width}×${sheet.height}.`)
        }
        const advance = options.advance ?? cellWidth
        const glyphs = new Map<string, Glyph>()
        characters.forEach((character, index) => {
            const x = sheet.x + index % columns * cellWidth
            const y = sheet.y + Math.floor(index / columns) * cellHeight
            const sprite = new Sprite(sheet.texture, x, y, cellWidth, cellHeight)
            glyphs.set(character, { sprite, advance, offsetX: 0, offsetY: 0 })
        })
        const fallback = glyphs.get(options.fallback)
        if(!fallback) throw new Error(`The fallback "${options.fallback}" is not among the characters of the grid.`)
        // A space keeps its advance but draws nothing, whatever its cell holds.
        if(glyphs.has(" ")) glyphs.set(" ", { sprite: null, advance, offsetX: 0, offsetY: 0 })
        return new BitmapFont({
            glyphs, fallback,
            lineHeight: options.lineHeight ?? cellHeight,
            baseline: options.baseline ?? cellHeight,
        })
    }


    /** Does the font have a glyph of its own for a character? */
    public has(character: string): boolean {
        return this.#glyphs.has(character)
    }

    /** The glyph of a character, the fallback when the font lacks it. */
    public glyphOf(character: string): Glyph {
        return this.#glyphs.get(character) ?? this.fallback
    }


    readonly #glyphs: ReadonlyMap<string, Glyph>
}
