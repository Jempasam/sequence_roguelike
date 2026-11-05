import { Rect, unionArea } from "./Rect"

/**
 * The most rectangles a frame draws again. High enough that two elements far apart on the HUD, a life
 * counter top left and a timer top right, do not merge into the whole top of the screen.
 */
export const MAX_DIRTY_RECTS = 4

/**
 * The zones of the interface texture to draw again at the next frame, as a few rectangles.
 *
 * @remarks
 * A rectangle added is cut to the texture, then merged with every rectangle it touches, until none touch.
 * Past {@link MAX_DIRTY_RECTS}, the pair whose union adds the least area merges. A single union would be
 * simpler, but two small changes in opposite corners would then draw the whole screen again.
 */
export class DirtyRegion {


    /** The rectangles to draw again, none touching another. */
    public get rects(): readonly Readonly<Rect>[] { return this.#rects }

    /** Is there nothing to draw again? */
    public get isEmpty(): boolean { return this.#rects.length === 0 }

    /** Set the size of the texture the rectangles are cut to, forgetting them. */
    public resize(width: number, height: number): void {
        this.#bounds.set(0, 0, width, height)
        this.clear()
    }

    /** Add a zone, cut to the texture. An empty one is ignored. */
    public add(rect: Readonly<Rect>): void {
        const added = this.#take().copyFrom(rect).intersect(this.#bounds)
        if(added.isEmpty){
            this.#spare.push(added)
            return
        }
        this.#rects.push(added)
        this.#mergeTouching()
        if(this.#rects.length > MAX_DIRTY_RECTS) this.#mergeCheapest()
    }

    /** Mark the whole texture. */
    public addAll(): void {
        this.add(this.#bounds)
    }

    public clear(): void {
        for(const rect of this.#rects) this.#spare.push(rect)
        this.#rects.length = 0
    }


    readonly #rects: Rect[] = []
    readonly #bounds = new Rect()

    /** Rectangles taken out of the region, kept to be reused, so adding one allocates nothing. */
    readonly #spare: Rect[] = []

    #take(): Rect {
        return this.#spare.pop() ?? new Rect()
    }

    /** Merge the rectangles that touch, until none do. */
    #mergeTouching(): void {
        const rects = this.#rects
        let merged = true
        while(merged){
            merged = false
            for(let i = 0; i < rects.length && !merged; i++){
                for(let j = i + 1; j < rects.length; j++){
                    if(!rects[i].touches(rects[j])) continue
                    this.#merge(i, j)
                    merged = true
                    break
                }
            }
        }
    }

    /** Merge the pair whose union adds the least area, then whatever the union touches. */
    #mergeCheapest(): void {
        const rects = this.#rects
        let bestI = 0
        let bestJ = 1
        let bestCost = Infinity
        for(let i = 0; i < rects.length; i++){
            for(let j = i + 1; j < rects.length; j++){
                const cost = unionArea(rects[i], rects[j]) - rects[i].area - rects[j].area
                if(cost >= bestCost) continue
                bestCost = cost
                bestI = i
                bestJ = j
            }
        }
        this.#merge(bestI, bestJ)
        this.#mergeTouching()
    }

    /** Replace two rectangles by their union, the first index lower than the second. */
    #merge(i: number, j: number): void {
        const rects = this.#rects
        rects[i].union(rects[j])
        this.#spare.push(rects[j])
        rects.splice(j, 1)
    }
}
