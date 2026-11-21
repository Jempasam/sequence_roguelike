import { Box, Scroll, StepButton } from "../../../../engine/ui"
import type { Theme } from "../../../../engine/ui"
import { brownButtonLooks } from "../look/theme"
import type { LobbyController } from "./LobbyController"
import { stepValue } from "./ModeList"

/** The space between two buttons, in virtual pixels. */
const GAP = 4

/** The height of the bar inside its frame: the buttons and the scroll bar under them. */
export const PARTICIPANT_BAR_HEIGHT = 30

/**
 * What the player sets for itself in the mode of the room, in a row of buttons: each shows `label : value` and
 * goes to the next value when it is activated. The row scrolls sideways, so there may be many. It is told to
 * the game as the player joins, so it is locked once the player is in.
 */
export class ParticipantSettingsBar {


    /** What to lay out. */
    public get root(): Scroll { return this.#scroll }

    /** The button of each setting, by the id of the setting. */
    public get buttons(): ReadonlyMap<string, StepButton> { return this.#buttons }

    /** Is there anything to show? */
    public get isEmpty(): boolean { return this.#buttons.size === 0 }

    constructor(
        public readonly theme: Theme,
        private readonly controller: LobbyController,
        width: number,
        private readonly isOnPaper: () => boolean = () => false,
    ){
        this.#scroll = new Scroll(theme, { axis: "horizontal", width, height: PARTICIPANT_BAR_HEIGHT, wheel: true })
        this.#row = new Box("row", { gap: GAP, align: "center" })
        this.#scroll.content = this.#row
    }


    /** Ask for another width. */
    public resize(width: number): void {
        this.#scroll.resize(width, PARTICIPANT_BAR_HEIGHT)
    }

    /**
     * Show what the player has set. The buttons are made only when the settings are not the ones shown; then
     * each one only gets its text, whether it can be pressed and its look.
     */
    public refresh(): void {
        const { controller, theme } = this
        const settings = controller.participantSettings
        const same = settings.length === this.#buttons.size && settings.every(setting => this.#buttons.has(setting.id))
        if(!same){
            for(const child of [...this.#row.children]) this.#row.remove(child)
            this.#buttons.clear()
            for(const setting of settings){
                const button = new StepButton(theme, "")
                this.#buttons.set(setting.id, button)
                this.#row.add(button)
            }
        }
        const values = controller.participantValues
        const canSet = controller.canSetParticipant
        const looks = this.isOnPaper() ? brownButtonLooks(theme) : theme.button
        for(const setting of settings){
            const shown = values[setting.id] ?? setting.initial
            const button = this.#buttons.get(setting.id)!
            button.text = `${setting.label} : ${String(shown)}`
            button.enabled = canSet
            button.looks = looks
            button.onStep = direction => controller.setParticipant(setting, stepValue(setting, shown, direction))
        }
    }


    readonly #scroll: Scroll
    readonly #row: Box
    readonly #buttons = new Map<string, StepButton>()
}
