import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Component, NineSlice, sizeHint } from "../../../../engine/ui"
import type { Rope, SizeHint, Theme, UiEvent, UiRoot, Layer } from "../../../../engine/ui"
import { TextLayout } from "../../../../engine/text"
import { Scope } from "../../../../lifetime"
import type { DuelFighting, DuelWatching } from "../../sim/mode/subs/duelRace/players/HubPort"
import type { DuelRacePlayer } from "../../sim/mode/subs/duelRace/players/DuelRacePlayer"
import type { RosterEntry } from "../../sync/lobby/RosterMessage"
import { hueOfName } from "../../sync/lobby/Profile"
import { hueColor } from "../chat/ChatPanel"
import { brownButtonLooks, DIM_INK_TEXT, INK_TEXT, WARNING_INK_TEXT } from "../look/theme"
import { paperFrame } from "../look/paper"
import type { UnitSprites } from "../look/UnitSprites"
import { CARD_PAD, friezeGroupWidth, friezeHit, friezeLivesHeight, paintFrieze } from "./RaceFrieze"
import type { FriezeBox, FriezeEntry, FriezeLayout } from "./RaceFrieze"
import { floorTicks, mapPosition, mapScale, scaleRatio } from "./raceMap"
import type { MapScale } from "./raceMap"

/** Where the tab lies across the screen. */
export type RaceTabAlign = "start"|"center"|"end"

/**
 * How wide the tab is while folded, in virtual pixels, whatever it holds. Unfolded, it grows if its frames
 * need more room, up to the width of the screen.
 */
const BASE_WIDTH = 130

/** The room kept at each side of the screen when the tab is as wide as can be. */
const SCREEN_MARGIN = 4

/** How long the button to leave waits for its second click, in seconds. */
const LEAVE_CONFIRM_SECONDS = 3

/** The text of the button to leave, and of the one that asks to be sure. */
const LEAVE_LABEL = "Quitter la partie"
const SURE_LABEL = "Sûr ? Quitter"

/** The room around the text of the button to leave, in virtual pixels, across and down. */
const LEAVE_PAD_X = 8
const LEAVE_PAD_Y = 4

/** The room above the first line of the tab, hidden while it is folded. */
const TOP = 6

/** The height of the line of a frieze in its frame, in virtual pixels. */
const FRIEZE_HEIGHT = 26

/** The room between the frames of the friezes and the sides of the tab. */
const SIDE = 10

/** How much darker than the tab the small frames are: the paper multiplied by it. */
const CARD_TINT = new Color(0.82, 0.75, 0.66)

/** The seconds a tab takes to unfold or to fold. */
const SLIDE_SECONDS = 0.15

/** How many seconds before the end the timer is written in red, and blinks faster. */
const ALARM_SECONDS = 10

/** How many seconds before the end the blinking is at its fastest. */
const LAST_SECONDS = 3

/** How many times a second the tab blinks while the timer runs, when much time is left, short, and last. */
const BLINK_SLOW = 1
const BLINK_FAST = 2
const BLINK_LAST = 4

/** The paper of the tab until the picture of the paper is loaded. */
const PLAIN_PAPER = new Color(0.85, 0.77, 0.6)

/** What the paper is tinted with to warn, through the hue. */
const WARNING_TINT = new Color(1, 0.1, 0.08)

/** The color of the mark of a player that is out. */
const OUT_MARK = new Color(0.55, 0.5, 0.45)

/** How dark the colors of the players are made, so they read on paper. */
const MARK_DARKNESS = 0.62

/** The color a player is marked with. */
function markColor(name: string): Color {
    const light = hueColor(hueOfName(name))
    return new Color(light.r * MARK_DARKNESS, light.g * MARK_DARKNESS, light.b * MARK_DARKNESS)
}

/** An ease in and out of a share from 0 to 1. */
function ease(share: number): number {
    return share * share * (3 - 2 * share)
}

/**
 * A tab of paper hanging a little over the top of the screen, with a small text on its edge. The pointer over
 * it brings it down, in front: a large timer, and the players on a frieze. It blinks red when the time runs
 * short, and stays red when the player is out or lost its duel.
 */
class TabView extends Component {


    /** The paper, none for a plain one until its picture is loaded. */
    public set paper(paper: NineSlice|null){
        this.#paper = paper
        this.invalidate()
    }

    /** The small frame of paper the frieze lies on, none for a plain one until its picture is loaded. */
    public set card(card: NineSlice|null){
        this.#card = card
        this.invalidate()
    }

