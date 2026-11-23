import type { Rect } from "../Rect"

/** The side of its target a bubble opens on. */
export type BubbleSide = "below"|"above"|"right"|"left"

/** How large a bubble is, in virtual pixels. */
export interface BubbleSize {
    readonly width: number
    readonly height: number
}

/** A point of the layer, in virtual pixels. */
export interface BubblePoint {
    readonly x: number
    readonly y: number
}

/** Where a bubble opens, and the side of its target it fell on. */
export interface BubblePlacement {
    /** Its top left corner, in virtual pixels of the layer. */
    readonly x: number
    readonly y: number
    readonly side: BubbleSide
}

/** The sides tried by default: under the target, then over it. */
export const DEFAULT_SIDES: readonly BubbleSide[] = ["below", "above"]

/**
 * Where a bubble opens around a target, on the first side of those given where it fits whole in the room.
 * When it fits on none, on the side with the most room, kept in the room.
 *
 * @remarks
 * Along the side it opens on, the bubble starts where its target starts, and ends where its target ends when
 * it would go out of the room otherwise: below or above, it is aligned to the left of the target, or to its
 * right; at its right or left, to the top of the target, or to its bottom. A point is a target of no size.
 *
 * @param target - What the bubble is about, in virtual pixels of the layer.
 * @param room - The layer it must stay in, which starts at the origin.
 * @param sides - The sides to try, the most wanted first.
 * @param gap - The space left between the target and the bubble, in virtual pixels.
 * @param near - A point the bubble should be as close to as it can, such as the pointer over a large target.
 *   Along the side it opens on, the bubble is then centered on the point rather than aligned to the target,
 *   and of the sides where it fits whole, the one that puts it closest to the point is taken, the first of
 *   those given on a tie.
 */
export function placeBubble(
    size: BubbleSize,
    target: Readonly<Rect>,
    room: BubbleSize,
    sides: readonly BubbleSide[] = DEFAULT_SIDES,
    gap = 0,
    near: Readonly<BubblePoint>|null = null,
): BubblePlacement {
    let best: BubblePlacement|null = null
    let bestRoom = -Infinity
    let closest: BubblePlacement|null = null
    let closestDistance = Infinity
    for(const side of sides.length > 0 ? sides : DEFAULT_SIDES){
        const [x, y] = near
            ? cornerNear(side, size, target, room, gap, near)
            : corner(side, size, target, room, gap)
        if(x >= 0 && y >= 0 && x + size.width <= room.width && y + size.height <= room.height){
            if(!near) return { x, y, side }
            const distance = distanceTo(near, x, y, size)
            if(distance < closestDistance){
                closestDistance = distance
                closest = { x, y, side }
            }
            continue
        }
        const left = roomOn(side, target, room, gap)
        if(left > bestRoom){
            bestRoom = left
            best = { x, y, side }
        }
    }
    if(closest) return closest
    const { x, y, side } = best as BubblePlacement
    return {
        x: Math.max(0, Math.min(x, room.width - size.width)),
        y: Math.max(0, Math.min(y, room.height - size.height)),
        side,
    }
}

/** The top left corner of a bubble against a side of its target, before it is kept in the room. */
function corner(
    side: BubbleSide, size: BubbleSize, target: Readonly<Rect>, room: BubbleSize, gap: number,
): [number, number] {
    const across = target.x + size.width > room.width ? target.right - size.width : target.x
    const along = target.y + size.height > room.height ? target.bottom - size.height : target.y
    switch(side){
        case "below": return [across, target.bottom + gap]
        case "above": return [across, target.y - gap - size.height]
        case "right": return [target.right + gap, along]
        case "left": return [target.x - gap - size.width, along]
    }
}

/**
 * The top left corner of a bubble against a side of its target, centered on a point along that side and kept
 * in the room along it.
 */
function cornerNear(
    side: BubbleSide, size: BubbleSize, target: Readonly<Rect>, room: BubbleSize, gap: number,
    near: Readonly<BubblePoint>,
): [number, number] {
    // Whole pixels only: a bubble of an odd size, or a pointer between two pixels, would blur it.
    const across = Math.max(0, Math.min(Math.floor(near.x - size.width / 2), room.width - size.width))
    const along = Math.max(0, Math.min(Math.floor(near.y - size.height / 2), room.height - size.height))
    switch(side){
        case "below": return [across, target.bottom + gap]
        case "above": return [across, target.y - gap - size.height]
        case "right": return [target.right + gap, along]
        case "left": return [target.x - gap - size.width, along]
    }
}

/** How far a point is from a bubble, in virtual pixels: none when it lies in it. */
function distanceTo(point: Readonly<BubblePoint>, x: number, y: number, size: BubbleSize): number {
    const dx = Math.max(x - point.x, 0, point.x - (x + size.width))
    const dy = Math.max(y - point.y, 0, point.y - (y + size.height))
    return Math.hypot(dx, dy)
}

/** How much room is left on a side of the target, in virtual pixels. */
function roomOn(side: BubbleSide, target: Readonly<Rect>, room: BubbleSize, gap: number): number {
    switch(side){
        case "below": return room.height - target.bottom - gap
        case "above": return target.y - gap
        case "right": return room.width - target.right - gap
        case "left": return target.x - gap
    }
}
