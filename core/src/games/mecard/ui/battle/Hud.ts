import type { InputFrame } from "../../../../engine/input"
import { Color } from "../../../../engine/math"
import { Box, Button, Hand, Label, NineSlice, Panel, Paragraph, Scroll } from "../../../../engine/ui"
import type { Component, Layer, Theme } from "../../../../engine/ui"
import { concat, joinText } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import { CARTE, UNIT } from "../../sim/base/keywords"
import { deckName } from "../../sim/run/deckName"
import type { Battle } from "../../sim/battle/Battle"
import type { Team } from "../../sim/battle/Team"
import type { Unit } from "../../sim/battle/Unit"
import type { Card } from "../../sim/card/Card"
import type { CardNode } from "../../sim/card/CardNode"

import { statLines } from "../describe"
import type { Draft } from "./Draft"
import type { ImagePath } from "../../../../engine/assets"
import { battleGrid, GAP, sideWidth } from "../hud/BattleGrid"
import type { BattleGrid, UiRect } from "../hud/BattleGrid"
import { CardFlight, flightSize } from "../hud/CardFlight"
import { CARD_LOOKS, CardView } from "../hud/CardView"
import type { CardPlace } from "../hud/CardView"
import { ChainStrip, LINK_ROOM, stripOf, stripOfView } from "../hud/ChainStrip"
import type { StripCard } from "../hud/ChainStrip"
import { CardChain } from "../../sim/card/CardChain"
import { DeckPile, PILE_HEIGHT } from "../hud/DeckPile"
import { DetailBox } from "../hud/DetailBox"
import { processRow, processText } from "../hud/ProcessView"
import { heartsRow, heartText } from "../hud/HeartView"
import { HoverPanel } from "../hud/HoverPanel"
import { TurnArrow } from "../hud/TurnArrow"
import { colorOf } from "../look/colors"
import { CHOSEN_TEXT, DIM_TEXT, STAT_DOWN, STAT_UP, WARNING_TEXT } from "../look/theme"
import { decksOf } from "./BattleScene"
import type { BattleScene, Flight, SceneDeck } from "./BattleScene"
import { BagView, SLOT_SIZE } from "../hud/BagView"
import { countText, countTold, stacked, stackUsesText } from "../hud/stacks"
import { ThingView } from "../hud/ThingView"
import type { Carried } from "../../sim/usable/Usable"
import { described, usableText } from "../../sim/halt/subs/shown"
import { withPicture } from "../hud/UnitPicture"
import type { UnitSprites } from "../look/UnitSprites"

/** How many hearts fit beside the name of a unit in the initiative: more go on a line of their own. */
const HEARTS_BESIDE_NAME = 12

/** Where the game stands, for the interface. */
export type Mode = "planning"|"playing"

/** The size the scroll of the units asks for: it takes whatever room its panel gives it. */
const SCROLL_SIZE = 40

/** The space between two cards of the hand when there is room, in virtual pixels. */
const HAND_GAP = 2

/** How many lines of the log the journal keeps. */
const LOG_LINES = 40

/** How many lines of text the zone of what is hovered shows without scrolling. */
const INFO_LINES = 3

/** What it says while the round is not the players' to start. */
const WAITING = "En attente..."

/** What the card info says while nothing is hovered. */
const HINT = ["Clique une ", CARTE, " de ta main pour la poser dans ta chaîne, une ", CARTE, " de ta chaîne pour la reprendre. Survole pour voir ce qu'elle fait, clic droit pour figer ce texte."]

/** The color behind a unit highlighted in the panels. */
const HIGHLIGHT = new Color(0.3, 0.45, 0.75, 0.55)

/** How fast the list of the units goes to the unit followed, in virtual pixels per second. */
const FOLLOW_SPEED = 240

/** The color behind the unit selected, in the panels. */
const SELECTED = new Color(0.45, 0.38, 0.15, 0.55)

/** What the card info says while nothing is hovered, for a unit the players do not plan. */
const LOOK_HINT = ["Survole une ", CARTE, " pour voir ce qu'elle fait, une ", UNIT, " pour la mettre en évidence. Clic droit pour figer ce texte."]

/** The game, as the interface reads it and acts on it. */
export interface HudHost {
    readonly battle: Battle

    /** The battle as it is shown: where the panels read the hearts, the statuses, who stands. */
    readonly scene: BattleScene

    /** The pictures of the units, on the left of what tells about each. */
    readonly sprites: UnitSprites
    readonly mode: Mode

