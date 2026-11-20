import { Box, Button, Scroll } from "../../../../engine/ui"
import type { Theme } from "../../../../engine/ui"
import { brownButtonLooks } from "../look/theme"
import type { LobbyController } from "./LobbyController"
import { nextValue } from "./ModeList"

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
    public get buttons(): ReadonlyMap<string, Button> { return this.#buttons }

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

    /** Build the buttons again, from what the player has set. */
    public refresh(): void {
        const { controller, theme } = this
        for(const child of [...this.#row.children]) this.#row.remove(child)
        this.#buttons.clear()
        const values = controller.participantValues
        const canSet = controller.canSetParticipant
        for(const setting of controller.participantSettings){
            const shown = values[setting.id] ?? setting.initial
            const looks = this.isOnPaper() ? { looks: brownButtonLooks(theme) } : {}
            const button = new Button(theme, `${setting.label} : ${String(shown)}`, { enabled: canSet, ...looks })
            button.onActivate = () => controller.setParticipant(setting, nextValue(setting, shown))
            this.#buttons.set(setting.id, button)
            this.#row.add(button)
        }
    }


    readonly #scroll: Scroll
    readonly #row: Box
    readonly #buttons = new Map<string, Button>()
}
