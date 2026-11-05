import { Sprite } from "../gpu"
import type { Gpu, Texture } from "../gpu"
import type { PixelData } from "../image"

import { Packer } from "./Packer"
import type { PackedRect, PackerPage, PackerSize } from "./Packer"

/** The empty texels between two entries, by default. */
const DEFAULT_PADDING = 1

/** The side of a page when it opens, by default, in texels. */
const DEFAULT_INITIAL_SIZE = 256

/** The bytes of an RGBA8 texel. */
const TEXEL_BYTES = 4

/** How an atlas lays out its pages. Two atlases meant to stay parallel take the same options. */
export interface AtlasOptions {
    /**
     * The largest side of a page, in texels, cut down to `gpu.limits.maxTextureSize`.
     *
     * @defaultValue `gpu.limits.maxTextureSize`
     */
    readonly maxSize?: number

    /**
     * The transparent texels between two entries.
     *
     * @defaultValue 1
     */
    readonly padding?: number

    /**
     * The side of a page when it opens, in texels, up to `maxSize`.
     *
     * @defaultValue 256
     */
    readonly initialSize?: number
}

/** How an image or a reservation sits in the atlas. */
export interface AtlasEntryOptions {
    /** The point its sprite is drawn from, in texels from its top left corner, `[0, 0]` by default. */
    readonly origin?: readonly [number, number]
}

/** How an image sits in the atlas. */
export interface AtlasImageOptions extends AtlasEntryOptions {
    /**
     * The size it takes in the atlas, its own by default. A different one resamples the image to the
     * nearest texel, which creates no new value: a normal stays a valid normal, where an interpolation
     * would shorten it. It mostly sets a normal map on the size of its colors, in a parallel atlas.
     */
    readonly size?: readonly [number, number]
}

/** An image to add to the atlas, in a batch. */
export interface AtlasImageItem extends AtlasImageOptions {
    /** The pixels of the image. */
    readonly pixels: PixelData
}

/** A zone to reserve in the atlas, in a batch. */
export interface AtlasReserveItem extends AtlasEntryOptions {
    /** The width and the height of the zone, in texels. */
    readonly reserve: readonly [number, number]
}

/** What a batch places: an image, or a reservation. */
export type AtlasItem = AtlasImageItem|AtlasReserveItem

/** A region of an entry, in texels of the size placed, for {@link PagedAtlas.sprite}. */
export interface AtlasRegion {
    /** The left edge, in texels from the left of the entry. */
    readonly x: number

    /** The top edge, in texels from the top of the entry. */
    readonly y: number

    /** The width, in texels. */
    readonly width: number

    /** The height, in texels. */
    readonly height: number

    /** The point the sprite is drawn from, in texels from the top left of the region, `[0, 0]` by default. */
    readonly origin?: readonly [number, number]
}

/** Where an entry lies: its page and its rectangle there, padding excluded, in texels. */
export interface AtlasRect<Page extends Texture = Texture> {
    /** The page holding it. */
    readonly page: Page

    /** The left edge, in texels. */
    readonly x: number

    /** The top edge, in texels. */
    readonly y: number

    /** The width, in texels. */
    readonly width: number

    /** The height, in texels. */
    readonly height: number
}

/** An image or a reservation in an atlas, what its sprites are made from. */
export class AtlasEntry {


    constructor(
        /** The width it takes in the atlas, in texels. */
        public readonly width: number,

        /** The height it takes in the atlas, in texels. */
        public readonly height: number,

        /** The point its sprite is drawn from, in texels from its left. */
        public readonly originX: number,

        /** The point its sprite is drawn from, in texels from its top. */
        public readonly originY: number,
    ){}
}

/**
 * Images gathered into one or more pages of texture, and the sprites showing them. Sprites of one page
 * share a texture, so they draw in one batch. Nothing else knows a sprite comes from an atlas.
 *
 * @remarks
 * The atlas is alive: images come and go at any time, one by one or in batches, with no building phase.
 * A {@link Packer} lays them out, so the layout depends only on the sequence of operations, the sizes they
 * carry and the options, never on the pixels. Two atlases given the same sequence agree, which is how a
 * color atlas and a normal atlas stay parallel, a reservation standing for a missing normal.
 *
 * Growing a page invalidates no sprite, nor any `Model` baked with them, since texture coordinates are in
 * texels. Nothing is ever moved, so there is no defragmentation: a fragmented page only sends new entries
 * elsewhere.
 *
 * Removing an entry warns none of the sprites given out, nor the models baked with it: they draw whatever
 * takes its zone afterwards, the old image until another one is placed there.
 *
 * The kind of page is that of the subclass: a texture for an `Atlas`, a render texture, which can be drawn
 * into, for a `RenderAtlas`.
 */