    /** The line of the paths of the map, the frieze is drawn with, none before it is loaded. */
    public set rope(rope: Rope|null){
        this.#rope = rope
        this.invalidate()
    }

    /** Told when the button to leave is clicked. */
    public onLeave: (() => void)|null = null

    /** How far the tab is unfolded, from 0 to 1: it is as wide as its frames need only when unfolded. */
    public get open(): number { return this.#open }

    public set open(open: number){
        if(open === this.#open) return
        this.#open = open
        this.invalidateLayout()
    }

    /** How tall the tab is, folded part and all: it grows with the texts and the lives of its friezes. */
    public get fullHeight(): number { return this.#metrics(this.#state).height }

    /** How tall the edge that hangs over the screen is while folded. */
    public get edge(): number { return this.#edge }

    constructor(
        public readonly theme: Theme,
        private readonly ui: UiRoot,
    ){
        super()
        this.#small = new TextLayout(theme.font, theme.textScale)
        this.#large = new TextLayout(theme.font, theme.textScale * 2)
        this.#edge = Math.max(14, this.#small.lineHeight + 6)
        this.#plain = NineSlice.flat(theme.white, PLAIN_PAPER.clone())
        this.#plainCard = NineSlice.flat(theme.white, new Color(
            PLAIN_PAPER.r * CARD_TINT.r, PLAIN_PAPER.g * CARD_TINT.g, PLAIN_PAPER.b * CARD_TINT.b))
    }


    /** The id of the player of the frieze under the pointer, none when it is over none. */
    public get hoveredId(): string|null {
        return this.hovered ? this.#hoveredId() : null
    }

    /** What the view shows, set by its tab. */
    public show(state: TabState): void {
        const old = this.#state
        const same = old.edge === state.edge && old.info === state.info && old.timer === state.timer
            && old.alarm === state.alarm && old.tint === state.tint && old.layout === state.layout
            && old.hovered === state.hovered && old.leave === state.leave
            && old.ticks.length === state.ticks.length && old.ticks.every((tick, index) => tick === state.ticks[index])
            && old.entries.length === state.entries.length
            && old.entries.every((entry, index) => {
                const next = state.entries[index]
                return entry.id === next.id && entry.ratio === next.ratio && entry.color.equals(next.color)
                    && entry.top === next.top && entry.bottom === next.bottom
                    && entry.lives === next.lives && entry.maxLives === next.maxLives
            })
        const before = this.#metrics(old)
        const after = this.#metrics(state)
        this.#state = state
        if(before.width !== after.width || before.height !== after.height) this.invalidateLayout()
        else if(!same) this.invalidate()
    }


    protected override get interactive(): boolean {
        return true
    }

    protected computeHint(): SizeHint {
        const { width, height } = this.#metrics(this.#state)
        return sizeHint(width, height)
    }

    protected override handle(event: UiEvent): void {
        switch(event.type){
            case "pointer-down":
                if(event.button !== 0 || !this.#overLeave(event.x, event.y)) break
                event.consume()
                this.#pressed = true
                this.invalidate()
                break
            case "pointer-up": {
                if(event.button !== 0 || !this.#pressed) break
                event.consume()
                this.#pressed = false
                this.invalidate()
                if(this.#overLeave(event.x, event.y)) this.onLeave?.()
                break
            }
            default:
                break
        }
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        const state = this.#state
        const paper = this.#paper ?? this.#plain
        painter.push()
        if(state.tint){
            painter.setColorMode("hue")
            paper.color.copyFrom(state.tint)
        } else paper.color.set(1, 1, 1, 1)
        paper.draw(painter, 0, 0, width, height)
        painter.pop()
        const layout = this.#metrics(state)
        this.#line(painter, this.#small, state.info, TOP, DIM_INK_TEXT, width)
        this.#line(painter, this.#large, state.timer, layout.timerY, state.alarm ? WARNING_INK_TEXT : INK_TEXT, width)
        // Each frieze lies on a small frame of paper, darker than the tab; the lives lie under, on the tab.
        painter.push()
        painter.translate(layout.friezeX, layout.friezeY)
        paintFrieze(painter, {
            white: this.theme.white, rope: this.#rope, card: this.#card ?? this.#plainCard, text: this.#small,
            ink: DIM_INK_TEXT,
        }, state.layout, state.entries, layout.box, state.hovered, state.ticks)
        painter.pop()
        if(state.leave !== "") this.#paintLeave(painter, layout, state.leave)
        const stripY = height - this.#edge + Math.floor((this.#edge - this.#small.lineHeight) / 2) - 1
        this.#line(painter, this.#small, state.edge, stripY, state.alarm ? WARNING_INK_TEXT : INK_TEXT, width)
    }


    #paper: NineSlice|null = null
    #card: NineSlice|null = null
    #rope: Rope|null = null
    readonly #plain: NineSlice
    readonly #plainCard: NineSlice
    readonly #small: TextLayout
    readonly #large: TextLayout
    readonly #edge: number
    #state: TabState = EMPTY
    #open = 0
    #pressed = false

    /**
     * Where everything lies for a state. The tab is `BASE_WIDTH` wide folded and grows, as it unfolds, to the
     * width its frames need (up to the screen): the frames keep that room whatever its current width. It is as
     * tall as its lines, its timer, its friezes with the texts and the lives they hold, and the button to leave.
     */
    #metrics(state: TabState): TabMetrics {
        const line = this.#small.lineHeight
        const columns = state.layout === "columns"
        const top = columns && state.entries.some(entry => entry.top !== "") ? line : 0
        const bottom = columns && state.entries.some(entry => entry.bottom !== "") ? line : 0
        const roomy = Math.max(BASE_WIDTH, this.ui.width - 2 * SCREEN_MARGIN)
        const full = Math.max(BASE_WIDTH, Math.min(roomy, friezeGroupWidth(state.layout, state.entries.length) + 2 * SIDE))
        const width = Math.round(BASE_WIDTH + (full - BASE_WIDTH) * ease(this.#open))
        const framesWidth = full - 2 * SIDE
        const framesHeight = FRIEZE_HEIGHT + 2 * CARD_PAD + top + bottom
        const lives = friezeLivesHeight(state.layout, state.entries, framesWidth)
        const box = { width: framesWidth, height: framesHeight, top, bottom, lives }
        const timerY = TOP + line + 2
        const friezeY = timerY + this.#large.lineHeight + 4
        const leaveY = friezeY + framesHeight + lives + 4
        const buttonWidth = Math.max(this.#small.widthOf(LEAVE_LABEL), this.#small.widthOf(SURE_LABEL)) + 2 * LEAVE_PAD_X
        const buttonHeight = line + 2 * LEAVE_PAD_Y
        const leaveBlock = state.leave === "" ? 0 : buttonHeight + 4
        return {
            width, height: leaveY + leaveBlock + this.#edge, box, timerY, friezeY, leaveY, buttonWidth, buttonHeight,
            friezeX: Math.floor((width - framesWidth) / 2),
        }
    }

    /** Is a point of the tab, in its coordinates, over the button to leave? */
    #overLeave(x: number, y: number): boolean {
        const state = this.#state
        if(state.leave === "") return false
        const layout = this.#metrics(state)
        const left = Math.floor((this.bounds.width - layout.buttonWidth) / 2)
        return x >= left && x < left + layout.buttonWidth && y >= layout.leaveY && y < layout.leaveY + layout.buttonHeight
    }

    /** The button to leave: dark brown on the paper, lighter under the pointer, under the frieze. */
    #paintLeave(painter: Painter, layout: TabMetrics, label: string): void {
        const looks = brownButtonLooks(this.theme)
        const left = Math.floor((this.bounds.width - layout.buttonWidth) / 2)
        const over = this.hovered && this.#overLeave(this.ui.pointerX - this.bounds.x, this.ui.pointerY - this.bounds.y)
        const look = this.#pressed ? looks.pressed : over ? looks.hovered : looks.normal
        look.draw(painter, left, layout.leaveY, layout.buttonWidth, layout.buttonHeight)
        painter.push()
        painter.setTint(this.theme.textColor)
        const text = this.#small
        text.draw(painter, label, left + Math.floor((layout.buttonWidth - text.widthOf(label)) / 2),
            layout.leaveY + Math.floor((layout.buttonHeight - text.lineHeight) / 2))
        painter.pop()
    }

    /** The text, in a color, centered across a width on a row. */
    #line(painter: Painter, layout: TextLayout, text: string, y: number, color: Color, width: number): void {
        if(text === "") return
        const fitted = layout.fit(text, width - 12)
        painter.push()
        painter.setTint(color)
        layout.draw(painter, fitted, Math.floor((width - layout.widthOf(fitted)) / 2), y)
        painter.pop()
    }

    #hoveredId(): string|null {
        const state = this.#state
        const layout = this.#metrics(state)
        const x = this.ui.pointerX - this.bounds.x - layout.friezeX
        const y = this.ui.pointerY - this.bounds.y - layout.friezeY
        return friezeHit(state.layout, state.entries, layout.box, x, y)
    }
}

/** Where everything lies in a tab, in virtual pixels from its top left. */
interface TabMetrics {
    readonly width: number
    readonly height: number
    readonly box: FriezeBox
    readonly timerY: number
    readonly friezeX: number
    readonly friezeY: number
    readonly leaveY: number
    readonly buttonWidth: number
    readonly buttonHeight: number
}

/** What a view of the tab shows. */
interface TabState {
    /** The text on the edge, seen while the tab is folded. */
    readonly edge: string

    /** The small text above the timer. */
    readonly info: string

    /** The large timer, empty when none runs. */
    readonly timer: string

    /** Is the time short, or the player lost: the texts are red. */
    readonly alarm: boolean

    /** The color the paper takes through its hue, none for the paper as it is. */
    readonly tint: Color|null

    readonly layout: FriezeLayout
    readonly entries: readonly FriezeEntry[]

    /** Where the limits between floors lie on the frieze, as shares of it from 0 to 1. */
    readonly ticks: readonly number[]

    /** The id of the player the pointer is over. */
    readonly hovered: string|null

    /** The text of the button to leave, none for no button. */
    readonly leave: string
}

/** How a tab is set up beyond its theme. */
export interface RaceTabOptions {
    /** The sprites, for the picture of the paper: a plain one is drawn until they are loaded. */
    readonly sprites?: UnitSprites|null

    /** How the players are laid out on its frieze, a line each by default. */
    readonly layout?: FriezeLayout

    /** Where it lies across the screen, the center by default. */
    readonly align?: RaceTabAlign

    /**
     * The texts above and under the frieze of a player. By default, those of the multiplayer: how many places
     * (halts and fights) the player went through above, its name under. One given replaces its default.
     */
    readonly labels?: {
        readonly top?: (id: string, player: DuelRacePlayer) => string
        readonly bottom?: (id: string, player: DuelRacePlayer) => string
    }

    /**
     * Are the lives of the players shown under their frames, full hearts and empty ones? By default when the
     * mode gives more than one life.
     */
    readonly lives?: boolean

    /** What the button to leave does, asked twice in a row to be sure: no button when none is given. */
    readonly onLeave?: () => void
}

/**
 * What a player of a race of duels reads over its run: the time left before the duels, the lives of everyone,
 * where they stand, and what happens to its duel and to the race. It only shows what the player tells it.
 *
 * @remarks
 * It hangs over the top of the screen by a small edge of paper, so it hides nothing of the game. Its place
 * across the screen is set by the game, which can move it as the screen under it changes.
 */
export class RaceTab {


    /** The text on its edge. */
    public get edge(): string { return this.#state.edge }

    /** Does it follow a race: then it is the one that holds the way out of the game. */
    public get active(): boolean { return this.#player !== null }

    /** The text of the button to leave, empty when it has none. */
    public get leaveLabel(): string { return this.#state.leave }

    /** Is its paper tinted red now: blinking while the timer runs, red for good for a player that lost? */
    public get red(): boolean { return this.#state.tint !== null }

    /** The players of its frieze as it shows them, for the tests. */
    public get entries(): readonly FriezeEntry[] { return this.#state.entries }

    /** The large timer, empty when none runs. */
    public get timer(): string { return this.#state.timer }

    /** The small text above the timer. */
    public get info(): string { return this.#state.info }

    /** The text of the banner: what happens to the duel and to the race. */
    public get banner(): string { return this.#banner }

    /** Is it shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        this.#layer.content.visible = visible
    }

    /** How far it is unfolded, from 0 (folded) to 1. */
    public get open(): number { return this.#view.open }

    /** Where it lies across the screen. */
    public get align(): RaceTabAlign { return this.#align }

    public set align(align: RaceTabAlign){
        if(align === this.#align) return
        this.#align = align
        this.#place()
    }

    /** How the players are laid out on its frieze. */
    public get layout(): FriezeLayout { return this.#layout }

    public set layout(layout: FriezeLayout){
        this.#layout = layout
    }

    /** The id of the player of the frieze under the pointer, none when it is over none. */
    public get hoveredId(): string|null { return this.#view.hoveredId }

    constructor(
        public readonly theme: Theme,
        ui: UiRoot,

        /** Who is in the lobby, as the lobby tells it: ids and names, to write the lives of each. */
        private readonly members: () => readonly RosterEntry[],
        options: RaceTabOptions = {},
    ){
        this.#layout = options.layout ?? "columns"
        this.#align = options.align ?? "center"
        this.#labels = {
            top: options.labels?.top ?? ((id, player) => String(player.others.progressOf(id)?.depth ?? 0)),
            bottom: options.labels?.bottom ?? (id => this.#nameOf(id)),
        }
        this.#showLives = options.lives
        this.#onLeave = options.onLeave ?? null
        this.#view = new TabView(theme, ui)
        this.#view.onLeave = () => this.requestLeave()
        this.#layer = ui.addLayer("race")
        this.#layer.content.visible = false
        this.#layer.content.add(this.#view)
        this.#place()
        const sprites = options.sprites
        sprites?.whenLoaded(() => {
            const paper = sprites.paper
            if(paper){
                this.#view.paper = paperFrame(paper, 1)
                this.#view.card = paperFrame(paper, 1, CARD_TINT)
            }
            this.#view.rope = sprites.rope
        })
    }


    /**
     * Ask to leave the game: the first time it asks to be sure, a second time within a few seconds leaves.
     * Nothing happens when it has no way to leave.
     */
    public requestLeave(): void {
        if(!this.#onLeave) return
        if(this.#sure > 0){
            this.#sure = 0
            this.#onLeave()
            return
        }
        this.#sure = LEAVE_CONFIRM_SECONDS
    }

    /** Show the race of a player, in place of the one shown. */
    public follow(player: DuelRacePlayer): void {
        this.detach()
        this.#player = player
        const { fighting, watching, duelOver } = player
        this.#observers.remove()
        this.#observers = new Scope(
            fighting.add(duel => this.#fight(duel)),
            watching.add(duel => this.#watch(duel)),
            duelOver.add(won => this.#over(won)),
            player.won.add(id => { this.#banner = `${this.#nameOf(id)} a gagné la course !` }),
            player.finished.add(() => { this.#banner = "Personne n'a gagné la course." }),
            player.eliminated.add(() => {
                this.#banner = "Tu es éliminé : tu regardes la suite."
                this.#lost = true
            }),
        )
        this.#banner = ""
        this.#lost = false
    }

    /** Stop showing the race. */
    public detach(): void {
        this.#observers.remove()
        this.#observers = new Scope()
        this.#player = null
        this.#banner = ""
        this.#lost = false
        this.#state = EMPTY
        this.#view.show(EMPTY)
    }

    /**
     * Write what the race says now, and let the tab slide: down while the pointer is over it, back up when
     * it is not.
     *
     * @param dt - The seconds since the last frame.
     */
    public frame(dt = 0): void {
        const player = this.#player
        if(!player){
            if(this.#state !== EMPTY) this.detach()
            return
        }
        this.#sure = Math.max(0, this.#sure - dt)
        const left = player.deadline.remaining()
        const seconds = left === null ? null : Math.ceil(left / 1000)
        const alarm = this.#lost || (left !== null && left <= ALARM_SECONDS * 1000)
        // It blinks red from the moment the timer starts, faster as the end comes. The phase is added up, so a
        // change of speed never makes it jump.
        if(left === null) this.#phase = 0
        else {
            const hertz = left <= LAST_SECONDS * 1000 ? BLINK_LAST : left <= ALARM_SECONDS * 1000 ? BLINK_FAST : BLINK_SLOW
            this.#phase += dt * hertz
        }
        const red = this.#lost || (left !== null && Math.floor(this.#phase * 2) % 2 === 0)
        const { entries, scale } = this.#entries(player)
        const hovered = this.#view.hoveredId
        const state: TabState = {
            edge: [seconds === null ? "" : `${seconds} s`, this.#banner].filter(part => part !== "").join(" · ")
                || "Course de duels",
            info: hovered !== null
                ? this.#describe(player, hovered)
                : seconds === null ? this.#banner || "Course de duels" : "Les autres arrivent dans",
            timer: seconds === null ? "" : `${seconds} s`,
            alarm,
            tint: red ? WARNING_TINT : null,
            layout: this.#layout,
            entries,
            ticks: floorTicks(scale),
            hovered,
            leave: this.#onLeave ? (this.#sure > 0 ? SURE_LABEL : LEAVE_LABEL) : "",
        }
        this.#state = state
        this.#view.show(state)
        // The tab grows with the texts of its friezes: what hangs out of the screen follows.
        if(this.#view.fullHeight !== this.#height){
            this.#height = this.#view.fullHeight
            this.#place()
        }
        this.#slide(dt)
    }


    readonly #layer: Layer
    readonly #view: TabView
    #layout: FriezeLayout
    #align: RaceTabAlign
    readonly #labels: { top(id: string, player: DuelRacePlayer): string, bottom(id: string, player: DuelRacePlayer): string }
    #height = 0
    readonly #showLives: boolean|undefined
    readonly #onLeave: (() => void)|null
    #sure = 0
    #player: DuelRacePlayer|null = null
    #observers = new Scope()
    #state: TabState = EMPTY
    #banner = ""
    #lost = false
    #phase = 0

    /** Put the tab where its alignment and its unfolding say. */
    #place(): void {
        const hidden = (1 - ease(this.#view.open)) * (this.#view.fullHeight - this.#view.edge)
        this.#layer.content.setSlot(this.#view, { x: this.#align, y: "start", offsetX: 0, offsetY: -Math.round(hidden) })
    }

    /** Move toward unfolded while the pointer is over it, toward folded while it is not. */
    #slide(dt: number): void {
        const view = this.#view
        const target = view.hovered ? 1 : 0
        const next = target > view.open
            ? Math.min(target, view.open + dt / SLIDE_SECONDS)
            : Math.max(target, view.open - dt / SLIDE_SECONDS)
        if(next === view.open) return
        view.open = next
        this.#place()
    }

    /**
     * The players on the frieze, where they stand on the map: the whole map when the race has a known end,
     * otherwise a window of floors that starts at the floor of the player furthest behind.
     */
    #entries(player: DuelRacePlayer): { entries: FriezeEntry[], scale: MapScale } {
        const members = this.members()
        const rows = members.map(member => {
            const progress = player.others.progressOf(member.id)
            return {
                member,
                position: progress ? mapPosition(progress) : 0,
                out: member.lost || player.lives.livesOf(member.id) === 0,
            }
        })
        const scale = mapScale(rows.filter(row => !row.out).map(row => row.position), player.floors)
        // The lives are shown when the mode gives several, unless the tab was told otherwise.
        const maxLives = (this.#showLives ?? player.maxLives > 1) ? player.maxLives : 0
        const entries = rows.map(({ member, position, out }) => ({
            id: member.id,
            color: out ? OUT_MARK : markColor(member.name),
            ratio: scaleRatio(position, scale),
            maxLives,
            lives: out ? 0 : player.lives.livesOf(member.id) ?? maxLives,
            top: this.#labels.top(member.id, player),
            bottom: this.#labels.bottom(member.id, player),
        }))
        return { entries, scale }
    }

    /** What is told of a player: its name, its lives and how far it went. */
    #describe(player: DuelRacePlayer, id: string): string {
        const lives = player.lives.livesOf(id)
        const progress = player.others.progressOf(id)
        const parts = [this.#nameOf(id)]
        if(lives === 0) parts.push("éliminé")
        else if(lives !== null) parts.push(`${lives} vie${lives > 1 ? "s" : ""}`)
        if(progress){
            parts.push(progress.rows > 0
                ? `étage ${progress.floor} · ligne ${Math.max(0, progress.layer + 1)}/${progress.rows}`
                : `étage ${progress.floor}`)
        }
        return parts.join(" · ")
    }

    #nameOf(id: string): string {
        // A player that left the game has no name any more, whoever it was.
        if(this.#player?.lives.isGone?.(id)) return "???"
        return this.members().find(member => member.id === id)?.name ?? id
    }

    #names(ids: readonly string[]): string {
        return ids.map(id => this.#nameOf(id)).join(", ")
    }

    #fight({ allies, opponents }: DuelFighting): void {
        this.#lost = false
        this.#banner = `Duel : ${this.#names(allies)} contre ${this.#names(opponents)}`
    }

    #watch({ sides }: DuelWatching): void {
        this.#banner = `Tu regardes : ${sides.map(side => this.#names(side)).join(" contre ")}`
    }

    #over(won: boolean|null): void {
        if(won === null) this.#banner = "Duel terminé."
        else this.#banner = won ? "Duel gagné !" : "Duel perdu."
        this.#lost = won === false
    }
}

/** What the tab shows while it follows nothing. */
const EMPTY: TabState = {
    edge: "", info: "", timer: "", alarm: false, tint: null, layout: "columns", entries: [], ticks: [], hovered: null,
    leave: "",
}
