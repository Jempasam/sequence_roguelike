/** How a picture repeats along a length. */
export interface Tiling {
    /**
     * Are the tiles stretched so a whole number of them fits, the nearest to what the length asks? Else they
     * keep their length and the last is cropped. True by default.
     */
    readonly stretch?: boolean

    /** Is every other tile flipped along the length, so a tile ends as the next starts? False by default. */
    readonly mirror?: boolean
}

/**
 * The tiles covering a length, one read at a time, so walking them allocates nothing: {@link TileRun.select}
 * writes where a tile lies and the texels it shows.
 *
 * @remarks
 * Vertices hold whole texels, so a tile cropped ends on the nearest texel, at least one, and what it shows
 * is that much squeezed or stretched.
 */
export class TileRun {


    /** How many tiles cover the length. */
    public get count(): number { return this.#count }

    /** Where the tile selected starts and ends along the length, in pixels. */
    public start = 0
    public end = 0

    /** The texels the tile selected shows, from its start to its end: backwards when it is flipped. */
    public from = 0
    public to = 0

    /**
     * Cover a length with tiles.
     *
     * @param length - The length covered, in pixels.
     * @param tile - How long a tile is before stretching, in pixels, more than 0.
     * @param from - The texel a tile starts from.
     * @param to - The texel a tile ends at.
     */
    public lay(length: number, tile: number, from: number, to: number, tiling: Tiling): void {
        const stretch = tiling.stretch ?? true
        const count = stretch ? Math.round(length / tile) : Math.ceil(length / tile)
        this.#count = Math.max(1, count)
        this.#length = length
        this.#step = stretch ? length / this.#count : tile
        this.#first = from
        this.#last = to
        this.#mirror = tiling.mirror ?? false
    }

    /** Cover a length with one tile stretched over it. */
    public layWhole(length: number, from: number, to: number): void {
        this.#count = 1
        this.#length = length
        this.#step = length
        this.#first = from
        this.#last = to
        this.#mirror = false
    }

    /** Select a tile, by its place from the start of the length. */
    public select(index: number): void {
        const start = index * this.#step
        const end = index === this.#count - 1 ? this.#length : start + this.#step
        const whole = this.#last - this.#first
        const share = (end - start) / this.#step
        const texels = share >= 1 ? whole : Math.max(1, Math.round(whole * share))
        const flipped = this.#mirror && index % 2 === 1
        this.start = start
        this.end = end
        this.from = flipped ? this.#last : this.#first
        this.to = flipped ? this.#last - texels : this.#first + texels
    }


    #count = 0
    #length = 0

    /** How far apart two tiles start, in pixels. */
    #step = 0

    /** The texels a whole tile shows. */
    #first = 0
    #last = 0

    #mirror = false
}
