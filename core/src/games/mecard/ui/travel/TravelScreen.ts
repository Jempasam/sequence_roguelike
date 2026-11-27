import { FRAME_THICKNESS } from "../look/wood"
import type { Wood } from "../look/wood"
import { AssetError } from "../../../../engine/assets"
import type { Assets } from "../../../../engine/assets"
import type { Visual } from "../../sim/base/Visual"
import type { InputFrame } from "../../../../engine/input"
import { Color } from "../../../../engine/math"
import {
    AnimationChain, Box, Bubble, Button, Choice, ChoiceOption, FrameClock, instant, Label, NineSlice, OverflowContainer,
    Panel, Paragraph, Rect, Scroll, Stack, Tabs,
} from "../../../../engine/ui"
import type { ChoiceStep, Component, Layer, ParagraphOptions, Theme, UiRoot } from "../../../../engine/ui"
import type { TravelAnchors } from "../particles/ParticleContext"
import type { Painter } from "../../../../engine/gpu"
import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import { allCards, statsOf } from "../../sim/run/Hero"
import type { Card } from "../../sim/card/Card"
import { Scope } from "../../../../lifetime"
import type { Halt } from "../../sim/halt/Halt"
import type { Shown } from "../../sim/halt/HaltContext"
import type { HaltMoment } from "../../sim/halt/SceneLook"
import { deckLine } from "../../sim/halt/subs/shown"
import type { Hero } from "../../sim/run/Hero"
import type { Journey, Place } from "../../sim/run/Journey"
import { BACK_VISUAL } from "../../sim/run/PlaceType"
import type { Run } from "../../sim/run/Run"
import type {
    CardsDialog, CatalogDialog, ConfirmDialog, Dialog, HeroDialog, OfferDialog, TellDialog,
} from "../../sim/travel/dialogs"
import type { Travel } from "../../sim/travel/Travel"

import { CatalogBrowser } from "../catalog/CatalogBrowser"
import { attributeLines } from "../describe"
import { cardsPerRow, sections } from "../library/entries"
import type { LibraryLook } from "../library/entries"
import { CardView } from "../hud/CardView"
import type { CardPlace } from "../hud/CardView"
import { DeckView } from "../hud/DeckView"
import { DetailTooltip } from "../hud/DetailTooltip"
import { cardsOption } from "../hud/ChoiceOptions"
import { BagView } from "../hud/BagView"
import { boosterView } from "../hud/BoosterView"
import { stacked } from "../hud/stacks"
import { forSale, saleDetail, saleText } from "../hud/forSale"
import { goldAmount } from "../hud/goldAmount"
import { itemIcons, usableIcon, usableIcons } from "../hud/thingIcons"
import { unitView } from "../hud/unitView"
import { upgradeView, pictured } from "../hud/upgradeView"
import type { AbsItemIcon } from "../hud/AbsItemIcon"
import type { Item } from "../../sim/item/Item"
import { withPicture } from "../hud/UnitPicture"
import { HAND_VISUAL } from "../look/UnitSprites"
import type { UnitSprites } from "../look/UnitSprites"
import { Detail } from "../hud/Detail"
import { cardDetail } from "../hud/cardDetail"
import { detailsOfParts } from "../hud/detailParts"
import { viewDetailOf, viewDetails } from "../hud/viewDetails"
import { heartsRow } from "../hud/HeartView"
import { HoverPanel } from "../hud/HoverPanel"
import {
    BUBBLE_TEXT, CHOSEN_TEXT, DIM_TEXT, STAT_DOWN, STAT_UP, TEXT_OUTLINE, WARNING_TEXT,
} from "../look/theme"
import { JourneyView } from "./JourneyView"
import type { MapArt } from "./JourneyView"
import type { AmbientUnit } from "./ambient/AmbientContext"
import { PointingArm } from "./PointingArm"
import { ShownParty } from "./ShownParty"
import { CUE_ANIMATIONS } from "./travelLooks"
import { TravelScenes, placeColorOf } from "./TravelScenes"
import type { TravelScene } from "./TravelScenes"
import type { UiSoundLink } from "../sound/UiSoundLink"
import { forwardAround } from "../forward/around"
import { travelForwardables } from "../forward/forwardables"
import type { Forwarded } from "../forward/Forwarded"

/** The share of the width the column of the party takes, on the left. */
const SIDE_SHARE = 0.3

/** The space around the panels and between them, in virtual pixels. */
const MARGIN = 4

/** The space between two cards, in virtual pixels. */
const CARD_GAP = 2

/** How wide the cards of a deck offered in a choice go, in virtual pixels: four small cards. */
const OFFERED_DECK_ROOM = 134

/** The space between two options of a choice, and between two of its steps, in virtual pixels. */
const OPTION_GAP = 6
const STEP_SPACING = 8

/** How far the frame around an option picked goes out of it, in virtual pixels. */
const PICKED_WIDTH = 2

/** The space between the edge of the paper of the map and the map, in virtual pixels: past its worn rim. */
const PAPER_PADDING = 16

/**
 * How much room the map keeps free on each side, for the scene behind it to show, in virtual pixels, and the
 * width under which it takes that room back, the map and its margins together.
 */
const MAP_GUTTER = 40
const MIN_MAP_WIDTH = 190

/** How opaque the panels are, letting the scene show through. */
const VEIL_ALPHA = 0.62

/** The face of a character of the party in its row, and of the one selected. */
const TILE = new Color(0.1, 0.06, 0.03, 0.8)
const SELECTED_TILE = new Color(0.3, 0.26, 0.42, 0.9)

/** How the texts of a dialog are written, to read on the scene. */
const ON_SCENE: ParagraphOptions = { outline: TEXT_OUTLINE }

/** How long the party takes to slide from a place to another, in seconds, however far it is. */
export const WALK_TIME = 0.5

/** How long the map takes to scroll to the party, in seconds. */
const MAP_SCROLL_TIME = 0.6

/** What the players may not do on the screen, the rest being theirs. */
export interface TravelLocks {
    /** May they not choose where the party goes? */
    readonly map: boolean

    /** May they not answer what a halt asks: pick an offer, a character or cards, go on, go back, leave? */
    readonly halts: boolean
}

/** Nothing locked: the players play the journey. */
export const NO_TRAVEL_LOCKS: TravelLocks = { map: false, halts: false }

/** What a screen is built with, besides what it shows. */
export interface TravelScreenOptions {
    readonly theme: Theme

    /** Where the pictures of the scenes come from. */
    readonly assets: Assets

    /** The pictures of the units: by each character, and where the party stands on the map. */
    readonly sprites: UnitSprites

    /** What the players may not do, nothing by default. */
    readonly locks?: TravelLocks

    /** What tells the speakers a place of the map is hovered or clicked, none when there is no sound. */
    readonly sounds?: UiSoundLink|null

    /** What is told as the animations of the journey play, none when nothing listens. */
    readonly forwarded?: Forwarded|null

    /** Play a transition into a place over the screen, done at its middle, at once when it cannot be. */
    enter(transition: Visual): Promise<void>

    /** Play the transition back to the map over the screen, done at its middle. */
    leave(): Promise<void>

    /** Wait for the painting of a transition to be loaded. */
    ready(transition: Visual): Promise<void>

    /** Show a sign that something loads for as long as a promise is awaited. */
    loading<Result>(work: Promise<Result>): Promise<Result>

    /** Tell the players something went wrong. */
    report(text: string): void
}

/**
 * A step of the choice open: what it shows, what a pick in it does, what an option hovered tells, and the
 * character it shows, when it offers characters.
 */
