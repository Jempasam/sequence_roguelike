import { Color } from "../../../../engine/math"
import { Box, Button, Label, NineSlice, Panel, Paragraph, Scroll } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import type { LobbyMode } from "../../sync/lobby/LobbyMode"
import type { ModeState } from "../../sync/lobby/LobbyMessage"
import { ChoiceSetting, RangeSetting } from "../../sync/lobby/Setting"
import type { Setting, SettingValue } from "../../sync/lobby/Setting"
import { brownButtonLooks, CHOSEN_TEXT, DIM_INK_TEXT, DIM_TEXT, INK_TEXT } from "../look/theme"
import { PAPER_MARGIN, paperFrame } from "../look/paper"
import type { UnitSprites } from "../look/UnitSprites"
import type { LobbyController } from "./LobbyController"

/** The color behind a card that is not the mode chosen, and behind the one that is. */
const CARD = new Color(0.2, 0.19, 0.28)
const CHOSEN_CARD = new Color(0.33, 0.3, 0.45)

/** What the paper of a card that is not the mode chosen is multiplied by, and the one that is. */
const PAPER = new Color(0.65, 0.6, 0.55)
const CHOSEN_PAPER = new Color(1, 1, 1)

/** The space between two cards, and around them, in virtual pixels. */
const MARGIN = 4

/** The value after the one given, going round: a choice goes to its next name, a range to its next step. */
export function nextValue(setting: Setting, value: SettingValue|undefined): SettingValue {
    return setting.accept<SettingValue>({
        choice(choice: ChoiceSetting){
            const index = choice.values.indexOf(String(value))
            return choice.values[(index + 1) % choice.values.length]
        },
        range(range: RangeSetting){
            const next = typeof value === "number" ? value + range.step : range.initial
            return next > range.max ? range.min : next
        },
    })
}

/**
 * The modes a lobby offers, one card each, the one chosen lit. The host chooses a mode and changes its
 * settings by activating them; a client sees them as the host set them, and changes nothing.
 */
export class ModeList {


    /** What to lay out. */
    public get root(): Scroll { return this.#scroll }

    /** The button of the title of each mode, by the id of the mode. */
    public get titleButtons(): ReadonlyMap<string, Button> { return this.#titles }

    /** The button of each setting, by the id of the mode, then the id of the setting: the host's only. */
    public get settingButtons(): ReadonlyMap<string, ReadonlyMap<string, Button>> { return this.#settings }

    constructor(
        public readonly theme: Theme,
        private readonly controller: LobbyController,
        width: number,
        private readonly sprites: UnitSprites|null = null,
    ){
        this.#scroll = new Scroll(theme, { width, height: 1, wheel: true })
        this.#column = new Box("column", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        this.#scroll.content = this.#column
    }


    /** Ask for another width. */
    public resize(width: number): void {
        this.#scroll.resize(width, 1)
    }

    /** Build the cards again, from what the lobby is set on. */
    public refresh(): void {
        const { controller, theme } = this
        for(const child of [...this.#column.children]) this.#column.remove(child)
        this.#titles.clear()
        this.#settings.clear()
        const state = this.#state()
        const canChange = controller.isHost && !controller.playing
        for(const mode of controller.modes){
            const chosen = state?.mode === mode.id
            const values = chosen && state ? state.values : {}
            const paper = this.sprites?.paper
            const card = new Panel(theme, paper
                ? { background: paperFrame(paper, 1, chosen ? CHOSEN_PAPER : PAPER), padding: MARGIN + PAPER_MARGIN / 2 }
                : { background: NineSlice.flat(theme.white, chosen ? CHOSEN_CARD : CARD), padding: MARGIN })
            const body = new Box("column", { gap: 2, align: "stretch" })
            const looks = this.sprites?.paper ? brownButtonLooks(theme) : undefined
            const title = new Button(theme, mode.title, { enabled: canChange, ...looks ? { looks } : {} })
            title.onActivate = () => this.#select(mode)
            this.#titles.set(mode.id, title)
            body.add(title)
            const onPaper = this.sprites?.paper != null
            body.add(new Paragraph(theme, mode.description, { color: onPaper ? DIM_INK_TEXT : DIM_TEXT }))
            const buttons = new Map<string, Button>()
            for(const setting of mode.settings){
                body.add(this.#row(setting, chosen, canChange, values[setting.id], buttons))
            }
            this.#settings.set(mode.id, buttons)
            card.content = body
            this.#column.add(card)
        }
    }


    readonly #scroll: Scroll
    readonly #column: Box
    readonly #titles = new Map<string, Button>()
    readonly #settings = new Map<string, Map<string, Button>>()

    #state(): ModeState|null {
        const { selection, view } = this.controller
        return selection?.state ?? view?.state ?? null
    }

    #select(mode: LobbyMode): void {
        this.controller.selection?.select(mode.id)
    }

    /** A setting: its name, and what it is worth, which the host activates to change. */
    #row(
        setting: Setting,
        chosen: boolean,
        canChange: boolean,
        value: SettingValue|undefined,
        buttons: Map<string, Button>,
    ): Component {
        const row = new Box("row", { gap: MARGIN, align: "center" })
        const onPaper = this.sprites?.paper != null
        row.add(new Label(this.theme, `${setting.label} :`, { color: onPaper ? DIM_INK_TEXT : DIM_TEXT }), { grow: 1 })
        const shown = value === undefined ? setting.initial : value
        const text = String(shown)
        if(chosen && canChange){
            const button = new Button(this.theme, text, onPaper ? { looks: brownButtonLooks(this.theme) } : {})
            button.onActivate = () => this.controller.selection?.set(setting.id, nextValue(setting, shown))
            buttons.set(setting.id, button)
            row.add(button)
        } else row.add(new Label(this.theme, text, { color: onPaper ? (chosen ? INK_TEXT : DIM_INK_TEXT) : chosen ? CHOSEN_TEXT : DIM_TEXT }))
        return row
    }
}
