import { Container } from "../Container"
import { Rect } from "../Rect"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import { offsetOf } from "./Box"
import type { Align } from "./Box"

/** The slot of a child of a {@link Stack}. */
export interface StackSlot {
    /** Where it is anchored across the stack, `"start"` by default. */
    x: Align

    /** Where it is anchored down the stack, `"start"` by default. */
    y: Align

    /**
     * How far it is moved from its anchor, in virtual pixels, toward the center of the stack, none by
     * default. Stretched, it stays this far from each side.
     */
    offsetX: number
    offsetY: number
}

/**
 * Children laid over one another, each anchored to a corner, an edge, the center, or stretched.
 *
 * @remarks
 * On each axis, a child takes its preferred size, bounded by the room there is, lies at its anchor, then
 * moves by its offset. Stretched, it takes all the room, less its offset on each side. It is also the
 * layout of overlays, children all stretched. The HUD is a stack over the whole screen: the life anchored
 * top left, the minimap top right, the messages bottom center.
 *
 * Its empty zones are not interactive: the pointer goes through them to the world.
 */
export class Stack extends Container<StackSlot> {


    public override get childrenMayOverlap(): boolean {
        return true
    }


    protected defaultSlot(): StackSlot {
        return { x: "start", y: "start", offsetX: 0, offsetY: 0 }
    }

    protected computeHint(maxWidth: number): SizeHint {
        let minWidth = 0
        let minHeight = 0
        let preferredWidth = 0
        let preferredHeight = 0
        for(const child of this.children){
            if(!child.visible) continue
            const slot = this.slotOf(child)
            const aroundX = Math.abs(slot.offsetX) * (slot.x === "stretch" ? 2 : 1)
            const aroundY = Math.abs(slot.offsetY) * (slot.y === "stretch" ? 2 : 1)
            const hint = child.measure(maxWidth - aroundX)
            minWidth = Math.max(minWidth, hint.minWidth + aroundX)
            minHeight = Math.max(minHeight, hint.minHeight + aroundY)
            preferredWidth = Math.max(preferredWidth, hint.preferredWidth + aroundX)
            preferredHeight = Math.max(preferredHeight, hint.preferredHeight + aroundY)
        }
        return sizeHint(minWidth, minHeight, preferredWidth, preferredHeight)
    }

    /** Draws nothing of its own: its children draw. */
    protected paint(): void {}

    protected override arranged(): void {
        const { width, height } = this.bounds
        const rect = this.#rect
        for(const child of this.children){
            if(!child.visible) continue
            const slot = this.slotOf(child)
            const childWidth = slot.x === "stretch"
                ? Math.max(0, width - 2 * slot.offsetX)
                : Math.min(child.measure(width).preferredWidth, width)
            const childHeight = slot.y === "stretch"
                ? Math.max(0, height - 2 * slot.offsetY)
                : Math.min(child.measure(childWidth).preferredHeight, height)
            const x = anchored(slot.x, width - childWidth, slot.offsetX)
            const y = anchored(slot.y, height - childHeight, slot.offsetY)
            this.place(child, rect.set(x, y, childWidth, childHeight))
        }
    }


    readonly #rect = new Rect()
}

/** Where a child anchored on an axis lies, with room left of a length, moved by its offset. */
function anchored(anchor: Align, room: number, offset: number): number {
    // Anchored at the end, an offset moves it back toward the start.
    return offsetOf(anchor, room) + (anchor === "end" ? -offset : offset)
}
