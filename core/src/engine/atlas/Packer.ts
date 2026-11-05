/** How a packer lays its rectangles out. Two packers with the same options and operations agree. */
export interface PackerOptions {
    /** The largest side of a page, in texels. */
    readonly maxSize: number

    /** The empty texels between two rectangles. */
    readonly padding: number

    /** The side of a page when it opens, in texels, up to `maxSize`. */
    readonly initialSize: number
}

/** The size a rectangle takes in a page, padding excluded, in texels. */
export interface PackerSize {
    readonly width: number
    readonly height: number
}

/** A page of a packer: the size its texture has to be. */
export interface PackerPage {
    /** The width, in texels. */
    readonly width: number

    /** The height, in texels. */
    readonly height: number
}

/** A rectangle placed in a page, padding excluded, in texels. */
export interface PackedRect {
    /** The page it lies in. */
    readonly page: PackerPage

    /** The left edge, in texels. */
    readonly x: number

    /** The top edge, in texels. */
    readonly y: number

    /** The width, in texels. */
    readonly width: number

    /** The height, in texels. */
    readonly height: number
}

/**
 * Where rectangles go in pages of texture, computed without the GPU: MaxRects, Best Short Side Fit, no
 * rotation.
 *
 * @remarks
 * The layout depends only on the sequence of {@link Packer.place} and {@link Packer.remove}, on the sizes
 * they carry and on the options, so two packers given the same sequence lay out the same pages. Every tie
 * is broken by the position, never by the inner order of the free rectangles.
 *
 * A rectangle takes `width + padding` × `height + padding`, and a page of side `s` is seen as `s + padding`,
 * so the margin of the last column or row costs nothing.
 *
 * A page is chosen in this order: the first open page holding the rectangle as it is, then the first page
 * that can grow to hold it, then a new page. Taking free room before growing keeps the memory low. A page
 * grows by doubling its shortest side, the width at equality, up to `maxSize`.
 */
export class Packer {


    /** The options it lays out with. */
    public readonly options: PackerOptions

    /**
     * @throws {@link Error} When a side is not a whole number of at least 1, or the padding is negative.
     */
    constructor(options: PackerOptions){
        const { maxSize, padding, initialSize } = options
        const areSidesValid = [maxSize, initialSize].every(side => Number.isInteger(side) && side >= 1)
        if(!areSidesValid || !Number.isInteger(padding) || padding < 0){
            throw new Error(`The packer options ${JSON.stringify(options)} are not possible: the sides are`
                + " whole numbers of at least 1, and the padding a whole number of at least 0.")
        }
        this.options = { maxSize, padding, initialSize: Math.min(initialSize, maxSize) }
    }