    /** The team whose chains it sees whole, and whose units the players plan. */
    readonly viewpoint: Team

    /** How deep the run went. */
    readonly depth: number

    /** May the players still launch the round, or say they are ready? */
    readonly launchable: boolean

    /** May the round being shown be skipped? */
    readonly skippable: boolean

    /** Does the button of the round only say the players are ready? */
    readonly saysReady: boolean

    readonly drafts: ReadonlyMap<Unit, Draft>

    /** The unit whose chain is being put together, none when none is. */
    readonly active: Unit|null

    /** What happened lately, the latest last. */
    readonly log: readonly Text[]

    /** Why the round cannot start, or why the last click did nothing, none when all is well. */
    readonly warning: Text|null

    /** The unit the pointer is over, in the arena or in the panels, none when none. */
    readonly highlighted: Unit|null

    /** Hear that the pointer came over a root of the chain of a unit, or left it. */
    hoverRoot(unit: Unit, index: number, over: boolean): void

    /** Hear that the pointer came over a card of the hand, or left it. */
    hoverCard(card: Card, over: boolean): void

    /** May the players not plan a unit? */
    isLocked(unit: Unit): boolean

    /** Hear that the pointer came over what stands for a unit in the panels, or left it. */
    hoverUnit(unit: Unit, over: boolean): void
}

/** What the players do on the panels. */
export interface HudActions {
    /** Select a unit: a unit of the players to put its chain together, any other to look at its chain. */
    choose(unit: Unit): void

    /** Place a card of the hand where it fits best, or lift it, or put it back down. */
    pick(card: Card): void

    /** Put the lifted card into an empty slot of a placed card. */
    plug(node: CardNode, slot: number): void

    /** Take a placed card back to the hand. */
    remove(node: CardNode): void

    /** Choose to use what lies at a place of the belt of the unit planned, or not to use it anymore. */
    toggleUsable(index: number): void

    launch(): void
    skip(): void
}

/** What the panels do before a screen tied them. */
const NO_ACTIONS: HudActions = {
    choose: () => {}, pick: () => {}, plug: () => {}, remove: () => {}, toggleUsable: () => {},
    launch: () => {}, skip: () => {},
}

/**
 * The interface around the arena, in the zones of a {@link battleGrid}, each with its place at every phase:
 * the stats of the unit selected and the journal on the left, its chain, its hand and what is hovered under
 * the arena, the units on the right, its decks under them. Everything is done by clicking cards: no button
 * but the one of the round.
 *
 * @remarks
 * It is built again whole each time the game changes: a few dozen widgets, and only when the player acts
 * or a step plays, never every frame. What the pointer hovers only changes the text of the card info, set
 * in place by {@link Hud.showInfo}, so hovering never rebuilds the widgets under the pointer.
 */
export class Hud {


    /** What the players do goes there, nothing before the screen ties it. */
    public actions: HudActions = NO_ACTIONS


    constructor(
        public readonly theme: Theme,
        public readonly layer: Layer,
        public readonly host: HudHost,

        /** The size of the interface, in virtual pixels, read at each build. */
        public readonly size: () => { readonly width: number, readonly height: number },
    ){
        this.#units = new Scroll(theme, { width: SCROLL_SIZE, height: SCROLL_SIZE })
        this.#details = new Scroll(theme, { width: SCROLL_SIZE, height: SCROLL_SIZE })
        this.#journal = new Scroll(theme, { width: SCROLL_SIZE, height: SCROLL_SIZE })
        this.#chainScroll = new Scroll(theme, { axis: "horizontal", width: SCROLL_SIZE, height: SCROLL_SIZE })
        this.#info = new DetailBox(theme, { color: DIM_TEXT, scrolled: true })
    }


    /** Build the interface again from the game. */
    public refresh(): void {
        const content = this.layer.content
        for(const child of [...content.children]) content.remove(child)
        this.#info.tell(null)
        this.#standsFor.clear()
        this.#lit = null
        this.#highlight = NineSlice.flat(this.theme.white, HIGHLIGHT)
        this.#selected = NineSlice.flat(this.theme.white, SELECTED)
        this.#piles.clear()
        this.#landing = null
        const grid = this.#grid()
        this.#place(this.#panel(this.#selectedStats()), grid.stats)
        const belted = this.#draft()
        if(belted && belted.unit.usables.length > 0) this.#place(this.#panel(this.#belt(belted)), grid.usables)
        this.#place(this.#panel(this.#journalled()), grid.journal)
        this.#place(this.#panel(this.#right()), grid.units)
        this.#place(this.#panel(this.#told()), grid.info)
        this.#addSelected(grid)
        this.#addFlight()
    }

