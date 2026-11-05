import { Button } from "../../../../engine/ui"

/**
 * A button that tells when the pointer comes over it and leaves, so several buttons can stand for one
 * thing hovered: the cards of a root of a chain.
 */
export class HoverButton extends Button {


    /** What the pointer coming over it or leaving does, nothing when none. */
    public onHover: ((over: boolean) => void)|null = null


    protected override hoverChanged(): void {
        super.hoverChanged()
        this.onHover?.(this.hovered)
    }
}