export abstract class PagedAtlas<Page extends Texture> {


    /** The GPU the pages live on. */
    public readonly gpu: Gpu

    /**
     * @throws {@link Error} When a side is not a whole number of at least 1, or the padding is negative.
     */
    constructor(gpu: Gpu, options: AtlasOptions = {}){
        this.gpu = gpu
        const maxTextureSize = gpu.limits.maxTextureSize
        this.#packer = new Packer({
            maxSize: Math.min(options.maxSize ?? maxTextureSize, maxTextureSize),
            padding: options.padding ?? DEFAULT_PADDING,
            initialSize: options.initialSize ?? DEFAULT_INITIAL_SIZE,
        })
    }


    /** The open pages, in the order they opened. */
    public get pages(): readonly Page[] {
        return this.#packer.pages.map(page => this.#textureOf(page))
    }

    /**
     * Place an image and write it in its page at once.
     *
     * @throws {@link Error} When the image is larger than a page can grow.
     */
    public add(pixels: PixelData, options: AtlasImageOptions = {}): AtlasEntry {
        return this.addAll([{ ...options, pixels }])[0]
    }

    /**
     * Place a zone that nothing else can take, and write nothing in it. Its content is undefined:
     * transparent in a new zone, whatever was there in a freed one. It is placed exactly as an image of the
     * same size.
     *
     * @throws {@link Error} When the zone is larger than a page can grow.
     */
    public reserve(width: number, height: number, options: AtlasEntryOptions = {}): AtlasEntry {
        return this.addAll([{ ...options, reserve: [width, height] }])[0]
    }

    /**
     * Place a batch of images and reservations, seen all at once.
     *
     * The largest are placed first, so two items of a batch are not always neighbors, nor on the same page.
     * Each page reaches its final size in one resize, a new page is composed on the CPU and sent in one
     * write, and an open page gets a write per image. Nothing is placed when one item cannot be.
     *
     * @returns The entries, in the order of the items.
     * @throws {@link Error} When an item is larger than a page can grow.
     */
    public addAll(items: readonly AtlasItem[]): AtlasEntry[] {
        this.#checkAlive()
        const sizes = items.map(sizeOf)
        const rects = this.#packer.place(sizes)
        const entries = items.map((item, index) => {
            const [originX, originY] = item.origin ?? [0, 0]
            const entry = new AtlasEntry(sizes[index].width, sizes[index].height, originX, originY)
            this.#rects.set(entry, rects[index])
            return entry
        })
        this.#write(items, rects)
        return entries
    }

    /**
     * Free the zone of an entry, without touching its texels, and free its page when it empties. The entry
     * can no longer give sprites.
     *
     * @throws {@link Error} When the entry is not in this atlas, or was already removed.
     */
    public remove(entry: AtlasEntry): void {
        const rect = this.#rectOf(entry)
        this.#packer.remove(rect)
        this.#rects.delete(entry)
        const isPageOpen = this.#packer.pages.includes(rect.page)
        if(isPageOpen) return
        this.#textureOf(rect.page).dispose()
        this.#textures.delete(rect.page)
    }

    /**
     * The sprite of a whole entry, drawn from its origin, or of a region of it. Coordinates are those of
     * the entry, at the size placed, so a sprite draws at the same place from the atlas as from its image
     * alone.
     *
     * @throws {@link Error} When the entry is not in this atlas, or the region is not whole texels inside it.
     */
    public sprite(entry: AtlasEntry, region?: AtlasRegion): Sprite {
        const rect = this.#rectOf(entry)
        const page = this.#textureOf(rect.page)
        if(!region){
            return new Sprite(page, rect.x, rect.y, rect.width, rect.height, entry.originX, entry.originY)
        }
        const { x, y, width, height } = region
        const isInside = [x, y, width, height].every(Number.isInteger) && x >= 0 && y >= 0 && width > 0
            && height > 0 && x + width <= entry.width && y + height <= entry.height
        if(!isInside){
            throw new Error(`The region ${width}×${height} at (${x}, ${y}) is not whole texels inside an entry`
                + ` of ${entry.width}×${entry.height}.`)
        }
        const [originX, originY] = region.origin ?? [0, 0]
        return new Sprite(page, rect.x + x, rect.y + y, width, height, originX, originY)
    }

    /**
     * The page of an entry and its rectangle there, padding excluded, to draw into its zone.
     *
     * @throws {@link Error} When the entry is not in this atlas, or was removed.
     */
    public rect(entry: AtlasEntry): AtlasRect<Page> {
        const rect = this.#rectOf(entry)
        const { x, y, width, height } = rect
        return { page: this.#textureOf(rect.page), x, y, width, height }
    }

    /** Do both atlases have pages of the same sizes, and the same rectangles, entry by entry? */
    public sameLayoutAs(other: PagedAtlas<Texture>): boolean {
        return this.#packer.sameLayoutAs(other.#packer)
    }

    /** Free every page. Every sprite of the atlas becomes invalid. Disposing twice does nothing. */
    public dispose(): void {
        if(this.#disposed) return
        for(const texture of this.#textures.values()) texture.dispose()
        this.#textures.clear()
        this.#rects.clear()
        this.#disposed = true
    }


    /** A transparent page of a size, in texels. */
    protected abstract newPage(width: number, height: number): Page


    readonly #packer: Packer

    /** The texture of each open page. */
    readonly #textures = new Map<PackerPage, Page>()

    /** Where each live entry lies. */
    readonly #rects = new Map<AtlasEntry, PackedRect>()

    #disposed = false

    #checkAlive(): void {
        if(this.#disposed) throw new Error("A disposed atlas was added to.")
    }

    /** Bring the textures to the size of their pages, then write the images of a batch. */
    #write(items: readonly AtlasItem[], rects: readonly PackedRect[]): void {
        const opened = new Set<PackerPage>()
        for(const page of this.#packer.pages){
            const texture = this.#textures.get(page)
            if(!texture){
                this.#textures.set(page, this.newPage(page.width, page.height))
                opened.add(page)
            }
            else if(texture.width !== page.width || texture.height !== page.height){
                texture.resize(page.width, page.height)
            }
        }
        const composed = new Map<PackerPage, Uint8Array>()
        items.forEach((item, index) => {
            if(!("pixels" in item)) return
            const rect = rects[index]
            const image = resampled(item.pixels, rect.width, rect.height)
            if(opened.has(rect.page)){
                let page = composed.get(rect.page)
                if(!page){
                    page = new Uint8Array(rect.page.width * rect.page.height * TEXEL_BYTES)
                    composed.set(rect.page, page)
                }
                blit(image, page, rect.page.width, rect.x, rect.y)
            }
            else this.#textureOf(rect.page).write(rect.x, rect.y, this.#withMargin(image, rect))
        })
        for(const [page, data] of composed){
            this.#textureOf(page).write(0, 0, { width: page.width, height: page.height, data })
        }
    }

    /**
     * An image with its margin, transparent, cut at the edges of its page. The zone may have held an
     * entry since removed, whose texels stayed.
     */
    #withMargin(image: PixelData, rect: PackedRect): PixelData {
        const padding = this.#packer.options.padding
        if(padding === 0) return image
        const width = Math.min(rect.width + padding, rect.page.width - rect.x)
        const height = Math.min(rect.height + padding, rect.page.height - rect.y)
        const data = new Uint8Array(width * height * TEXEL_BYTES)
        blit(image, data, width, 0, 0)
        return { width, height, data }
    }

    #rectOf(entry: AtlasEntry): PackedRect {
        const rect = this.#rects.get(entry)
        if(!rect) throw new Error("The entry is not in this atlas: it was removed, or added to another.")
        return rect
    }

    #textureOf(page: PackerPage): Page {
        const texture = this.#textures.get(page)
        if(!texture) throw new Error("A page of the atlas has no texture, which only a disposed atlas has.")
        return texture
    }
}

