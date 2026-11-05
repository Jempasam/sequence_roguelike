import { Panel } from "../../../../engine/ui"
import type { UiEvent } from "../../../../engine/ui"

/**
 * A panel that tells when the pointer comes over it or leaves, and when it is clicked: what stands for a
 * unit in the interface, lit up while the unit is highlighted.
 */
export class HoverPanel extends Panel {


    /** What the pointer coming over it or leaving does, nothing when none. */
    public onHover: ((over: boolean) => void)|null = null

    /** What a click does, nothing when none. */
    public onPick: (() => void)|null = null


    protected override hoverChanged(): void {
        this.onHover?.(this.hovered)
    }

    protected override handle(event: UiEvent): void {
        if(event.type !== "pointer-down" || event.button !== 0 || !this.onPick) return
        event.consume()
        this.onPick()
    }
}