    /** The room the arena is drawn in. */
    public arenaRoom(): UiRect {
        return this.#grid().map
    }

    /** Light up what stands for a unit in the panels, or nothing. Lighting the lit one does nothing. */
    public highlight(unit: Unit|null): void {
        if(unit === this.#lit) return
        const unlit = this.#lit ? this.#standsFor.get(this.#lit) : undefined
        const lit = unit ? this.#standsFor.get(unit) : undefined
        // A unit no more highlighted keeps the frame of the selection when it is selected.
        const back = this.#lit === this.host.active ? this.#selected : null
        for(const panel of unlit ?? []) panel.background = back
        for(const panel of lit ?? []) panel.background = this.#highlight
        this.#lit = unit
    }

    /** Have the list of the units go to a unit, little by little, until it is in sight. */
    public follow(unit: Unit): void {
        this.#followed = unit
        this.#followedAt = this.#units.offset
    }

    /** Go on toward the unit followed, once laid out. The player scrolling the list stops it. */
    public frame(dt: number): void {
        const scroll = this.#units
        const panel = this.#followed ? this.#standsFor.get(this.#followed)?.[0] : undefined
        if(!panel || scroll.offset !== this.#followedAt){
            this.#followed = null
            return
        }
        const { y: top, height } = panel.bounds
        // Built again since the last layout: it has no place yet.
        if(height === 0) return
        const room = scroll.bounds.height
        const from = scroll.offset
        const target = top < from ? top : top + height > from + room ? top + height - room : from
        const step = Math.max(1, Math.round(FOLLOW_SPEED * dt))
        const offset = from + Math.sign(target - from) * Math.min(step, Math.abs(target - from))
        scroll.offset = offset
        this.#followedAt = scroll.offset
        // At the target, or as far as the list goes.
        if(scroll.offset === target || scroll.offset !== offset) this.#followed = null
    }

    /** Show a text about what is hovered, in its zone, or the hint when none. */
    public showInfo(text: Text|null): void {
        this.#info.tell(text)
    }

    /** Let the text about what is hovered read a frame of the input, while the panel holding it is shown. */
    public readInfo(input: InputFrame, pointerX: number, pointerY: number): void {
        this.#info.frame(input, pointerX, pointerY)
    }


    /** The text about what is hovered, kept from one build to the next, locked or not. */
    readonly #info: DetailBox

    /**
     * The scroll of the units, kept from one build to the next with only its content replaced, so it stays
     * where the player scrolled it while the round plays.
     */
    readonly #units: Scroll

    /** The scroll of the stats of the unit selected, kept the same way. */
    readonly #details: Scroll

    /** The scroll of the journal, kept the same way. */
    readonly #journal: Scroll

    /** The scroll of the chain of the unit selected, kept the same way. */
    readonly #chainScroll: Scroll

    /** The unit the list of the units goes to, none when none. */
    #followed: Unit|null = null

    /** Where the list stood when it last moved toward it. */
    #followedAt = 0

    /** How many lines the log held at the last build: the journal follows it when it grows. */
    #logRead = 0

    /** How many cards the chain being put together held at the last build: its scroll follows it. */
    #chainRead = 0

    /** The panels standing for each unit, lit up while it is highlighted. */
    readonly #standsFor = new Map<Unit, HoverPanel[]>()

    /** The unit lit up, none when none. */
    #lit: Unit|null = null

    /** The piles shown, by the place of their deck. */
    readonly #piles = new Map<number, Component>()

    /** Where the card being drawn lands, none when none is. */
    #landing: Component|null = null

    /** The frame behind what is lit up. */
    #highlight: NineSlice|null = null

    /** The frame behind what stands for the unit selected. */
    #selected: NineSlice|null = null

    /**
     * A panel standing for a unit: its hover highlights the unit, a click on it selects the unit, and it
     * lights up when the unit is highlighted or selected.
     */
    #standingFor(unit: Unit, content: Component): HoverPanel {
        const selected = unit === this.host.active ? this.#selected : null
        const panel = new HoverPanel(this.theme, { background: selected, padding: 1 })
        panel.content = content
        panel.onHover = over => this.host.hoverUnit(unit, over)
        panel.onPick = () => this.actions.choose(unit)
        const panels = this.#standsFor.get(unit) ?? []
        panels.push(panel)
        this.#standsFor.set(unit, panels)
        return panel
    }