/** The size an item takes in the atlas. */
function sizeOf(item: AtlasItem): PackerSize {
    if("reserve" in item) return { width: item.reserve[0], height: item.reserve[1] }
    const [width, height] = item.size ?? [item.pixels.width, item.pixels.height]
    return { width, height }
}

/** An image at another size, each texel taken from the nearest pixel. The image itself at its own size. */
function resampled(pixels: PixelData, width: number, height: number): PixelData {
    if(pixels.width === width && pixels.height === height) return pixels
    const data = new Uint8Array(width * height * TEXEL_BYTES)
    for(let y = 0; y < height; y++){
        const sourceY = Math.floor(y * pixels.height / height)
        for(let x = 0; x < width; x++){
            const sourceX = Math.floor(x * pixels.width / width)
            const from = (sourceY * pixels.width + sourceX) * TEXEL_BYTES
            data.set(pixels.data.subarray(from, from + TEXEL_BYTES), (y * width + x) * TEXEL_BYTES)
        }
    }
    return { width, height, data }
}

/** Copy an image into a buffer of texels of a width, its top left corner at `(x, y)`. */
function blit(image: PixelData, into: Uint8Array, intoWidth: number, x: number, y: number): void {
    const rowBytes = image.width * TEXEL_BYTES
    for(let row = 0; row < image.height; row++){
        const from = row * rowBytes
        into.set(image.data.subarray(from, from + rowBytes), ((y + row) * intoWidth + x) * TEXEL_BYTES)
    }
}
