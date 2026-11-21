import { Box, Button, Label, Panel } from "../../../../engine/ui"
import type { Layer, Theme, UiEvent } from "../../../../engine/ui"

import { brownButton, DIM_TEXT } from "../look/theme"

/**
 * The popup that asks whether to go back to the main menu, opened in a layer, modal while open.
 *
 * @remarks
 * It closes on `cancel`, on a press outside it, or on its "Rester" button, and tells the one who opened it
 * when "Quitter" is chosen, once it is closed.
 */
export class QuitPopup extends Panel {


    constructor(
        theme: Theme,

        /** The layer it opens in, the popup layer in practice. */
        public readonly layer: Layer,
    ){
        super(theme)
        const column = new Box("column", { gap: 4, align: "stretch" })
        this.#question = new Label(theme, "Retourner au menu principal ?", { color: DIM_TEXT, align: "center" })
        column.add(this.#question)
        const quit = new Button(theme, "Quitter", brownButton(theme))
        quit.onActivate = () => {
            this.close()
            this.#onConfirm?.()
        }
        this.#stay = new Button(theme, "Rester", brownButton(theme))
        this.#stay.onActivate = () => this.close()
        column.add(quit)
        column.add(this.#stay)
        this.content = column
    }


    /** Is it open? */
    public get isOpen(): boolean { return this.parent === this.layer.content }

    /** The button that closes it, which holds the focus when it opens. */
    public get stayButton(): Button { return this.#stay }

    /**
     * Open it in the middle of the layer, the focus on the button that stays.
     *
     * @param onConfirm - What "Quitter" does, once the popup is closed.
     * @param question - What it asks, the return to the menu by default.
     */
    public open(onConfirm: () => void, question = "Retourner au menu principal ?"): void {
        this.#onConfirm = onConfirm
        this.#question.text = question
        if(!this.isOpen) this.layer.content.add(this, { x: "center", y: "center" })
        this.#stay.focus()
    }

    /** Close it. Closing it closed does nothing. */
    public close(): void {
        if(!this.isOpen) return
        this.layer.content.remove(this)
    }


    protected override get modal(): boolean {
        return true
    }

    protected override pressedOutside(): void {
        this.close()
    }

    protected override handle(event: UiEvent): void {
        if(event.type !== "action" || event.action !== "cancel") return
        this.close()
        event.consume()
    }


    readonly #stay: Button
    readonly #question: Label
    #onConfirm: (() => void)|null = null
}