    //// The zones ////

    /** Where the zones lie: the rows under the arena are as tall as what they show. */
    #grid(): BattleGrid {
        const { width, height } = this.size()
        const { font, panel, scrollbar, textScale } = this.theme
        // The label, the bag wrapping its slots in the width of the zone, and the padding of the panel.
        const frame = this.host.sprites.bag?.border.left ?? 0
        const inside = sideWidth(width) - 2 * (panel.padding + frame)
        const count = stacked(this.#draft()?.unit.usables ?? [], carried => carried.usable).length
        const rows = Math.ceil(count / Math.max(1, Math.floor(inside / SLOT_SIZE)))
        const beltHeight = font.lineHeight * textScale + 1 + rows * SLOT_SIZE + 2 * frame + 2 * panel.padding + 2
        return battleGrid(width, height, {
            chain: CARD_LOOKS.chain.height + LINK_ROOM + scrollbar.width,
            hand: PILE_HEIGHT,
            usables: this.#draft()?.unit.usables.length ? beltHeight : 0,
            info: INFO_LINES * font.lineHeight * textScale + 2 * (panel.padding + this.#info.padding),
        })
    }

    /** Lay a component over a zone. */
    #place(component: Component, zone: UiRect): void {
        component.fixedSize = { width: zone.right - zone.left, height: zone.bottom - zone.top }
        this.layer.content.add(component, { x: "start", y: "start", offsetX: zone.left, offsetY: zone.top })
    }