interface StepOfChoice {
    /** The dialog of the travel it answers. */
    readonly dialog: Dialog
    readonly step: ChoiceStep
    pick(index: number): void
    tell(index: number): Text|null
    show?(index: number): void

    /** What an option tells about itself and its parts, when its parts are told apart. */
    detail?(option: ChoiceOption, index: number): Detail
}

/** The button going on from a dialog: what it says, what it does, and whether it may yet. */
interface Next {
    readonly label: string
    readonly action: () => void
    readonly enabled?: boolean
}

/**
 * The cards of what is shown: its upgrades as the catalogue pictures them, then its own cards. Its upgrades
 * go beside its boosters instead when it has some.
 */
function cardsOf(shown: Shown): Card[] {
    const upgrades = shown.boosters?.length ? [] : (shown.upgrades ?? []).map(pictured)
    return [...upgrades, ...shown.cards]
}

/** The option of a choice a component is the content of, none when it is in none. */
function optionOf(content: Component): ChoiceOption|null {
    for(let each: Component|null = content; each; each = each.parent){
        if(each instanceof ChoiceOption) return each
    }
    return null
}

/**
 * The journey of a {@link Travel}, between the fights, over the scene of where the party stands, framed by
 * its border. On the left, where it stands, its characters, and the one selected in full: its hearts, then in
 * tabs its deck and its items, or its stats. On the right, the map of the floor, or the dialog of the halt
 * visited. Bubbles tell what the pointer hovers. A click on a place the party may go to goes there, the
 * party sliding along the path before the transition plays: a fight goes to its battle, a halt opens its
 * visit, over its own scene, its character standing before it, behind the panels. A halt left with the run
 * as it was may be clicked again, to go back into it.
 *
 * @remarks
 * A halt shows its name and what it does, then the dialog open, then the way back or out on the left and
 * the way on on the right. Offers and characters are asked as the steps of one {@link Choice}: a
 * character asked while a pick is being taken in becomes the next step of the choice open, so a card and
 * who takes it are chosen on one screen. Any other dialog replaces the screen. Each dialog builds the
 * screen again whole, and the character shown only rebuilds its own panels.
 *
 * It decides nothing: what it shows comes from the observables of the travel it follows, and what the
 * players do goes to the methods of that travel. Only what they have not answered yet is its own: the cards
 * picked in a dialog before they validate. What the travel tells goes on its {@link AnimationChain}, one
 * thing after the other, the map following the party it shows: the party slides to a place it moved to, the
 * journey goes in, and what it tells of the visit plays the way in, the halt shown at its middle.
 *
 * The character of a halt plays what its look says at the moments of the visit: one moment, the last, per
 * click, so a pick ending the visit plays only what came of it. A moment told while its scene loads plays
 * once it is shown.
 */
export class TravelScreen {


    public readonly theme: Theme

    /** The pictures of the units: by each character, and where the party stands on the map. */
    public readonly sprites: UnitSprites

    /** What it plays what the travel tells on, one thing after the other. */
    public readonly animations: AnimationChain

    public get run(): Run { return this.engine.run }

    /** The travel shown. */
    public get engine(): Travel { return this.#engine }

    /** The bubbles that tell what is hovered. */
    public get tooltip(): DetailTooltip { return this.#tooltip }

    /** Show another travel in place of this one, what was going on dropped. */
    public set engine(travel: Travel){
        this.#unregisterObservers()
        this.#stopAnimations()
        this.#choice = null
        this.#engine = travel
        this.#registerObservers()
        this.animations.add(() => this.#fillLoaded())
    }

    /** What the players may not do. */
    public get locks(): TravelLocks { return this.#locks }

    public set locks(locks: TravelLocks){
        this.#locks = locks
        this.refresh()
    }

    constructor(
        /** The interface the screen lays its panels in. */
        public readonly ui: UiRoot,

        engine: Travel,

        public readonly options: TravelScreenOptions,
    ){
        const { theme, assets, sprites } = options
        this.theme = theme
        this.sprites = sprites
        this.animations = new AnimationChain(error => options.report(String(error)))
        this.#engine = engine
        this.#locks = options.locks ?? NO_TRAVEL_LOCKS
        // The background moves with the pointer, drawn again while the panels over it, in a texture of their
        // own, stay as they were.
        this.#backdropLayer = ui.addLayer("background")
        this.#layer = ui.addLayer("ui", { texture: true })
        // Over the panels, apart from them: the hand follows the pointer, and draws again where it moves.
        this.#foregroundLayer = ui.addLayer("foreground")
        this.#scenes = new TravelScenes(ui.gpu, assets, ui, text => this.options.report(text))
        this.#scroll = new Scroll(theme, { width: MARGIN, height: MARGIN })
        this.#partyScroll = new Scroll(theme, { axis: "horizontal", width: MARGIN, height: MARGIN })
        this.#mapScroll = new Scroll(theme, { width: MARGIN, height: MARGIN, bar: false, wheel: false })
        this.#stuffScroll = new Scroll(theme, { width: MARGIN, height: MARGIN })
        this.#statsScroll = new Scroll(theme, { width: MARGIN, height: MARGIN })
        // Over everything, the hand included, so the bubbles of the details lie over the panels.
        this.#tooltip = new DetailTooltip(ui, ui.addLayer("travel-tooltip"), theme, {
            color: DIM_TEXT, paper: () => sprites.paper,
        })
        this.#veil = NineSlice.flat(theme.white, new Color())
        this.#arm = new PointingArm(ui)
        void this.#loadArm(assets)
        void this.#loadMapArt(assets)
        this.#detailTabs = new Tabs(theme, [
            { title: "Stuff", build: () => this.#detailed(this.#stuffScroll, this.#stuff()) },
            { title: "Stats", build: () => this.#detailed(this.#statsScroll, this.#heroStats()) },
        ])
        this.#detailTabs.onSelect = () => this.#hearSide()
        sprites.whenLoaded(() => this.refresh())
        this.#registerObservers()
        this.animations.add(() => this.#fillLoaded())
    }


    /** Are its panels shown? Its host hides them during the battles. */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        this.#layer.content.visible = visible
        this.#backdropLayer.content.visible = visible
        this.#foregroundLayer.content.visible = visible
    }

    /** The journey whose map is shown, none while the screen is hidden or shows a halt. */
    public get shownMap(): Journey|null {
        return this.visible && !this.#visiting ? this.#mapView?.journey ?? null : null
    }

    /** Is the map shown laid out and done scrolling, so its places stay where they are? */
    public get mapSettled(): boolean {
        if(!this.shownMap || !this.anchors.mapArea()) return false
        return !this.#mapScroll.overflows || (!this.#mapFocus && this.#mapSliding === 0)
    }

    /** The characters of the party seen on the map, as they are shown, in the interface. They face right. */
    public get shownUnits(): AmbientUnit[] {
        const view = this.#mapView
        if(!view || !this.shownMap) return []
        const feet = view.partyFeet()
        return this.#walkers.flatMap((hero, index) => {
            const { x, y } = feet[index]
            const area = this.#anchorArea
            if(!view.layerRectOf(area.set(x, y - 1, 1, 1), area)) return []
            const position = { x: area.x, y: area.y + 1 }
            const head = { x: position.x, y: position.y - view.party[index].height }
            return [{ unit: hero, position, head, facing: { x: 1, y: 0 }, hearts: hero.hearts }]
        })
    }

