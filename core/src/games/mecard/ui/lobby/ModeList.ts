import { Color } from "../../../../engine/math"
import { Box, Button, Label, NineSlice, Panel, Paragraph, Scroll, StepButton } from "../../../../engine/ui"
import type { StepDirection, Theme } from "../../../../engine/ui"
import type { LobbyMode } from "../../sync/lobby/LobbyMode"
import type { ModeState } from "../../sync/lobby/LobbyMessage"
import { ChoiceSetting, RangeSetting } from "../../sim/mode/Setting"
import type { Setting, SettingValue } from "../../sim/mode/Setting"
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

/**
 * The value after the one given, or before it, going round: a choice goes to its next or previous name, a
 * range to its next or previous step.
 */
export function stepValue(setting: Setting, value: SettingValue|undefined, direction: StepDirection): SettingValue {
    return setting.accept<SettingValue>({
        choice(choice: ChoiceSetting){
            const { length } = choice.values
            const index = choice.values.indexOf(String(value))
            return choice.values[((index + direction) % length + length) % length]
        },
        range(range: RangeSetting){
            if(typeof value !== "number") return range.initial
            const next = value + direction * range.step
            if(next > range.max) return range.min
            if(next < range.min) return range.max
            return next
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

    /**
     * Bring the cards to what the lobby is set on. They are built once, for the modes the lobby offers, and
     * changed in place after, so what the player scrolled and focused stays.
     */
    public refresh(): void {
        const { controller } = this
        const modes = controller.modes
        if(!this.#built || this.#built.length !== modes.length || this.#built.some((mode, index) => mode !== modes[index])){
            this.#build(modes)
        }
        const state = this.#state()
        const canChange = controller.isHost && !controller.playing
        this.#settings.clear()
        for(const card of this.#cards){
            const { mode } = card
            const chosen = state?.mode === mode.id
            const values = chosen && state ? state.values : {}
            const paper = this.sprites?.paper
            card.panel.background = paper
                ? paperFrame(paper, 1, chosen ? CHOSEN_PAPER : PAPER)
                : NineSlice.flat(this.theme.white, chosen ? CHOSEN_CARD : CARD)
            card.title.enabled = canChange
            const buttons = new Map<string, Button>()
            for(const row of card.rows){
                const { setting } = row
                const shown = values[setting.id] === undefined ? setting.initial : values[setting.id]
                const text = String(shown)
                const changes = chosen && canChange
                row.button.text = text
                row.button.visible = changes
                row.value.text = text
                row.value.color = this.sprites?.paper != null
                    ? (chosen ? INK_TEXT : DIM_INK_TEXT)
                    : chosen ? CHOSEN_TEXT : DIM_TEXT
                row.value.visible = !changes
                if(changes) buttons.set(setting.id, row.button)
            }
            this.#settings.set(mode.id, buttons)
        }
    }


    readonly #scroll: Scroll
    readonly #column: Box
    readonly #titles = new Map<string, Button>()
    readonly #settings = new Map<string, Map<string, Button>>()

    /** The modes the cards were built for. */
    #built: readonly LobbyMode[]|null = null
    #cards: Card[] = []

    /** Build a card for each mode, which `refresh` then sets. */
    #build(modes: readonly LobbyMode[]): void {
        const { theme } = this
        for(const child of [...this.#column.children]) this.#column.remove(child)
        this.#titles.clear()
        this.#cards = []
        this.#built = [...modes]
        const onPaper = this.sprites?.paper != null
        const looks = onPaper ? brownButtonLooks(theme) : undefined
        for(const mode of modes){
            const panel = new Panel(theme, { padding: onPaper ? MARGIN + PAPER_MARGIN / 2 : MARGIN, background: null })
            const body = new Box("column", { gap: 2, align: "stretch" })
            const title = new Button(theme, mode.title, looks ? { looks } : {})
            title.onActivate = () => this.#select(mode)
            this.#titles.set(mode.id, title)
            body.add(title)
            body.add(new Paragraph(theme, mode.description, { color: onPaper ? DIM_INK_TEXT : DIM_TEXT }))
            const rows = mode.settings.map(setting => {
                const row = this.#row(setting, mode)
                body.add(row.box)
                return row
            })
            panel.content = body
            this.#column.add(panel)
            this.#cards.push({ mode, panel, title, rows })
        }
    }

    #state(): ModeState|null {
        const { selection, view } = this.controller
        return selection?.state ?? view?.state ?? null
    }

    #select(mode: LobbyMode): void {
        this.controller.selection?.select(mode.id)
    }

    /**
     * A setting: its name, and what it is worth, shown as a button the host activates to change and as a
     * label for the others. `refresh` shows one of the two.
     */
    #row(setting: Setting, mode: LobbyMode): SettingRow {
        const box = new Box("row", { gap: MARGIN, align: "center" })
        const onPaper = this.sprites?.paper != null
        box.add(new Label(this.theme, `${setting.label} :`, { color: onPaper ? DIM_INK_TEXT : DIM_TEXT }), { grow: 1 })
        const button = new StepButton(this.theme, String(setting.initial), onPaper ? { looks: brownButtonLooks(this.theme) } : {})
        button.onStep = direction => {
            const state = this.#state()
            const value = state?.mode === mode.id ? state.values[setting.id] : undefined
            this.controller.selection?.set(setting.id, stepValue(setting, value === undefined ? setting.initial : value, direction))
        }
        const value = new Label(this.theme, String(setting.initial))
        box.add(button)
        box.add(value)
        return { setting, box, button, value }
    }
}

/** What a card of a mode is made of. */
interface Card {
    readonly mode: LobbyMode
    readonly panel: Panel
    readonly title: Button
    readonly rows: readonly SettingRow[]
}

/** What the row of a setting is made of. */
interface SettingRow {
    readonly setting: Setting
    readonly box: Box
    readonly button: Button
    readonly value: Label
}