    /** A panel around what a zone shows. */
    #panel(content: Component): Panel {
        const panel = new Panel(this.theme)
        panel.content = content
        return panel
    }

    /** The card being drawn, over everything, from the pile built with the hand to its place in it. */
    #addFlight(): void {
        const { scene, sprites } = this.host
        const { flight } = scene
        const place = this.#landing
        if(!flight || !place) return
        const pile = this.#piles.get(flight.deck) ?? null
        const share = (): number => flight.share
        const back = sprites.cardBack(flight.deck)
        const view = new CardFlight(this.theme, flight.card, back, pile, place, share)
        view.deck = flight.deck < 0 ? null : flight.deck
        view.fixedSize = flightSize(this.size())
        this.layer.content.add(view, { x: "start", y: "start" })
    }

    //// The unit selected ////

    /** The draft of the unit selected, none when it is not being planned. */
    #draft(): Draft|undefined {
        const { active, drafts, mode } = this.host
        return active && mode !== "playing" ? drafts.get(active) : undefined
    }

    /**
     * The title of the chain of the unit selected, always in sight, then its stats, scrolling in the room
     * left.
     */
    #selectedStats(): Component {
        const column = new Box("column", { gap: 3 })
        const { active, warning, mode } = this.host
        const draft = this.#draft()
        if(draft){
            const title = `Chaîne de ${draft.unit.name} : ${draft.chain.size}/${draft.unit.stats.chainSize.value}`
            column.add(this.#label(title, colorOf(draft.unit)))
        }
        if(warning && mode !== "playing") column.add(this.#paragraph(warning, WARNING_TEXT))
        this.#details.parent?.remove(this.#details)
        this.#details.content = active ? this.#stats(active) : null
        column.add(this.#details, { grow: 1 })
        return column
    }

    /** The log, scrolled to its last line each time it grows. */
    #journalled(): Component {
        const lines = new Box("column", { gap: 3 })
        const { log } = this.host
        for(const line of log.slice(-LOG_LINES)) lines.add(this.#paragraph(line, DIM_TEXT))
        this.#journal.parent?.remove(this.#journal)
        this.#journal.content = lines
        if(log.length !== this.#logRead) this.#journal.scrollToEnd()
        this.#logRead = log.length
        const column = new Box("column", { gap: 3 })
        column.add(this.#label("Journal", CHOSEN_TEXT))
        column.add(this.#journal, { grow: 1 })
        return column
    }

    /** The text about what is hovered, or the hint fitting what the player may do. */
    #told(): Component {
        this.#info.hint = this.#draft() ? HINT : LOOK_HINT
        this.#info.parent?.remove(this.#info)
        return this.#info
    }

    /**
     * The belt of the unit planned: a button for each thing it carries, lit when it is to be used at the
     * start of the execution. The hover of one says what it does.
     */
    #belt(draft: Draft): Component {
        const column = new Box("column", { gap: 1 })
        column.add(this.#label("Utilisables (au début de l'exécution) :", DIM_TEXT))
        const entries = draft.unit.usables.map((carried, index) => ({ carried, index }))
        const views = stacked(entries, entry => entry.carried.usable).map(({ first, members }) => {
            const { usable } = first.carried
            const left = members.reduce((sum, entry) => sum + entry.carried.charges, 0)
            const full = members.length * (usable.charges ?? 1)
            const view = this.#thing(usable.icon, stackUsesText(usable, left, full), countTold(usableText(usable), members.length))
            const active = members.filter(entry => draft.used.has(entry.index)).length
            view.lit = active > 0
            view.active = active
            view.spent = members.every(entry => entry.carried.spent)
            // A click uses one more of the stack, and once all that can be are used, none any more.
            view.onPick = () => {
                const next = members.find(entry => !draft.used.has(entry.index) && !entry.carried.spent)
                if(next) this.actions.toggleUsable(next.index)
                else for(const entry of members) if(draft.used.has(entry.index)) this.actions.toggleUsable(entry.index)
            }
            return view
        })
        column.add(this.#bag(views), { align: "start" })
        return column
    }

    /** The usables of a belt as pictures, the same ones in one, their charges added. */
    #usableViews(belt: readonly Carried[]): ThingView[] {
        return stacked(belt, carried => carried.usable).map(({ first, members }) => {
            const { usable } = first
            const left = members.reduce((sum, carried) => sum + carried.charges, 0)
            const full = members.length * (usable.charges ?? 1)
            return this.#thing(usable.icon, stackUsesText(usable, left, full), countTold(usableText(usable), members.length))
        })
    }

    /** An item or a usable as its picture with its uses left, told on hover, as in the journey. */
    #thing(icon: ImagePath, uses: string|null, told: Text): ThingView {
        const view = new ThingView(this.theme, this.host.sprites, icon, uses)
        view.onHover = over => this.showInfo(over ? told : null)
        return view
    }

    /** Things in a bag, to add to a column aligned at its start so the bag wraps at the width of the column. */
    #bag(things: readonly Component[]): BagView {
        return new BagView(this.theme, things, this.host.sprites.bag)
    }

    /**
     * The stats of the unit selected, read from its attributes: a stat a modifier changed shows in green
     * above its base, in red below, its base after it. Then its items and its statuses.
     */
    #stats(unit: Unit): Component {
        const column = new Box("column", { gap: 1 })
        column.add(this.#label(`Stats de ${unit.name}`, colorOf(unit)))
        for(const stat of statLines(unit)){
            const row = new Box("row", { gap: 2 })
            row.add(this.#label(stat.name, DIM_TEXT), { grow: 1 })
            const color = stat.change === "up" ? STAT_UP : stat.change === "down" ? STAT_DOWN : undefined
            row.add(this.#label(stat.value, color))
            if(stat.base) row.add(this.#label(`(${stat.base})`, DIM_TEXT))
            column.add(row)
        }
        if(unit.items.length > 0){
            column.add(this.#label("Objets", DIM_TEXT))
            const items = stacked(unit.items, item => item).map(({ first, members }) => {
                return this.#thing(first.icon, countText(members.length), countTold(described(first, first), members.length))
            })
            column.add(this.#bag(items), { align: "start" })
        }
        // The usables of the unit being planned lie in their own zone, to use.
        if(unit.usables.length > 0 && !this.#draft()){
            column.add(this.#label("Utilisables", DIM_TEXT))
            column.add(this.#bag(this.#usableViews(unit.usables)), { align: "start" })
        }
        const shown = this.host.scene.of(unit)?.statuses ?? []
        const statuses = [...unit.statuses.values()].filter(status => shown.includes(status.type))
        if(statuses.length > 0) column.add(this.#paragraph(["Statuts : ", ...joinText(statuses, ", ")], DIM_TEXT))
        return column
    }



    //// Every chain ////

    /**
     * The units in the order they play, from top to bottom, an arrow between two, each with its hearts and
     * its chain, in a scroll: the round and its phase above, the button below.
     */
    #right(): Component {
        const { battle, scene, mode, drafts, viewpoint, depth } = this.host
        const phase = battle.phase === "over" ? "fin" : mode === "planning" ? "préparation" : "exécution"
        const panel = new Box("column", { gap: 3 })
        panel.add(this.#label(`Profondeur ${depth} · Round ${battle.round} · ${phase}`, CHOSEN_TEXT))
        const column = new Box("column", { gap: 1, align: "stretch" })
        scene.order.filter(unit => scene.alive(unit)).forEach((unit, index) => {
            const shown = scene.of(unit)
            if(index > 0) column.add(new TurnArrow(this.theme), { align: "center" })
            const ally = unit.team === viewpoint
            const draft = mode === "planning" && ally ? drafts.get(unit) : undefined
            const planned = draft?.chain.view(false).map(view => stripOfView(view))
            const roots = planned ?? this.#shownRoots(unit)
            const head = new Box("row", { gap: 2, align: "center" })
            const steps = mode === "playing" ? ` [${shown?.steps ?? 0}]` : ""
            head.add(this.#label(`${unit.name}${steps}`, colorOf(unit)))
            const hearts = this.#hearts(unit)
            const crowded = unit.hearts.maxHearts > HEARTS_BESIDE_NAME
            if(!crowded) head.add(hearts)
            const processes = shown?.processes ?? []
            if(processes.length > 0){
                const lit = scene.litProcess?.unit === unit ? scene.litProcess.process : null
                head.add(processRow(this.theme, this.host.sprites, processes, (process, over) => {
                    this.host.hoverUnit(unit, over)
                    this.showInfo(over ? processText(process) : null)
                }, lit))
            }
            const statuses = (shown?.statuses ?? []).join(", ")
            if(statuses) head.add(this.#label(statuses, DIM_TEXT))
            const block = new Box("column", { gap: 1 })
            block.add(head)
            if(crowded) block.add(hearts)
            block.add(this.#showsHand(unit)
                ? this.#openHand(unit, "mini")
                : this.#looked(unit, roots, "mini"))
            column.add(this.#standingFor(unit, withPicture(this.host.sprites, unit.sprite, block)))
        })
        this.#units.parent?.remove(this.#units)
        this.#units.content = column
        panel.add(this.#units, { grow: 1 })
        panel.add(this.#roundControl())
        return panel
    }

    /** What the round is at: the button of the players, or that it is another's to start. */
    #roundControl(): Component {
        const { mode, launchable, skippable, saysReady } = this.host
        if(mode === "planning"){
            if(!launchable) return this.#label(WAITING, DIM_TEXT)
            const word = saysReady ? "Prêt" : "Lancer le round"
            return this.#button(word, () => this.actions.launch(), CHOSEN_TEXT)
        }
        if(skippable) return this.#button("Passer la fin du round", () => this.actions.skip())
        return this.#label(WAITING, DIM_TEXT)
    }

    /**
     * The chain of a unit as the screen shows it: as it is being read while a round plays, what it read
     * greyed out and what is being looked at marked, and as it was committed otherwise.
     */
    #shownRoots(unit: Unit): StripCard[] {
        const { battle, mode, scene, viewpoint } = this.host
        const hidden = unit.team !== viewpoint
        const shown = mode === "playing" ? scene.of(unit)?.chain : undefined
        if(!shown) return (battle.planOf(unit)?.view(hidden) ?? []).map(view => stripOfView(view))
        const lit = scene.litCards?.unit === unit ? scene.litCards : null
        const marks = { cursor: shown.cursor, lit }
        return new CardChain(shown.cards).view(hidden).map(view => stripOfView(view, marks))
    }

    /**
     * The chain of a unit to look at, not to change: a click on a card selects the unit, and the hover of a
     * root shows its preview and highlights the unit, since its cards take the hover from what stands for it.
     */
    #looked(unit: Unit, roots: readonly StripCard[], place: CardPlace): Component {
        if(roots.length === 0) return this.#label("(rien)", DIM_TEXT)
        return new ChainStrip(this.theme, roots, place, {
            pick: () => this.actions.choose(unit),
            plug: () => {},
            canPlug: () => false,
            hoverRoot: (index, over) => {
                this.host.hoverRoot(unit, index, over)
                this.host.hoverUnit(unit, over)
            },
            deckOf: unit.decks.homeTeller(),
            cross: this.host.sprites.invalidCard,
        })
    }


    //// The hand and after ////

    /**
     * Lay out the zones of the unit selected: its chain, its hand and its decks. Its chain can be changed
     * only while it is planned. Its hand shows while it is planned, drawing, or playing for the team of the
     * screen, and to a player who plays it as an enemy.
     */
    #addSelected(grid: BattleGrid): void {
        const { active, mode, viewpoint, scene } = this.host
        const unit = scene.drawer ?? active
        this.#chainScroll.parent?.remove(this.#chainScroll)
        this.#chainScroll.content = null
        if(!unit) return
        this.#place(this.#heldDecks(unit, grid.decks), grid.decks)
        const draft = this.#draft()
        if(scene.drawer){
            this.#place(this.#drawing(scene.drawer, scene.flight), grid.hand)
        } else if(draft){
            // One teller for both: the copies of a card share the decks they came from between them.
            const deckOf = draft.unit.decks.homeTeller()
            if(draft.chain.size > this.#chainRead) this.#chainScroll.scrollToEnd()
            this.#chainRead = draft.chain.size
            this.#chainScroll.content = this.#chain(draft, deckOf)
            this.#place(this.#hand(draft, deckOf), grid.hand)
        } else if(this.#showsHand(unit)){
            this.#place(this.#openHand(unit, "hand"), grid.hand)
        } else {
            this.#chainScroll.content = this.#looked(unit, this.#shownRoots(unit), "chain")
            if(mode === "playing" && unit.team === viewpoint) this.#place(this.#drawing(unit, null), grid.hand)
        }
        this.#place(this.#chainScroll, grid.chain)
    }

    /**
     * How many cards a unit holds, out of how many, for a hand that is shown, then its decks, in the room of
     * the zone the count leaves.
     */
    #heldDecks(unit: Unit, zone: UiRect): Component {
        const row = new Box("row", { gap: GAP, align: "center" })
        const count = this.#shownHandSize(unit)
        let room = zone.right - zone.left
        if(count !== null){
            const label = this.#label(`${count}/${unit.stats.handSize.value}`, DIM_TEXT)
            room -= label.measure(Infinity).preferredWidth + GAP
            row.add(label)
        }
        row.add(this.#decks(unit, room))
        return row
    }

    /** How many cards the hand of a unit shows, none when it is not shown. */
    #shownHandSize(unit: Unit): number|null {
        const { mode, scene, viewpoint } = this.host
        if(scene.drawer === unit || (mode === "playing" && unit.team === viewpoint)){
            const cards = scene.of(unit)?.hand.length ?? 0
            return scene.flight ? cards - 1 : cards
        }
        const draft = this.#draft()
        if(draft) return draft.available.length
        return this.#showsHand(unit) ? unit.hand.length : null
    }

    /** The hand of a unit as it fills up, the card on its way, if one is, keeping its place. */
    #drawing(unit: Unit, flight: Flight|null): Component {
        const cards = this.host.scene.of(unit)?.hand ?? []
        const hand = new Hand({ gap: HAND_GAP })
        const deckOf = unit.decks.homeTeller()
        cards.forEach((card, index) => {
            const view = new CardView(this.theme, card, "hand")
            view.deck = deckOf(card)
            view.onHover = over => this.#tellCard(card, over)
            if(flight && index === cards.length - 1){
                view.ghost = true
                this.#landing = view
            }
            hand.add(view)
        })
        return hand
    }

    /** How many cards each deck of a unit holds as it is shown: the scene lags behind only while it plays. */
    #shownDecks(unit: Unit): { readonly decks: readonly SceneDeck[], readonly cursor: number } {
        const { mode, scene } = this.host
        const shown = mode === "planning" && !scene.drawer ? null : scene.of(unit)
        return shown ?? { decks: decksOf(unit), cursor: unit.decks.cursor }
    }

    /**
     * The decks of a unit, each as a pile as large as a card, with the back of its deck: side by side,
     * overlapping when they pass the room given, in virtual pixels. The hover of one says how many cards
     * it holds.
     */
    #decks(unit: Unit, room: number): Component {
        const { decks, cursor } = this.#shownDecks(unit)
        const hand = new Hand({ gap: 1 })
        decks.forEach(({ pile, discard }, index) => {
            const next = decks.length > 1 && index === cursor
            const view = new DeckPile(this.theme, this.host.sprites.cardBack(index), pile, next)
            const name = deckName(index, decks.length)
            view.onHover = over => this.showInfo(over ? concat(name, ` : ${pile} `, CARTE.as("cartes"), `, ${discard} en défausse.`) : null)
            this.#piles.set(index, view)
            hand.add(view)
        })
        const { preferredWidth, preferredHeight } = hand.measure(Infinity)
        hand.fixedSize = { width: Math.min(preferredWidth, room), height: preferredHeight }
        return hand
    }

    /**
     * Does a unit show its hand rather than its chain? During the preparation, an enemy a player plays, or
     * an ally the players may not plan, greyed out, until it commits:
     * its chain stays hidden until the reveal, and its hand, face up, tells exactly what it can play.
     */
    #showsHand(unit: Unit): boolean {
        const { battle, mode, viewpoint } = this.host
        if(mode !== "planning" || unit.controller !== "player") return false
        const lockedAlly = this.host.isLocked(unit) && !battle.planOf(unit)
        return unit.team !== viewpoint || lockedAlly
    }

    /**
     * The hearts of a unit in a row: the hover of one says what it is, and highlights the unit, as the
     * block it is in does.
     */
    #hearts(unit: Unit): Component {
        const { scene } = this.host
        const hearts = scene.of(unit)?.hearts ?? unit.hearts.all
        const lit = scene.litHeart?.unit === unit ? scene.litHeart.indexes : []
        return heartsRow(this.theme, hearts, (heart, over) => {
            this.host.hoverUnit(unit, over)
            this.showInfo(over ? heartText(heart) : null)
        }, lit)
    }

    /** The hand of a unit, face up: a click on a card selects the unit, and its hover highlights it. */
    #openHand(unit: Unit, place: CardPlace): Component {
        if(unit.hand.length === 0) return this.#label("(main vide)", DIM_TEXT)
        const row = new Hand({ gap: place === "mini" ? 1 : HAND_GAP })
        const deckOf = unit.decks.homeTeller()
        for(const card of unit.hand){
            const view = new CardView(this.theme, card, place)
            view.deck = deckOf(card)
            view.dimmed = this.host.isLocked(unit)
            view.onPick = () => this.actions.choose(unit)
            view.onHover = over => {
                this.host.hoverUnit(unit, over)
                this.#tellCard(card, over)
            }
            row.add(view)
        }
        return row
    }

    /** Say what a card does while the pointer is over it. */
    #tellCard(card: Card, over: boolean): void {
        this.showInfo(over ? concat(card, " : ", card.description) : null)
    }

    /** The chain being put together, its cards linked to what they take, or a word when it is empty. */
    #chain(draft: Draft, deckOf: (card: Card) => number|null): Component {
        if(draft.roots.length === 0){
            const empty = this.#label("Ta chaîne est vide : clique ta main.", DIM_TEXT)
            const width = empty.measure(Infinity).preferredWidth
            empty.fixedSize = { width, height: CARD_LOOKS.chain.height + LINK_ROOM }
            return empty
        }
        // Each card of the strip finds its node back, to take it back or plug into it.
        const nodes = new Map<StripCard, CardNode>()
        const roots = draft.roots.map(root => stripOf(root, nodes))
        const nodeOf = (strip: StripCard): CardNode => {
            const node = nodes.get(strip)
            if(!node) throw new Error("A card of the strip has no node. Build the strip with stripOf.")
            return node
        }
        return new ChainStrip(this.theme, roots, "chain", {
            pick: strip => this.actions.remove(nodeOf(strip)),
            plug: (strip, slot) => this.actions.plug(nodeOf(strip), slot),
            canPlug: (strip, slot) => draft.canPlug(nodeOf(strip), slot),
            hoverRoot: (index, over) => this.host.hoverRoot(draft.unit, index, over),
            deckOf,
        })
    }

    /**
     * The cards of the hand not placed yet, held as a hand: overlapping when they are too many for its zone,
     * the one pointed at shown whole.
     */
    #hand(draft: Draft, deckOf: (card: Card) => number|null): Component {
        const hand = new Hand({ gap: HAND_GAP })
        for(const card of draft.available){
            const view = new CardView(this.theme, card, "hand", card === draft.lifted)
            view.deck = deckOf(card)
            view.onPick = () => this.actions.pick(card)
            view.onHover = over => this.host.hoverCard(card, over)
            hand.add(view)
        }
        return hand
    }

    #paragraph(text: Text, color: Color): Paragraph {
        return new Paragraph(this.theme, text, { color, onLink: this.#info.hearLink })
    }

    #label(text: string, color?: Color): Label {
        return new Label(this.theme, text, color ? { color } : {})
    }

    #button(text: string, activate: () => void, color?: Color): Button {
        const button = new Button(this.theme, color ? this.#label(text, color) : text)
        button.onActivate = activate
        return button
    }
}