    /** The open pages, in the order they opened. */
    public get pages(): readonly PackerPage[] { return this.#pages }

    /**
     * Place a batch of rectangles, and open or grow pages for them.
     *
     * The rectangles are placed longest side first, then largest area first, then in the order of the
     * batch, which is what makes MaxRects dense. Nothing is placed when one of them cannot be.
     *
     * @returns The rectangles, in the order of the sizes.
     * @throws {@link Error} When a size is not whole texels, or larger than a page can be.
     */
    public place(sizes: readonly PackerSize[]): PackedRect[] {
        sizes.forEach((size, index) => this.#check(size, index, sizes.length))
        const order = sizes.map((_, index) => index)
            .sort((a, b) => Packer.#compareForPlacing(sizes[a], sizes[b]) || a - b)
        const placed = new Array<Slot>(sizes.length)
        for(const index of order) placed[index] = this.#placeOne(sizes[index])
        for(const slot of placed) this.#slots.add(slot)
        return placed
    }

    /**
     * Free the zone of a rectangle, padding included, and close its page when it empties. The free
     * rectangles of the page are computed again from what remains, the only way to find maximal ones.
     *
     * @throws {@link Error} When the rectangle is not placed in this packer, or was already removed.
     */
    public remove(rect: PackedRect): void {
        const page = this.#pages.find(candidate => candidate.slots.some(slot => slot === rect))
        const index = page?.slots.findIndex(slot => slot === rect) ?? -1
        if(!page || index < 0){
            throw new Error("The rectangle is not placed in this packer: it was removed, or placed by another.")
        }
        this.#slots.delete(page.slots[index])
        page.slots.splice(index, 1)
        if(page.slots.length === 0) this.#pages.splice(this.#pages.indexOf(page), 1)
        else page.free = this.#freeOf(page.slots, page.width, page.height)
    }

    /** Do both packers have pages of the same sizes, and the same rectangles, one by one in their order? */
    public sameLayoutAs(other: Packer): boolean {
        const pagesMatch = this.#pages.length === other.#pages.length && this.#pages.every((page, index) => {
            return page.width === other.#pages[index].width && page.height === other.#pages[index].height
        })
        if(!pagesMatch || this.#slots.size !== other.#slots.size) return false
        const theirs = [...other.#slots]
        return [...this.#slots].every((slot, index) => {
            const their = theirs[index]
            const samePage = this.#pages.indexOf(slot.page) === other.#pages.indexOf(their.page)
            return samePage && slot.x === their.x && slot.y === their.y
                && slot.width === their.width && slot.height === their.height
        })
    }


    /** Sort longest side first, then largest area first. */
    static #compareForPlacing(a: PackerSize, b: PackerSize): number {
        const longest = Math.max(b.width, b.height) - Math.max(a.width, a.height)
        return longest || b.width * b.height - a.width * a.height
    }


    readonly #pages: Page[] = []

    /** The placed rectangles, in the order they were placed, batches in the order of their sizes. */
    readonly #slots = new Set<Slot>()

    #check(size: PackerSize, index: number, count: number): void {
        const { width, height } = size
        const { maxSize } = this.options
        const isWhole = Number.isInteger(width) && Number.isInteger(height) && width >= 1 && height >= 1
        if(!isWhole){
            throw new Error(`Item ${index} of ${count}, ${width}×${height}, is not a whole number of texels.`)
        }
        if(width > maxSize || height > maxSize){
            throw new Error(`Item ${index} of ${count}, ${width}×${height}, is larger than a page can grow,`
                + ` ${maxSize}×${maxSize}.`)
        }
    }

    #placeOne(size: PackerSize): Slot {
        const padding = this.options.padding
        const taken = { width: size.width + padding, height: size.height + padding }
        for(const page of this.#pages){
            const spot = bestSpotIn(page.free, taken)
            if(spot) return this.#occupy(page, spot, size)
        }
        for(const page of this.#pages){
            const grown = this.#grownToHold(page.slots, page.width, page.height, taken)
            if(!grown) continue
            page.width = grown.width
            page.height = grown.height
            page.free = grown.free
            return this.#occupy(page, grown.spot, size)
        }
        const side = this.options.initialSize
        const grown = this.#grownToHold([], side, side, taken)
        // Checked against maxSize first, so an empty page always grows to hold it.
        if(!grown) throw new Error(`An item of ${size.width}×${size.height} does not fit in an empty page.`)
        const page = new Page(grown.width, grown.height, grown.free)
        this.#pages.push(page)
        return this.#occupy(page, grown.spot, size)
    }

    /**
     * The size a page reaches by doubling its shortest side until it holds a rectangle, its free rectangles
     * at that size and the spot taken there, none when even `maxSize` is too small.
     */
    #grownToHold(
        slots: readonly Slot[], startWidth: number, startHeight: number, taken: PackerSize,
    ): { width: number, height: number, free: Rect[], spot: Rect }|null {
        const max = this.options.maxSize
        let width = startWidth
        let height = startHeight
        for(;;){
            const padding = this.options.padding
            const isLargeEnough = taken.width <= width + padding && taken.height <= height + padding
            if(isLargeEnough){
                const free = this.#freeOf(slots, width, height)
                const spot = bestSpotIn(free, taken)
                if(spot) return { width, height, free, spot }
            }
            if(width === max && height === max) return null
            if(width <= height) width = Math.min(width * 2, max)
            else height = Math.min(height * 2, max)
        }
    }

    #occupy(page: Page, spot: Rect, size: PackerSize): Slot {
        page.free = withoutZone(page.free, spot)
        const slot: Slot = { page, x: spot.x, y: spot.y, width: size.width, height: size.height }
        page.slots.push(slot)
        return slot
    }

    /** The maximal free rectangles of a page of a size holding some rectangles, in padded space. */
    #freeOf(slots: readonly Slot[], width: number, height: number): Rect[] {
        const padding = this.options.padding
        let free: Rect[] = [{ x: 0, y: 0, width: width + padding, height: height + padding }]
        for(const slot of slots){
            const zone = { x: slot.x, y: slot.y, width: slot.width + padding, height: slot.height + padding }
            free = withoutZone(free, zone)
        }
        return free
    }
}