    /** Show the map, what was being walked over at once, the party to go on from where it stands. */
    public showMap(): void {
        this.#clock.finish()
        this.#arriving = false
        this.#leaving = null
        this.#arm.disappear()
        this.#queued = null
        this.#dialog = null
        this.#fill()
    }

    /**
     * Load what the transition back to the map needs: the scene of the map and the transition itself. The
     * sign of loading shows only if the map is not loaded yet, such as the one of a new floor.
     */
    public async prepareBack(): Promise<void> {
        await this.#loadFloorScene()
        await this.options.ready(BACK_VISUAL)
    }

    /** Load the scene of the map of the floor, behind the sign of loading, unless it is loaded already. */
    async #loadFloorScene(): Promise<void> {
        const floor = this.engine.floor.type
        if(this.#scenes.hasMap(floor.look)) return
        await this.options.loading(this.#scenes.loadMap(floor.look, error => this.#sceneFailed(floor.name, error)))
    }

    /** Read the whole of the travel once the scene of its floor is loaded. */
    async #fillLoaded(): Promise<void> {
        // Let the host finish building: its sign of loading does not exist yet while this screen is constructed.
        await Promise.resolve()
        await this.#loadFloorScene()
        if(!this.#isDisposed) this.#fill()
    }

    /** Stop showing the travel. */
    public dispose(): void {
        this.#isDisposed = true
        this.#unregisterObservers()
        this.#stopAnimations()
        this.#arm.dispose()
        this.#scenes.dispose()
    }

    /**
     * Play the journey on, lay the panels out again when the interface changed size, and have the bubble
     * of the halt point at the head of its character, as it moves, and the bubbles of what is hovered read
     * the input.
     *
     * @param _world - Where a screen draws in the world: this one draws only in the interface.
     * @param dt - The time since the frame before, in seconds.
     */
    public frame(input: InputFrame, _world: Painter, dt: number): void {
        const walked = this.#shownParty.walk !== null
        this.#clock.advance(dt)
        if(walked || this.#shownParty.walk) this.#mapView?.invalidate()
        const size = `${this.ui.width}×${this.ui.height}`
        if(size !== this.#size){
            this.#size = size
            this.refresh()
        }
        this.#focusMap()
        this.#pointBubble()
        this.#tooltip.frame(input)
    }

    /** Where the gold, the party and the places are in the interface, for the particles. */
    public readonly anchors: TravelAnchors = {
        goldCounter: () => this.#centerOf(this.#goldRow),
        deckPile: () => this.#centerOf(this.#partyScroll),
        heroPortrait: hero => this.#centerOf(this.#tiles.get(hero) ?? null),
        placePosition: place => {
            const view = this.#mapView
            if(!view || !view.layerRectOf(view.tokenRect(place, this.#anchorArea), this.#anchorArea)) return null
            return this.#centerOfRect(this.#anchorArea)
        },
        mapArea: () => {
            const scroll = this.#mapScroll
            if(!this.visible || !scroll.areaOnLayer(this.#anchorArea)) return null
            const { x, y, width, height } = this.#anchorArea
            const gutter = this.#mapGutter
            return { x: x - gutter, y, width: width + 2 * gutter, height }
        },
    }

    /** The middle of a component in the interface, none when it is not shown. */
    #centerOf(component: Component|null): { readonly x: number, readonly y: number }|null {
        if(!component || !this.visible || !component.areaOnLayer(this.#anchorArea)) return null
        return this.#centerOfRect(this.#anchorArea)
    }

    #centerOfRect({ x, y, width, height }: Rect): { readonly x: number, readonly y: number } {
        return { x: x + width / 2, y: y + height / 2 }
    }

    readonly #anchorArea = new Rect()

    /** The room kept free on each side of the map, where the effects of the ambient still play. */
    #mapGutter = 0
    readonly #tiles = new Map<Hero, Component>()
    #goldRow: Component|null = null

    /** Build the panels again, from the run as it stands. */
    public refresh(): void {
        const content = this.#layer.content
        const backdropContent = this.#backdropLayer.content
        for(const child of [...content.children]) content.remove(child)
        for(const child of [...backdropContent.children]) backdropContent.remove(child)
        const foregroundContent = this.#foregroundLayer.content
        for(const child of [...foregroundContent.children]) foregroundContent.remove(child)
        // What the panels told is built again with them, and the words hovered may be gone with their texts.
        for(const detail of this.#built.splice(0)) detail.remove()
        this.#sideDetails?.remove()
        this.#sideDetails = null
        this.#tooltip.reset()
        const visiting = this.#visiting
        const look = visiting?.look ?? this.engine.floor.type.look
        const { r, g, b } = look.color
        this.#veil = NineSlice.flat(this.theme.white, new Color(r, g, b, VEIL_ALPHA))
        this.#placeColor = placeColorOf(look.parallax)
        const failed = (error: AssetError): void => this.#sceneFailed(visiting?.title ?? this.engine.floor.type.name, error)
        const scene = visiting
            ? this.#scenes.haltScene(look, () => this.refresh(), failed)
            : this.#scenes.mapScene(look, () => this.refresh(), failed)
        if(scene) backdropContent.add(scene.backdrop, { x: "stretch", y: "stretch" })
        if(scene?.pnj){
            scene.pnj.parent?.remove(scene.pnj)
            backdropContent.add(scene.pnj, { x: "stretch", y: "stretch" })
        }
        this.#scene = scene
        this.#bubble = null
        this.#mapView = null
        const dialog = this.#shownDialog
        const middle = dialog ? dialog() : this.#map()
        const frame = scene?.border.border
        const thickness = frame ? Math.max(frame.left, frame.right, frame.top, frame.bottom) / 2 : 0
        const column = new Box("column", { gap: MARGIN, align: "stretch" })
        column.add(middle, { grow: 1 })
        // GUTTERS //
        const room = this.ui.width - this.#sideWidth - 3 * MARGIN - 2 * thickness
        const gutter = dialog ? 0 : Math.max(0, Math.min(MAP_GUTTER, Math.floor((room - MIN_MAP_WIDTH) / 2)))
        this.#mapGutter = gutter
        const right = new Box("row", { align: "stretch" })
        if(gutter > 0) right.add(this.#gutter(gutter))
        right.add(column, { grow: 1 })
        if(gutter > 0) right.add(this.#gutter(gutter))
        const row = new Box("row", { gap: MARGIN, padding: MARGIN + thickness, align: "stretch" })
        row.fixedSize = { width: this.ui.width, height: this.ui.height }
        row.add(this.#side())
        row.add(right, { grow: 1 })
        content.add(row, { x: "start", y: "start" })
        if(scene){
            const border = new Panel(this.theme, { background: scene.border, padding: 0, interactive: false })
            content.add(border, { x: "stretch", y: "stretch" })
        }
        foregroundContent.add(this.#arm, { x: "stretch", y: "stretch" })
        if(this.#queued) this.#flush()
    }


    /**
     * Go to a place the party may go to, which the replay shows. Nothing is done while the party is entering
     * a place already.
     *
     * @throws {@link Error} When the party cannot go there.
     */
    public go(place: Place): void {
        if(this.engine.phase !== "entering") this.engine.go(place)
    }


    readonly #layer: Layer

    /** The layer under it, holding the backdrop of the scene. */
    readonly #backdropLayer: Layer

    /** The layer over it, holding the hand that points at the pointer. */
    readonly #foregroundLayer: Layer

    #engine: Travel

    #locks: TravelLocks

    /** The time of what it plays, told by its frames. */
    readonly #clock = new FrameClock()

    /** What it listens to on the travel it follows. */
    #observers = new Scope()

    /** What the options of each step of the choice open tell, by depth. */
    readonly #stepDetails: Detail[] = []

    /** What the panels built tell, until they are built again. */
    readonly #built: Detail[] = []

    /** What the cards, hearts, icons and piles of the side tell, until the side or its tab changes. */
    #sideDetails: Detail|null = null

    /** The column of the party and of the character shown, none before it is built. */
    #sideRoot: Component|null = null

    /** The bubbles that tell what is hovered. */
    readonly #tooltip: DetailTooltip

    /** The scenes of the places, loaded when first shown. */
    readonly #scenes: TravelScenes

    /**
     * The scroll of a dialog, kept from one build to the next with only its content replaced, so it stays
     * where the players scrolled it while they pick cards. The scrolls of the party and of each tab of the
     * character shown are kept the same way.
     */
    readonly #scroll: Scroll
    readonly #partyScroll: Scroll
    readonly #stuffScroll: Scroll
    readonly #statsScroll: Scroll

    /** The character shown in full: its name and hearts, then its tabs. */
    readonly #detail = new Box("column", { gap: 2 })

    /** The tabs of the character shown, kept so the one open stays open. */
    readonly #detailTabs: Tabs

    /** What the map is drawn with, none before it is loaded: the panels and the codes show meanwhile. */
    #isDisposed = false
    #mapArt: MapArt|null = null

    /** The place of the map the pointer is over, as the sounds heard it. */
    #soundPlace: Place|null = null

    /** The map shown, none while a dialog is. */
    #mapView: JourneyView|null = null

    /** Where the map shows the party, behind the travel while its way is played. */
    readonly #shownParty = new ShownParty()

    /** The scroll of the map, which the players do not move: it follows where the party stands. */
    readonly #mapScroll: Scroll

    /** Is the map to be scrolled to where the party stands, once laid out? */
    #mapFocus = false

    /** How many scrolls of the map to the party are going on. */
    #mapSliding = 0

    /** The characters drawn on the map shown, in the order they stand. */
    #walkers: readonly Hero[] = []

    /** The forearm over a halt, pointing at the pointer: it rises when a halt is visited, and sinks after. */
    readonly #arm: PointingArm

    /** The bubble telling what the halt visited does, none while the map is shown. */
    #bubble: Bubble|null = null

    /** Where the head of the character of the halt is, so pointing at it allocates nothing. */
    readonly #head = { x: 0, y: 0 }

    /** The face of the panels, in the color of the place. */
    #veil: NineSlice

    /** The color of the place shown, the hue of its wood and of its paper. */
    #placeColor = new Color(1, 1, 1)

    /** The character shown in full, none before one is selected: then the first of the party. */
    #selected: Hero|null = null

    /** The scene shown, none while it loads or on its own color. */
    #scene: TravelScene|null = null

    /** The moment the character of the halt reacts to next, none when it has nothing to play. */
    #queued: HaltMoment|null = null

    /** What builds the dialog open, none while the map is shown. */
    #dialog: (() => Component)|null = null

    /** The size of the interface the panels were laid out for, none before the first frame. */
    #size = ""

    /** The steps of the choice open, none while none is. */
    #steps: StepOfChoice[] = []

    /** The choice open, none while none is. */
    #choice: Choice|null = null

    /** Is the transition into a visit going on? The map stays shown until its middle, whatever is asked. */
    #arriving = false

    /** The halt being visited, none while the map is shown. */
    get #visiting(): Halt|null {
        return this.#arriving ? null : this.engine.halt ?? this.#leaving
    }

    /** The halt just left, shown until the middle of the transition back to the map, none when none is. */
    #leaving: Halt|null = null

    /** What builds the dialog shown, none while the map is. */
    get #shownDialog(): (() => Component)|null {
        return this.#arriving ? null : this.#dialog
    }

    /** How wide the column of the party is. */
    get #sideWidth(): number {
        return Math.floor(this.ui.width * SIDE_SHARE)
    }


    //// The travel, shown ////

    /** Read the whole of the travel, the party standing where it has it. */
    #fill(): void {
        this.#shownParty.resync(this.engine)
        this.refresh()
    }

    /** Add what the travel asks and tells to what the screen plays, as it comes. */
    #registerObservers(): void {
        const travel = this.engine
        const forwarded = this.options.forwarded ?? null
        this.#observers.remove()
        const forwardables = travelForwardables(travel)
        this.#observers = new Scope(...forwardAround(this.animations, forwarded, forwardables, () => [
            travel.moved.add(({ to }) => this.animations.add(() => this.#walk(travel, to))),
            travel.phaseChanged.add(phase => {
                if(phase === "entering") this.animations.add(instant(() => this.#enter(travel)))
            }),
            travel.mapDrawn.add(() => this.animations.add(() => this.#fillLoaded())),
            travel.loaded.add(() => {
                // A map that stands makes what was on its way to it pointless.
                this.#stopAnimations()
                this.animations.add(() => this.#fillLoaded())
            }),
            travel.offerAsked.add(dialog => this.#showOffer(dialog)),
            travel.heroAsked.add(dialog => this.#showHero(dialog)),
            travel.offerTaken.add(({ dialog, picks }) => this.#markTaken(dialog, picks[0])),
            travel.heroTaken.add(({ dialog, picks }) => this.#markTaken(dialog, picks[0])),
            travel.cardsAsked.add(dialog => this.#showCards(dialog)),
            travel.catalogAsked.add(dialog => this.#showCatalog(dialog)),
            travel.confirmAsked.add(dialog => this.#showConfirm(dialog)),
            travel.told.add(dialog => this.#showTold(dialog)),
            travel.reacted.add(moment => this.#react(moment)),
            travel.visitStarted.add(halt => {
                this.#arriving = true
                this.animations.add(() => this.#arrive(halt))
            }),
            travel.visitEnded.add(halt => {
                this.#leaving = halt
                this.animations.add(() => this.#leave(halt))
            }),
        ]))
    }

    #unregisterObservers(): void {
        this.#observers.remove()
        this.#observers = new Scope()
    }

    /** Drop what waits to be played, and end what is going on. */
    #stopAnimations(): void {
        this.animations.cancel()
        this.#clock.finish()
        this.#arriving = false
    }

    /** Have the party slide to a place, the map opening again once there. */
    async #walk(travel: Travel, to: Place): Promise<void> {
        const party = this.#shownParty
        party.leave(to)
        await this.#clock.tween(WALK_TIME, share => {
            if(party.walk) party.walk.share = share
        })
        party.land()
        if(travel === this.engine && travel.phase === "map") this.refresh()
    }

    /** The party was shown going to its place: the journey goes in, which tells what comes of it. */
    #enter(travel: Travel): void {
        if(travel.canAdvance) travel.advance()
    }

    /** Play the transition into a visit, the halt shown at its middle. */
    async #arrive(halt: Halt): Promise<void> {
        // Its scene and its transition loaded first, so the transition does not stall once it plays.
        await this.options.loading(Promise.all([
            this.#scenes.loadHalt(halt.look, error => this.#sceneFailed(halt.title, error)),
            this.options.ready(halt.type.transition),
        ]))
        await this.options.enter(halt.type.transition)
        if(this.engine.halt !== halt) return
        this.#arriving = false
        this.#arm.appear()
        this.refresh()
    }

    /** Play the transition back to the map, the map shown at its middle and the scene of the halt let go after. */
    async #leave(halt: Halt): Promise<void> {
        if(this.#leaving !== halt) return
        await this.prepareBack()
        await this.options.leave()
        // The visit may have been replaced while the transition played.
        if(this.#leaving !== halt) return
        this.showMap()
        this.#scenes.releaseHalt()
    }

    /** Tell the players the scene of a place could not be loaded. */
    #sceneFailed(place: string, error: AssetError): void {
        this.options.report(`Le décor de ${place} n'a pas pu être chargé : ${error.message}`)
    }

    /** Tie the map to what the players do: going to the place they click. */
    #connectInputs(view: JourneyView): void {
        view.onPick = place => {
            this.options.sounds?.press()
            this.go(place)
        }
    }


    //// The dialogs of a halt ////

    #showOffer(dialog: OfferDialog): void {
        const boosters = new Set<Component>()
        // What each offer shows, without its price.
        const sold: Component[] = []
        const options = dialog.offers.map(shown => {
            const before = this.#boostersShown(shown)
            for(const piece of before) if(!(piece instanceof CardView)) boosters.add(piece)
            const deck = this.#placeOf(shown.from)
            const content = shown.unit
                ? unitView(this.theme, this.sprites, shown.unit, { deck })
                : cardsOption(this.theme, cardsOf(shown), shown.text ?? null, {
                    under: this.#stuffShown(shown, "mini", OFFERED_DECK_ROOM, {}),
                    before,
                    deck,
                    sprite: shown.sprite,
                    sprites: this.sprites,
                    overlapped: Boolean(shown.sprite),
                })
            sold.push(content)
            return shown.price === undefined ? content : forSale(this.theme, this.sprites, shown.price, content)
        })
        this.#choose({
            dialog,
            step: { title: this.#title(dialog.title), options },
            pick: index => this.engine.takeOffer(dialog, index),
            tell: index => {
                const { text = null, price } = dialog.offers[index]
                return price === undefined ? text : saleText(price, text)
            },
            detail: (option, index) => {
                const { text = null, price } = dialog.offers[index]
                const parts = detailsOfParts(sold[index], viewDetailOf, boosters)
                return price === undefined
                    ? Detail.on(option, text, parts)
                    : saleDetail(option, sold[index], price, text, parts)
            },
        }, false)
    }


    #showHero(dialog: HeroDialog): void {
        const { heroes } = dialog
        const options = heroes.map(each => unitView(this.theme, this.sprites, each, {
            cards: false, description: each.controller !== "player" ? "Bot" : null,
        }))
        this.#choose({
            dialog,
            step: { title: this.#title(dialog.title), options },
            pick: index => this.engine.takeHero(dialog, heroes[index]),
            tell: index => concat(heroes[index], " : ", `${allCards(heroes[index]).length} cartes.`),
            show: index => this.#select(heroes[index]),
        }, dialog.follows)
    }

    #showCards(dialog: CardsDialog): void {
        const { count, pool, selectable, repeatable } = dialog
        // The places of the cards picked, in the order picked, so two copies are two picks.
        const picked: number[] = []
        const build = (): Component => {
            const column = new Box("column", { gap: MARGIN })
            const deck = this.#placeOf(dialog.from)
            const view = new DeckView(this.theme, pool, {
                room: this.#middleRoom(),
                size: "chain",
                deck,
                pickable: (_, index) => {
                    if(!selectable[index] || this.#locks.halts) return null
                    const times = picked.filter(each => each === index).length
                    return {
                        // A card picked once says it with an edge; one that may be picked again, how many times.
                        activation: times === 0 ? null : repeatable[index] ? `[${times}]` : "",
                        pick: () => {
                            const at = picked.indexOf(index)
                            if(repeatable[index]){
                                if(picked.length < count.max) picked.push(index)
                                else if(count.max === 1) picked.splice(0, 1, index)
                            }
                            else if(at >= 0) picked.splice(at, 1)
                            else if(picked.length < count.max) picked.push(index)
                            else if(count.max === 1) picked.splice(0, 1, index)
                            this.#open(build)
                        },
                    }
                },
            })
            this.#hearParts(view)
            column.add(view)
            column.add(this.#pickedRow(pool, picked, deck, at => {
                picked.splice(at, 1)
                this.#open(build)
            }))
            const ready = picked.length >= count.min && picked.length <= count.max
            const wanted = count.min === count.max ? `${count.min}` : `${count.min} à ${count.max}`
            const told = `Choisies : ${picked.length} (il en faut ${wanted})`
            const color = ready ? CHOSEN_TEXT : DIM_TEXT
            column.add(new Label(this.theme, told, { color, outline: TEXT_OUTLINE }))
            return this.#haltFrame(dialog.title, this.#scrolled(column), dialog, {
                label: "Valider", enabled: ready, action: () => this.engine.takeCards(dialog, picked),
            })
        }
        this.#open(build)
    }

    /**
     * The cards picked so far, in the order they were picked, side by side or overlapping when the room is
     * short. A click on one lets it go.
     *
     * @param picked - The places in the pool of the cards picked, the same place more than once for a card
     *   picked several times.
     * @param leave - Called with the place in the picks of the card to let go.
     */
    #pickedRow(pool: readonly Card[], picked: readonly number[], deck: number|null, leave: (at: number) => void): Component {
        if(picked.length === 0) return new Label(this.theme, "(rien de choisi)", { color: DIM_TEXT })
        const row = new OverflowContainer({ gap: CARD_GAP })
        picked.forEach((index, at) => {
            const card = pool[index]
            const view = new CardView(this.theme, card, "chain")
            view.deck = deck
            this.#hear(cardDetail(view))
            if(!this.#locks.halts) view.onPick = () => leave(at)
            row.add(view)
        })
        return row
    }

    /**
     * A thing of the catalogue asked for: the browser of the catalogue, among the types the dialog allows, a
     * click on an entry taking it. The browser is kept while the dialog is open, so what was typed stays.
     */
    #showCatalog(dialog: CatalogDialog): void {
        const look: LibraryLook = {
            theme: this.theme, sprites: this.sprites, perRow: () => cardsPerRow(this.#middleRoom()),
        }
        const browser = new CatalogBrowser(this.theme, {
            sections: sections(look), width: () => this.#middleRoom(), allowed: new Set(dialog.allowed),
            keys: dialog.keys,
        })
        browser.onPick = (section, entry) => {
            if(this.#locks.halts) return
            this.engine.takeCatalog(dialog, { category: section.category, key: entry.key })
        }
        browser.onDetail = detail => this.#hear(detail)
        this.#open(() => {
            browser.parent?.remove(browser)
            browser.refresh()
            return this.#haltFrame(dialog.title, browser, dialog, null)
        })
    }

    #showConfirm(dialog: ConfirmDialog): void {
        const next = { label: dialog.action, action: () => this.engine.accept(dialog) }
        this.#open(() => {
            const body = this.#scrolled(this.#shown(dialog.shown))
            return this.#haltFrame(dialog.title, body, dialog, next, "Annuler")
        })
    }

    #showTold(dialog: TellDialog): void {
        const { shown } = dialog
        this.#open(() => {
            const body = shown ? this.#scrolled(this.#shown(shown)) : new Box("column")
            return this.#haltFrame(dialog.title, body, null, {
                label: "Continuer", action: () => this.engine.leave(),
            })
        })
    }

    /** Have the character of the halt visited play what it plays at a moment, once the click is over. */
    #react(moment: HaltMoment): void {
        const wasQueued = this.#queued !== null
        this.#queued = moment
        if(!wasQueued) queueMicrotask(() => this.#flush())
    }

    /** Give the forearm its picture once loaded, telling when it could not be. */
    async #loadArm(assets: Assets): Promise<void> {
        try {
            const sprite = await PointingArm.loadSprite(this.ui.gpu, assets)
            if(this.#isDisposed) sprite.texture.dispose()
            else this.#arm.sprite = sprite
        } catch(error){
            if(!(error instanceof AssetError)) throw error
            this.options.report(`Le bras n'a pas pu être chargé : ${error.message}`)
        }
    }

    /** Give the map what it is drawn with once loaded, telling when it could not be. */
    async #loadMapArt(assets: Assets): Promise<void> {
        try {
            this.#mapArt = await JourneyView.loadArt(this.ui.gpu, assets)
        } catch(error){
            if(!(error instanceof AssetError)) throw error
            this.options.report(`Les images de la carte n'ont pas pu être chargées : ${error.message}`)
            return
        }
        if(this.#mapView) this.refresh()
    }

    /** Play the moment queued, when the character of the halt is shown, else keep it for when it is. */
    #flush(): void {
        const moment = this.#queued
        const pnj = this.#scene?.pnj
        if(!moment || !this.#visiting || !pnj) return
        this.#queued = null
        const cue = this.#visiting.look.pnj?.cues[moment]
        if(cue) pnj.actor.play(CUE_ANIMATIONS[cue])
    }

    /** Have the bubble of the halt point at the head of its character, or at nothing while none is shown. */
    #pointBubble(): void {
        const bubble = this.#bubble
        if(!bubble) return
        const pnj = this.#scene?.pnj
        const head = this.#head
        if(!pnj?.visible || !pnj.parent || !pnj.headInto(head)){
            bubble.hidePoint()
            return
        }
        bubble.pointAt(pnj.bounds.x + head.x, pnj.bounds.y + head.y)
    }

    #open(build: () => Component): void {
        this.#dialog = build
        this.refresh()
    }

    /** Tell what a detail shows in the bubbles beside the pointer, until the panels are built again. */
    #hear(detail: Detail): void {
        this.#built.push(detail)
        this.#tooltip.attach(detail)
    }

    /** Tell what the cards, hearts, icons and piles found in a component show. */
    #hearParts(root: Component): void {
        this.#hear(Detail.all(...viewDetails(root)))
    }

    /**
     * Ask a step of a choice: the next step of the choice open when it follows one of its picks, shown under
     * it as the travel asks it, else the first step of a new choice, left by the way of its dialog.
     */
    #choose(step: StepOfChoice, follows: boolean): void {
        const open = this.#choice
        if(follows && open){
            this.#detailOptions(step, this.#steps.length)
            this.#steps.push(step)
            open.append(step.step)
            return
        }
        const steps: StepOfChoice[] = [step]
        this.#steps = steps
        const choice = new Choice(this.theme, picks => this.#nextStep(steps, picks), () => {}, {
            gap: OPTION_GAP, spacing: STEP_SPACING,
            picked: { frame: NineSlice.flat(this.theme.white, CHOSEN_TEXT), width: PICKED_WIDTH },
        })
        this.#choice = choice
        this.#detailOptions(step, 0)
        this.#open(() => this.#choiceFrame(choice, steps, step.dialog))
    }

    /** Show the option the travel took as the one picked in its step, the steps after it dropped. */
    #markTaken(dialog: Dialog, index: number): void {
        const depth = this.#steps.findIndex(each => each.dialog === dialog)
        if(depth < 0 || !this.#choice) return
        this.#steps.length = depth + 1
        this.#choice.mark(depth, index)
    }

    /**
     * Tell of the options of a step, which take the pointer from their parts: what the step says of each, and
     * of its parts when it tells them apart. The steps deeper than it are forgotten.
     *
     * @param depth - How many steps come before it in the choice.
     */
    #detailOptions(step: StepOfChoice, depth: number): void {
        for(const old of this.#stepDetails.splice(depth)) old.remove()
        if(depth === 0) this.#tooltip.reset()
        const { detail } = step
        const details = step.step.options.flatMap((content, index) => {
            const option = optionOf(content)
            if(!option) return []
            if(detail) return [detail(option, index)]
            const text = step.tell(index)
            return text === null ? [] : [Detail.on(option, text)]
        })
        const all = Detail.all(...details)
        this.#tooltip.attach(all)
        this.#stepDetails[depth] = all
    }

    /**
     * The step following picks in a choice: the first step for none, else none: the pick of the last step is
     * taken in by the travel, which asks the step that follows it, shown as it is asked.
     */
    #nextStep(steps: StepOfChoice[], picks: readonly number[]): ChoiceStep|null {
        if(picks.length === 0) return steps[0].step
        const depth = picks.length - 1
        steps.length = depth + 1
        steps[depth].pick(picks[depth])
        return null
    }

    /** Show a character in full, in place of the one shown. */
    #select(hero: Hero): void {
        if(hero === this.#selected) return
        this.#selected = hero
        this.#fillParty()
        this.#fillDetail()
        this.#tooltip.reset()
        this.#hearSide()
    }

    /** The character shown in full: the one selected while it is in the party, else the first. */
    #shownHero(): Hero|null {
        const { heroes } = this.run
        const selected = this.#selected
        return selected && heroes.includes(selected) ? selected : heroes[0] ?? null
    }


    //// The side ////

    /** Where the party stands, its characters, and the one selected in full. */
    #side(): Component {
        const column = new Box("column", { gap: MARGIN, align: "stretch" })
        column.fixedSize = { width: this.#sideWidth, height: this.ui.height - 2 * MARGIN }
        column.add(this.#where())
        column.add(this.#panel(this.#partyScroll, true))
        this.#fillParty()
        column.add(this.#panel(this.#detail, true, true), { grow: 1 })
        this.#fillDetail()
        this.#sideRoot = column
        this.#hearSide()
        return column
    }

    /** Tell what the cards, hearts, icons and piles of the side show, in place of what it told before. */
    #hearSide(): void {
        this.#sideDetails?.remove()
        this.#sideDetails = null
        const root = this.#sideRoot
        if(!root) return
        const details = Detail.all(...viewDetails(root))
        this.#tooltip.attach(details)
        this.#sideDetails = details
    }

    /** Where the party stands: the halt visited or the floor, its level, the depth and the gold. */
    #where(): Component {
        const { floor, depth } = this.engine
        const column = new Box("column", { gap: 1 })
        const place = this.#visiting?.title ?? floor.type.name
        column.add(this.#label(place, CHOSEN_TEXT))
        const line = new Box("row", { gap: 3, align: "center" })
        line.add(this.#label(`Niveau ${floor.level} · Profondeur ${depth} ·`, DIM_TEXT))
        this.#goldRow = goldAmount(this.theme, this.sprites, this.run.gold, DIM_TEXT)
        line.add(this.#goldRow)
        column.add(line)
        return this.#panel(column, true)
    }

    /** The characters of the party in a row, the one shown lit, a click on one showing it. */
    #fillParty(): void {
        const shown = this.#shownHero()
        const row = new Box("row", { gap: MARGIN, align: "start" })
        let tallest = 0
        this.#tiles.clear()
        for(const hero of this.run.heroes){
            const block = new Box("column", { gap: 1 })
            block.add(this.#label(hero.name, hero === shown ? CHOSEN_TEXT : undefined))
            block.add(this.#hearts(hero))
            const wood = this.#wood
            const tile = new HoverPanel(this.theme, wood
                ? { background: hero === shown ? wood.frameActive : wood.frame, padding: 2 + FRAME_THICKNESS }
                : { background: NineSlice.flat(this.theme.white, hero === shown ? SELECTED_TILE : TILE), padding: 2 })
            tile.content = withPicture(this.sprites, hero.sprite, block)
            tile.onPick = () => this.#select(hero)
            this.#tiles.set(hero, tile)
            tallest = Math.max(tallest, tile.measure(Infinity).preferredHeight)
            row.add(tile)
        }
        this.#partyScroll.content = row
        this.#partyScroll.fixedSize = {
            width: this.#sideWidth - 2 * this.theme.panel.padding,
            height: tallest + this.theme.scrollbar.width + 1,
        }
    }

    /** The hearts of a character, told by the details of the side. */
    #hearts(hero: Hero): Component {
        return heartsRow(this.theme, hero.hearts, () => {})
    }

    /** The character shown in full: its name and hearts, then its tabs. */
    #fillDetail(): void {
        const hero = this.#shownHero()
        const detail = this.#detail
        for(const child of [...detail.children]) detail.remove(child)
        if(!hero) return
        const head = new Box("row", { gap: MARGIN, align: "center" })
        head.add(this.#label(hero.controller !== "player" ? `${hero.name} (bot)` : hero.name, CHOSEN_TEXT))
        head.add(this.#hearts(hero))
        detail.add(withPicture(this.sprites, hero.sprite, head))
        this.#detailTabs.refresh()
        detail.add(this.#detailTabs, { grow: 1 })
    }

    /** What a tab of the character shown holds, in its scroll. */
    #detailed(scroll: Scroll, content: Component): Scroll {
        scroll.content = content
        return scroll
    }

    /** The stuff of the character shown: its decks, its items and what it may use. */
    #stuff(): Component {
        const hero = this.#shownHero()
        const column = new Box("column", { gap: 2 })
        if(!hero) return column
        const room = this.#sideWidth - 2 * this.theme.panel.padding - this.theme.scrollbar.width - 1
        for(const deck of hero.decks) column.add(this.#deckView(deck, "mini", room, { color: DIM_TEXT }))
        const lists: [string, readonly Component[]][] = [
            ["Objets", this.#itemViews(hero.items)],
            ["Utilisables", stacked(hero.usables, carried => carried.usable).map(({ first, members }) => {
                const left = members.reduce((sum, carried) => sum + carried.charges, 0)
                return usableIcon(this.theme, this.sprites, first.usable, members.length, left)
            })],
        ]
        for(const [name, things] of lists){
            if(things.length === 0) continue
            column.add(this.#label(name, DIM_TEXT))
            column.add(this.#bag(things), { align: "start" })
        }
        return column
    }

    /**
     * The stats of the character shown, as it enters a battle: its bases through its items, a stat its
     * items change lit, with its base.
     */
    #heroStats(): Component {
        const hero = this.#shownHero()
        const column = new Box("column", { gap: 1 })
        if(!hero) return column
        for(const stat of attributeLines(statsOf(hero))){
            const row = new Box("row", { gap: 2 })
            row.add(this.#label(stat.name, DIM_TEXT), { grow: 1 })
            const color = stat.change === "up" ? STAT_UP : stat.change === "down" ? STAT_DOWN : undefined
            row.add(this.#label(stat.value, color))
            if(stat.base) row.add(this.#label(`(${stat.base})`, DIM_TEXT))
            column.add(row)
        }
        return column
    }


    //// The middle ////

    /** The map of the floor, the paths to the places the party may go to lit. */
    #map(): Component {
        const travel = this.engine
        const shown = this.#shownParty
        const back = travel.returnable
        const next = travel.journey.nextOf(shown.here)
        const ways = back ? [...next, back] : next
        const open = this.#locks.map ? [] : ways
        const { decorations } = travel.floor.type
        const view = new JourneyView(this.theme, travel.journey, shown, open, decorations)
        view.art = this.#mapArt
        const walkers = this.run.heroes.flatMap(hero => {
            const sprite = this.sprites.of(hero.sprite)
            return sprite ? [{ hero, sprite }] : []
        })
        this.#walkers = walkers.map(walker => walker.hero)
        // A party of none is a giant hand floating where the party would stand.
        const hand = this.run.heroes.length > 0 ? null : this.sprites.of(HAND_VISUAL)
        view.party = hand ? [hand] : walkers.map(walker => walker.sprite)
        this.#mapView = view
        this.#connectInputs(view)
        view.onHover = place => {
            if(this.#soundPlace) this.options.sounds?.hover(false)
            if(place) this.options.sounds?.hover(true)
            this.#soundPlace = place
        }
        const texts = new Map<Place, Text>()
        const textOf = (place: Place): Text|null => {
            let text = texts.get(place)
            if(text === undefined){
                if(place.halt){
                    if(place.fight){
                        text = [
                            concat(place.fight.category, " : ", place.fight.category.description),
                            concat(place.halt, " : ", place.halt.description),
                        ]
                    }
                    else{
                        text = concat(place.halt, " : ", place.halt.description)
                    }
                }
                else{
                    if(place.fight){
                        text = concat(place.fight.category, " : ", place.fight.category.description)
                    }
                    else{
                        text = "Rien à faire ici."
                    }
                }
                texts.set(place, text)
            }
            return text
        }
        const point = { x: 0, y: 0 }
        const token = new Rect()
        this.#hear(Detail.under(view, (x, y) => {
            if(!view.localPoint(x, y, point)) return null
            const place = view.placeAt(point.x, point.y)
            const text = place ? textOf(place) : null
            if(!place || !text) return null
            const area = new Rect()
            return view.layerRectOf(view.tokenRect(place, token), area) ? { text, area } : { text }
        }))
        this.#mapScroll.content = view
        this.#mapFocus = true
        const paper = this.#mapArt?.paperIn(this.#placeColor)
        if(!paper) return this.#panel(this.#mapScroll)
        this.#mapScroll.parent?.remove(this.#mapScroll)
        const panel = new Panel(this.theme, { background: paper, padding: PAPER_PADDING })
        panel.content = this.#mapScroll
        return panel
    }

    /**
     * Scroll the map so the row the party stands on is the lowest one shown, what lies ahead above it, once
     * it is laid out: its offset is only known then. The scroll may still tell of the map it held before,
     * so what counts is the bounds of this one.
     */
    #focusMap(): void {
        const view = this.#mapView
        if(!this.#mapFocus || !view || view.bounds.isEmpty || !this.#mapScroll.overflows) return
        this.#mapFocus = false
        const scroll = this.#mapScroll
        const from = scroll.offset
        const to = view.partyRowBottom() - scroll.bounds.height
        if(from === to) return
        // Slid there with a gentle start and stop, not jumped to.
        this.#mapSliding++
        void this.#clock.tween(MAP_SCROLL_TIME, share => {
            scroll.offset = from + (to - from) * (share * share * (3 - 2 * share))
        }).then(() => {
            this.#mapSliding--
        })
    }

    /**
     * A dialog of the halt visited, on the scene with no panel: the name of the halt, centered, what it does
     * in a bubble said by its character, the title of the dialog when it has one of its own, what it shows,
     * then the way back or out on the left and the way on on the right. Its texts are outlined, to read on
     * the scene.
     *
     * @param dialog - The dialog it is left from without choosing, none when it is not.
     * @param next - How it goes on, none when a pick in it does.
     * @param backLabel - What the way back says.
     */
    #haltFrame(
        title: Text|null, body: Component, dialog: Dialog|null, next: Next|null, backLabel = "Retour",
    ): Component {
        const column = new Box("column", { gap: MARGIN })
        const halt = this.#visiting
        if(halt){
            const name = new Label(this.theme, halt.title, {
                color: CHOSEN_TEXT, outline: TEXT_OUTLINE, align: "center",
            })
            column.add(name, { align: "stretch" })
            const bubble = new Bubble(this.theme)
            bubble.content = this.#paragraph(halt.line, BUBBLE_TEXT)
            this.#bubble = bubble
            column.add(bubble)
            this.#pointBubble()
        }
        if(title !== null) column.add(this.#title(title, this.theme.textColor))
        column.add(body, { grow: 1 })
        if(dialog || next){
            const foot = new Box("row", { gap: MARGIN, align: "end" })
            if(dialog){
                const leave = dialog.back ? () => this.engine.goBack(dialog) : () => this.engine.leave()
                foot.add(this.#button(dialog.back ? backLabel : "Partir", leave, WARNING_TEXT))
            }
            foot.add(new Box("row"), { grow: 1 })
            if(next){
                const button = this.#button(next.label, next.action, CHOSEN_TEXT)
                button.enabled = (next.enabled ?? true) && !this.#locks.halts
                foot.add(button)
            }
            column.add(foot)
        }
        const frame = new Panel(this.theme, { background: null })
        frame.content = column
        return frame
    }

    /** A choice at the foot of a dialog, the scene showing above it, what the option hovered is told. */
    #choiceFrame(choice: Choice, steps: readonly StepOfChoice[], dialog: Dialog): Component {
        const middle = new Stack()
        choice.parent?.remove(choice)
        choice.locked = this.#locks.halts
        middle.add(choice, { x: "stretch", y: "end" })
        choice.onHover = (depth, index, over) => {
            if(over) steps[depth]?.show?.(index)
        }
        // In the scroll like the other dialogs: the options ask for their whole height, so without it they
        // would push the way out of the screen.
        return this.#haltFrame(null, this.#scrolled(middle), dialog, null)
    }

    /** What a dialog shows, in its scroll. */
    #scrolled(content: Component): Scroll {
        this.#scroll.parent?.remove(this.#scroll)
        this.#scroll.content = content
        return this.#scroll
    }

    /** How wide what a dialog shows may be. */
    #middleRoom(): number {
        const { panel, scrollbar } = this.theme
        return this.ui.width - this.#sideWidth - 3 * MARGIN - 2 * panel.padding - scrollbar.width
    }

    /** Cards in a row, then decks, items and usables, then a text under them. What is hovered is told. */
    #shown(shown: Shown): Component {
        const column = new Box("column", { gap: 2 })
        const cards = cardsOf(shown)
        const boosters = this.#boostersShown(shown)
        if(cards.length + boosters.length > 0){
            const row = new Box("row", { gap: CARD_GAP, align: "start" })
            for(const booster of boosters) row.add(booster)
            const deck = this.#placeOf(shown.from)
            for(const card of cards) row.add(this.#cardView(card, deck))
            column.add(row)
        }
        const stuff = this.#stuffShown(shown, "chain", this.#middleRoom(), ON_SCENE)
        if(stuff){
            this.#hearParts(stuff)
            column.add(stuff)
        }
        if(shown.text !== undefined){
            column.add(new Paragraph(this.theme, shown.text, { ...ON_SCENE, onLink: this.#tooltip.hearLink }))
        }
        return column
    }

    /** The decks, items and usables of what is shown, one under the other, none when it holds none. */
    #stuffShown(shown: Shown, size: CardPlace, room: number, look: ParagraphOptions): Component|null {
        const { decks = [], items = [], usables = [] } = shown
        if(decks.length + items.length + usables.length === 0) return null
        const column = new Box("column", { gap: MARGIN })
        for(const deck of decks) column.add(this.#deckView(deck, size, room, look))
        const things = [
            ...this.#itemViews(items),
            ...usableIcons(this.theme, this.sprites, usables),
        ]
        if(things.length > 0) column.add(this.#bag(things), { align: "start" })
        return column
    }

    /** Things in a bag, to add to a column aligned at its start so the bag wraps at the width of the column. */
    #bag(things: readonly Component[]): BagView {
        return new BagView(this.theme, things, this.sprites.bag)
    }

    /** A deck of the party with its cards, named and colored by its place among those of its character. */
    #deckView(deck: readonly Card[], size: CardPlace, room: number, look: ParagraphOptions): DeckView {
        const owner = this.#ownerOf(deck)
        return new DeckView(this.theme, deck, {
            room, size,
            name: owner && deckLine(owner, deck),
            nameLook: { ...look, onLink: this.#tooltip.hearLink },
            deck: this.#placeOf(deck),
        })
    }

    /** Items as pictures, the same ones in one with their count. */
    #itemViews(items: readonly Item[]): AbsItemIcon[] {
        return itemIcons(this.theme, this.sprites, items)
    }

    /** The character of the party holding a deck, none when none does. */
    #ownerOf(deck: readonly Card[]): Hero|null {
        return this.run.heroes.find(hero => hero.decks.includes(deck as Card[])) ?? null
    }

    /** The place of a deck among those of its character, none for what is no deck of the party. */
    #placeOf(deck: readonly Card[]|undefined): number|null {
        const owner = deck ? this.#ownerOf(deck) : null
        return owner ? owner.decks.indexOf(deck as Card[]) : null
    }

    /** A card of a dialog, told on hover: the dialog says to hover its cards while none is. */
    /** The boosters of what is shown, each framed in leather, then the upgrades beside them. */
    #boostersShown(shown: Shown): Component[] {
        const boosters = shown.boosters ?? []
        if(boosters.length === 0) return []
        const upgrades = (shown.upgrades ?? []).map(upgrade => upgradeView(this.theme, upgrade))
        return [...boosters.map(booster => boosterView(this.theme, booster, this.sprites.booster)), ...upgrades]
    }

    #cardView(card: Card, deck: number|null): CardView {
        const view = new CardView(this.theme, card, "chain")
        view.deck = deck
        this.#hear(cardDetail(view))
        return view
    }

    /** Empty room of a width, where the scene behind shows. */
    #gutter(width: number): Component {
        const space = new Box("row")
        space.fixedSize = { width, height: 0 }
        return space
    }

    /** The wood in the hue of the place shown, none before it is loaded. */
    get #wood(): Wood|null {
        return this.sprites.wood?.tinted(this.#placeColor) ?? null
    }

    /** A wooden panel, or one in the color of the place when there is no wood; its inside lets the scene show through when asked. */
    #panel(content: Component, transparent = false, squeezable = false): Panel {
        content.parent?.remove(content)
        const wood = this.#wood
        const panel = new Panel(this.theme, wood
            ? {
                background: transparent ? wood.frameTransparent : wood.frame,
                padding: FRAME_THICKNESS + 1,
                squeezable,
            }
            : { background: this.#veil, squeezable })
        panel.content = content
        return panel
    }

    #paragraph(text: Text, color?: Color): Paragraph {
        return new Paragraph(this.theme, text, { onLink: this.#tooltip.hearLink, ...color ? { color } : {} })
    }

    /** The title of a dialog, outlined to read on the scene, in the color of what is chosen by default. */
    #title(text: Text, color: Color = CHOSEN_TEXT): Paragraph {
        return new Paragraph(this.theme, text, { color, outline: TEXT_OUTLINE, onLink: this.#tooltip.hearLink })
    }

    #label(text: string, color?: Color): Label {
        return new Label(this.theme, text, color ? { color } : {})
    }

    #button(text: string, activate: () => void, color?: Color): Button {
        const button = new Button(this.theme, color ? this.#label(text, color) : text)
        button.onActivate = activate
        button.enabled = !this.#locks.halts
        return button
    }
}