/** A rectangle of texels, in the padded space of a page. */
interface Rect {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
}

/** A placed rectangle, with the page it holds on to. */
interface Slot extends PackedRect {
    readonly page: Page
}

/** An open page, and what is known of its room. */
class Page implements PackerPage {


    /** The rectangles placed in it, in the order they were placed. */
    public readonly slots: Slot[] = []

    constructor(
        public width: number,
        public height: number,

        /** The maximal free rectangles, in padded space. */
        public free: Rect[],
    ){}
}

/**
 * The top left corner where a rectangle of a size goes among free rectangles, by Best Short Side Fit: the
 * smallest leftover on the short side, then on the long side, then the smallest `y`, then the smallest `x`.
 * None when it fits nowhere.
 */
function bestSpotIn(free: readonly Rect[], taken: PackerSize): Rect|null {
    let best: Rect|null = null
    let bestShort = Infinity
    let bestLong = Infinity
    for(const rect of free){
        if(rect.width < taken.width || rect.height < taken.height) continue
        const leftoverX = rect.width - taken.width
        const leftoverY = rect.height - taken.height
        const short = Math.min(leftoverX, leftoverY)
        const long = Math.max(leftoverX, leftoverY)
        const isBetter = !best || short < bestShort || short === bestShort && (long < bestLong
            || long === bestLong && (rect.y < best.y || rect.y === best.y && rect.x < best.x))
        if(!isBetter) continue
        best = { x: rect.x, y: rect.y, width: taken.width, height: taken.height }
        bestShort = short
        bestLong = long
    }
    return best
}

/** The maximal free rectangles left once a zone is taken out of some. */
function withoutZone(free: readonly Rect[], zone: Rect): Rect[] {
    const split: Rect[] = []
    for(const rect of free){
        const overlaps = zone.x < rect.x + rect.width && rect.x < zone.x + zone.width
            && zone.y < rect.y + rect.height && rect.y < zone.y + zone.height
        if(!overlaps){
            split.push(rect)
            continue
        }
        const right = zone.x + zone.width
        const bottom = zone.y + zone.height
        if(zone.x > rect.x) split.push({ x: rect.x, y: rect.y, width: zone.x - rect.x, height: rect.height })
        if(right < rect.x + rect.width){
            split.push({ x: right, y: rect.y, width: rect.x + rect.width - right, height: rect.height })
        }
        if(zone.y > rect.y) split.push({ x: rect.x, y: rect.y, width: rect.width, height: zone.y - rect.y })
        if(bottom < rect.y + rect.height){
            split.push({ x: rect.x, y: bottom, width: rect.width, height: rect.y + rect.height - bottom })
        }
    }
    // A rectangle inside another is not maximal. Of two equal ones, the first is kept.
    return split.filter((rect, index) => !split.some((other, otherIndex) => {
        const isInside = rect.x >= other.x && rect.y >= other.y
            && rect.x + rect.width <= other.x + other.width && rect.y + rect.height <= other.y + other.height
        if(!isInside || otherIndex === index) return false
        const isEqual = rect.x === other.x && rect.y === other.y
            && rect.width === other.width && rect.height === other.height
        return !isEqual || otherIndex < index
    }))
}
