import { AssetError } from "../../../../engine/assets"
import type { Assets, LayeredImagePath } from "../../../../engine/assets"
import type { Visual } from "../../sim/base/Visual"
import type { InputFrame } from "../../../../engine/input"
import { Color } from "../../../../engine/math"
import {
    AnimationChain, Box, Bubble, Button, Choice, FrameClock, instant, Label, NineSlice, Panel, Paragraph,
    Scroll, Stack, Tabs,
} from "../../../../engine/ui"
import type { ChoiceStep, Component, Layer, ParagraphOptions, Theme, UiRoot } from "../../../../engine/ui"
import type { Painter } from "../../../../engine/gpu"
import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import { infoOf } from "../../sim/catalog/places"
import { allCards, statsOf } from "../../sim/run/Hero"
import type { Card } from "../../sim/card/Card"
import type { Observer } from "../../sim/base/Observable"
import type { Halt } from "../../sim/halt/Halt"
import type { Shown } from "../../sim/halt/HaltContext"
import type { HaltMoment } from "../../sim/halt/SceneLook"
import { cardText, deckLine, described, usableText } from "../../sim/halt/subs/shown"
import type { Hero } from "../../sim/run/Hero"
import type { Place } from "../../sim/run/Journey"
import type { Run } from "../../sim/run/Run"
import type {
    CardsDialog, ConfirmDialog, Dialog, HeroDialog, OfferDialog, TellDialog,
} from "../../sim/travel/dialogs"
import type { Travel } from "../../sim/travel/Travel"

import { attributeLines } from "../describe"
import { CardView } from "../hud/CardView"
import type { CardPlace } from "../hud/CardView"
import { DeckView } from "../hud/DeckView"
import { DetailBox } from "../hud/DetailBox"
import { cardsOption, heroOption, unitHead } from "../hud/ChoiceOptions"
import { BagView } from "../hud/BagView"
import { boosterView } from "../hud/BoosterView"
import { countText, countTold, stacked, stackUsesText } from "../hud/stacks"
import { AbsItemIcon, THING_ICON_SIZE } from "../hud/AbsItemIcon"
import type { Item } from "../../sim/item/Item"
import { withPicture } from "../hud/UnitPicture"
import { HAND_VISUAL } from "../look/UnitSprites"
import type { UnitSprites } from "../look/UnitSprites"
import { heartsRow, heartText } from "../hud/HeartView"
import { HoverPanel } from "../hud/HoverPanel"
import {
    BUBBLE_TEXT, CHOSEN_TEXT, DIM_TEXT, STAT_DOWN, STAT_UP, TEXT_OUTLINE, WARNING_TEXT,
} from "../look/theme"
import { pictured } from "../library/UpgradeEntry"
import { JourneyView } from "./JourneyView"
import type { MapArt } from "./JourneyView"
import { PointingArm } from "./PointingArm"
import { ShownParty } from "./ShownParty"
import { CUE_ANIMATIONS } from "./travelLooks"
import { TravelScenes } from "./TravelScenes"
import type { TravelScene } from "./TravelScenes"

/** The share of the width the column of the party takes, on the left. */
const SIDE_SHARE = 0.3

/** How many lines the panel telling what is hovered holds. */
const TOLD_LINES = 3

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

/** How opaque the panels are, letting the scene show through. */
const VEIL_ALPHA = 0.62

/** The face of a character of the party in its row, and of the one selected. */
const TILE = new Color(0.1, 0.09, 0.14, 0.8)
const SELECTED_TILE = new Color(0.3, 0.26, 0.42, 0.9)

/** How the texts of a dialog are written, to read on the scene. */
const ON_SCENE: ParagraphOptions = { outline: TEXT_OUTLINE }

/** What the panel telling what is hovered says on the map while nothing is. */
const MAP_HINT = "Survole un lieu pour savoir ce qu'il cache, suis un chemin rouge et clique son lieu pour y aller."

/** What it says on the map while nothing is, when the party may go back into the halt it stands on. */
const RETURN_HINT = `${MAP_HINT} Clique le lieu où se tient l'équipe pour y retourner.`

/** What it says under the cards of a dialog while none is hovered. */
const CARD_HINT = "Survole une carte pour lire ce qu'elle fait."

/** What it says on the map while the players may not choose where the party goes. */
const WAITING_HINT = "En attente..."

/** How long the party takes to slide from a place to another, in seconds, however far it is. */
export const WALK_TIME = 0.5

/** What the players may not do on the screen, the rest being theirs. */
export interface TravelLocks {
    /** May they not choose where the party goes? */
    readonly map: boolean
}

/** Nothing locked: the players play the journey. */
export const NO_TRAVEL_LOCKS: TravelLocks = { map: false }

/** What a screen is built with, besides what it shows. */
export interface TravelScreenOptions {
    readonly theme: Theme

    /** Where the pictures of the scenes come from. */
    readonly assets: Assets

    /** The pictures of the units: by each character, and where the party stands on the map. */
    readonly sprites: UnitSprites

    /** What the players may not do, nothing by default. */
    readonly locks?: TravelLocks

    /** Play a transition into a place over the screen, done at its middle, at once when it cannot be. */
    enter(path: LayeredImagePath): Promise<void>

    /** Tell the players something went wrong. */
    report(text: string): void
}

/**
 * A step of the choice open: what it shows, what a pick in it does, what an option hovered tells, and the
 * character it shows, when it offers characters.
 */
interface StepOfChoice {
    readonly step: ChoiceStep
    pick(index: number): void
    tell(index: number): Text|null
    show?(index: number): void
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

/**
 * The journey of a {@link Travel}, between the fights, over the scene of where the party stands, framed by
 * its border. On the left, where it stands, its characters, and the one selected in full: its hearts, then in
 * tabs its deck and its items, or its stats. On the right, the map of the floor, or the dialog of the halt
 * visited, and under it what the pointer hovers. A click on a place the party may go to goes there, the
 * party sliding along the path before the transition plays: a fight goes to its battle, a halt opens its
 * visit, over its own scene, its character standing before it, behind the panels. A halt left with the run
 * as it was may be clicked again, to go back into it.
 *
 * @remarks
 * A halt shows its name and what it does, then the dialog open, then the way back or out on the left and
 * the way on on the right. Offers and characters are asked as the steps of one {@link Choice}: a
 * character asked while a pick is being taken in becomes the next step of the choice open, so a card and
 * who takes it are chosen on one screen. Any other dialog replaces the screen. Each dialog builds the
 * screen again whole: what the pointer hovers only changes the text of a paragraph, set in place, and the
 * character shown only rebuilds its own panels.
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

    /** Show another travel in place of this one, what was going on dropped. */
    public set engine(travel: Travel){
        this.#unregisterObservers()
        this.#stopAnimations()
        this.#engine = travel
        this.#registerObservers()
        this.animations.add(instant(() => this.#fill()))
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
        this.#layer = ui.addLayer("travel")
        this.#scenes = new TravelScenes(ui.gpu, assets, ui)
        this.#scroll = new Scroll(theme, { width: MARGIN, height: MARGIN })
        this.#partyScroll = new Scroll(theme, { axis: "horizontal", width: MARGIN, height: MARGIN })
        this.#mapScroll = new Scroll(theme, { width: MARGIN, height: MARGIN, bar: false, wheel: false })
        this.#stuffScroll = new Scroll(theme, { width: MARGIN, height: MARGIN })
        this.#statsScroll = new Scroll(theme, { width: MARGIN, height: MARGIN })
        this.#told = new DetailBox(theme, { color: DIM_TEXT, scrolled: true })
        this.#veil = NineSlice.flat(theme.white, new Color())
        this.#arm = new PointingArm(ui)
        void this.#loadArm(assets)
        void this.#loadMapArt(assets)
        void this.#loadBag(assets)
        this.#detailTabs = new Tabs(theme, [
            { title: "Stuff", build: () => this.#detailed(this.#stuffScroll, this.#stuff()) },
            { title: "Stats", build: () => this.#detailed(this.#statsScroll, this.#heroStats()) },
        ])
        sprites.whenLoaded(() => this.refresh())
        this.#registerObservers()
        this.animations.add(instant(() => this.#fill()))
    }


    /** Are its panels shown? Its host hides them during the battles. */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        this.#layer.content.visible = visible
    }

    /** Show the map, what was being walked over at once, the party to go on from where it stands. */
    public showMap(): void {
        this.#clock.finish()
        this.#arriving = false
        this.#arm.disappear()
        this.#queued = null
        this.#dialog = null
        this.#fill()
    }

    /** Stop showing the travel. */
    public dispose(): void {
        this.#unregisterObservers()
        this.#stopAnimations()
    }

    /**
     * Play the journey on, lay the panels out again when the interface changed size, and have the bubble
     * of the halt point at the head of its character, as it moves, and the box of what is hovered read the
     * input.
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
        this.#told.frame(input, this.ui.pointerX, this.ui.pointerY)
    }

    /** Build the panels again, from the run as it stands. */
    public refresh(): void {
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        const visiting = this.#visiting
        const look = visiting?.look ?? this.engine.floor.type.look
        const { r, g, b } = look.color
        this.#veil = NineSlice.flat(this.theme.white, new Color(r, g, b, VEIL_ALPHA))
        const failed = (error: AssetError): void => {
            const place = visiting?.title ?? this.engine.floor.type.name
            this.options.report(`Le décor de ${place} n'a pas pu être chargé : ${error.message}`)
        }
        const scene = visiting
            ? this.#scenes.haltScene(look, () => this.refresh(), failed)
            : this.#scenes.mapScene(look, () => this.refresh(), failed)
        if(scene) content.add(scene.backdrop, { x: "stretch", y: "stretch" })
        if(scene?.pnj){
            scene.pnj.parent?.remove(scene.pnj)
            content.add(scene.pnj, { x: "stretch", y: "stretch" })
        }
        this.#scene = scene
        this.#bubble = null
        this.#hint = this.#mapHint
        this.#mapView = null
        const dialog = this.#shownDialog
        const middle = dialog ? dialog() : this.#map()
        const right = new Box("column", { gap: MARGIN, align: "stretch" })
        right.add(middle, { grow: 1 })
        right.add(this.#toldPanel())
        const row = new Box("row", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        row.fixedSize = { width: this.ui.width, height: this.ui.height }
        row.add(this.#side())
        row.add(right, { grow: 1 })
        content.add(row, { x: "start", y: "start" })
        if(scene){
            const border = new Panel(this.theme, { background: scene.border, padding: 0, interactive: false })
            content.add(border, { x: "stretch", y: "stretch" })
        }
        content.add(this.#arm, { x: "stretch", y: "stretch" })
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

    #engine: Travel

    #locks: TravelLocks

    /** The time of what it plays, told by its frames. */
    readonly #clock = new FrameClock()

    /** What it listens to on the travel it follows. */
    #observers: Observer[] = []

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

    /** What the pointer hovers, under the map or the dialog. */
    readonly #told: DetailBox

    /** What the map is drawn with, none before it is loaded: the panels and the codes show meanwhile. */
    #mapArt: MapArt|null = null
    #bagFrame: NineSlice|null = null

    /** The map shown, none while a dialog is. */
    #mapView: JourneyView|null = null

    /** Where the map shows the party, behind the travel while its way is played. */
    readonly #shownParty = new ShownParty()

    /** The scroll of the map, which the players do not move: it follows where the party stands. */
    readonly #mapScroll: Scroll

    /** Is the map to be scrolled to where the party stands, once laid out? */
    #mapFocus = false

    /** The forearm over a halt, pointing at the pointer: it rises when a halt is visited, and sinks after. */
    readonly #arm: PointingArm

    /** What it says while nothing is hovered. */
    #hint: Text = ""

    /** The bubble telling what the halt visited does, none while the map is shown. */
    #bubble: Bubble|null = null

    /** Where the head of the character of the halt is, so pointing at it allocates nothing. */
    readonly #head = { x: 0, y: 0 }

    /** The face of the panels, in the color of the place. */
    #veil: NineSlice

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

    /** The step asked while a pick was taken in, none when none was. */
    #pending: StepOfChoice|null = null

    /** Is the transition into a visit going on? The map stays shown until its middle, whatever is asked. */
    #arriving = false

    /** The halt being visited, none while the map is shown. */
    get #visiting(): Halt|null {
        return this.#arriving ? null : this.engine.halt
    }

    /** What builds the dialog shown, none while the map is. */
    get #shownDialog(): (() => Component)|null {
        return this.#arriving ? null : this.#dialog
    }

    /** How wide the column of the party is. */
    get #sideWidth(): number {
        return Math.floor(this.ui.width * SIDE_SHARE)
    }

    /** What it says while nothing is hovered, before a dialog says otherwise. */
    get #mapHint(): Text {
        if(this.#shownDialog) return ""
        if(this.#locks.map) return WAITING_HINT
        return this.engine.returnable ? RETURN_HINT : MAP_HINT
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
        this.#observers = [
            travel.moved.add(({ to }) => this.animations.add(() => this.#walk(travel, to))),
            travel.phaseChanged.add(phase => {
                if(phase === "entering") this.animations.add(instant(() => this.#enter(travel)))
            }),
            travel.mapDrawn.add(() => this.animations.add(instant(() => this.#fill()))),
            travel.loaded.add(() => {
                // A map that stands makes what was on its way to it pointless.
                this.#stopAnimations()
                this.animations.add(instant(() => this.#fill()))
            }),
            travel.offerAsked.add(dialog => this.#showOffer(dialog)),
            travel.heroAsked.add(dialog => this.#showHero(dialog)),
            travel.cardsAsked.add(dialog => this.#showCards(dialog)),
            travel.confirmAsked.add(dialog => this.#showConfirm(dialog)),
            travel.told.add(dialog => this.#showTold(dialog)),
            travel.reacted.add(moment => this.#react(moment)),
            travel.visitStarted.add(halt => {
                this.#arriving = true
                this.animations.add(() => this.#arrive(halt))
            }),
            travel.visitEnded.add(() => this.showMap()),
        ]
    }

    #unregisterObservers(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
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
        await this.options.enter(halt.type.transition)
        if(this.engine.halt !== halt) return
        this.#arriving = false
        this.#arm.appear()
        this.refresh()
    }

    /** Tie the map to what the players do: going to the place they click. */
    #connectInputs(view: JourneyView): void {
        view.onPick = place => this.go(place)
    }


    //// The dialogs of a halt ////

    #showOffer(dialog: OfferDialog): void {
        const options = dialog.offers.map(shown => {
            const head = shown.unit ? unitHead(this.theme, shown.unit, this.sprites) : null
            const under = this.#stuffShown(shown, "mini", OFFERED_DECK_ROOM, {})
            return cardsOption(this.theme, cardsOf(shown), shown.text ?? null, {
                head, under, before: this.#boostersShown(shown), deck: this.#placeOf(shown.from),
                sprite: shown.sprite, sprites: this.sprites,
                // The cards of an ally, a character or a monster, overlap.
                overlapped: Boolean(shown.unit || shown.sprite),
            })
        })
        this.#choose({
            step: { title: this.#title(dialog.title), options },
            pick: index => this.engine.takeOffer(dialog, index),
            tell: index => dialog.offers[index].text ?? null,
        }, dialog, false)
    }

    #showHero(dialog: HeroDialog): void {
        const { heroes } = dialog
        const options = heroes.map(each => heroOption(this.theme, each, this.sprites))
        this.#choose({
            step: { title: this.#title(dialog.title), options },
            pick: index => this.engine.takeHero(dialog, heroes[index]),
            tell: index => concat(heroes[index], " : ", `${allCards(heroes[index]).length} cartes.`),
            show: index => this.#select(heroes[index]),
        }, dialog, dialog.follows)
    }

    #showCards(dialog: CardsDialog): void {
        const { count, pool, selectable } = dialog
        // The places of the cards picked, in the order picked, so two copies are two picks.
        const picked: number[] = []
        const build = (): Component => {
            this.#hint = CARD_HINT
            const column = new Box("column", { gap: MARGIN })
            column.add(new DeckView(this.theme, pool, {
                room: this.#middleRoom(),
                size: "chain",
                deck: this.#placeOf(dialog.from),
                tell: text => this.#tell(text),
                pickable: (_, index) => {
                    if(!selectable[index]) return null
                    return {
                        picked: picked.includes(index),
                        pick: () => {
                            const at = picked.indexOf(index)
                            if(at >= 0) picked.splice(at, 1)
                            else if(picked.length < count.max) picked.push(index)
                            else if(count.max === 1) picked.splice(0, 1, index)
                            this.#open(build)
                        },
                    }
                },
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
            this.#arm.sprite = await PointingArm.loadSprite(this.ui.gpu, assets)
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

    /** Tell what is hovered, or the hint when nothing is. */
    #tell(text: Text|null): void {
        this.#told.tell(text)
    }

    /**
     * Ask a step of a choice: the next step of the choice open when it follows one of its picks, else the
     * first step of a new choice, left by the way of its dialog.
     */
    #choose(step: StepOfChoice, dialog: Dialog, follows: boolean): void {
        if(follows){
            this.#pending = step
            return
        }
        const steps: StepOfChoice[] = [step]
        this.#steps = steps
        const choice = new Choice(this.theme, picks => this.#nextStep(steps, picks), () => {}, {
            gap: OPTION_GAP, spacing: STEP_SPACING,
            picked: { frame: NineSlice.flat(this.theme.white, CHOSEN_TEXT), width: PICKED_WIDTH },
        })
        this.#open(() => this.#choiceFrame(choice, steps, dialog))
    }

    /**
     * The step following picks in a choice: the pick of the last step taken in, then the step it asked,
     * none when it asked none, its dialog having replaced the choice or the visit being over.
     */
    #nextStep(steps: StepOfChoice[], picks: readonly number[]): ChoiceStep|null {
        if(picks.length === 0) return steps[0].step
        const depth = picks.length - 1
        steps.length = depth + 1
        this.#pending = null
        steps[depth].pick(picks[depth])
        const pending = this.#takePending()
        if(!pending || this.#steps !== steps) return null
        steps.push(pending)
        return pending.step
    }

    /** The step asked while a pick was taken in, none when none was, forgotten once taken. */
    #takePending(): StepOfChoice|null {
        const pending = this.#pending
        this.#pending = null
        return pending
    }

    /** Show a character in full, in place of the one shown. */
    #select(hero: Hero): void {
        if(hero === this.#selected) return
        this.#selected = hero
        this.#fillParty()
        this.#fillDetail()
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
        column.add(this.#panel(this.#partyScroll))
        this.#fillParty()
        column.add(this.#panel(this.#detail), { grow: 1 })
        this.#fillDetail()
        return column
    }

    /** Where the party stands: the halt visited or the floor, its level, the depth and the gold. */
    #where(): Component {
        const { floor, depth } = this.engine
        const column = new Box("column", { gap: 1 })
        const place = this.#visiting?.title ?? floor.type.name
        column.add(this.#label(place, CHOSEN_TEXT))
        column.add(this.#label(`Niveau ${floor.level} · Profondeur ${depth} · ${this.run.gold} or`, DIM_TEXT))
        return this.#panel(column)
    }

    /** The characters of the party in a row, the one shown lit, a click on one showing it. */
    #fillParty(): void {
        const shown = this.#shownHero()
        const row = new Box("row", { gap: MARGIN, align: "start" })
        let tallest = 0
        for(const hero of this.run.heroes){
            const block = new Box("column", { gap: 1 })
            block.add(this.#label(hero.name, hero === shown ? CHOSEN_TEXT : undefined))
            block.add(this.#hearts(hero))
            const things = hero.items.length + hero.usables.length
            block.add(this.#label(`${allCards(hero).length} cartes · ${things} objets`, DIM_TEXT))
            const tile = new HoverPanel(this.theme, {
                background: NineSlice.flat(this.theme.white, hero === shown ? SELECTED_TILE : TILE),
                padding: 2,
            })
            tile.content = withPicture(this.sprites, hero.sprite, block)
            tile.onPick = () => this.#select(hero)
            tallest = Math.max(tallest, tile.measure(Infinity).preferredHeight)
            row.add(tile)
        }
        this.#partyScroll.content = row
        this.#partyScroll.fixedSize = {
            width: this.#sideWidth - 2 * this.theme.panel.padding,
            height: tallest + this.theme.scrollbar.width + 1,
        }
    }

    /** The hearts of a character, each told on hover. */
    #hearts(hero: Hero): Component {
        return heartsRow(this.theme, hero.hearts, (heart, over) => this.#tell(over ? heartText(heart) : null))
    }

    /** The character shown in full: its name and hearts, then its tabs. */
    #fillDetail(): void {
        const hero = this.#shownHero()
        const detail = this.#detail
        for(const child of [...detail.children]) detail.remove(child)
        if(!hero) return
        const head = new Box("row", { gap: MARGIN, align: "center" })
        head.add(this.#label(hero.controller === "bot" ? `${hero.name} (bot)` : hero.name, CHOSEN_TEXT))
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
                const { usable } = first
                const left = members.reduce((sum, carried) => sum + carried.charges, 0)
                const full = members.length * (usable.charges ?? 1)
                return this.#thingView(usable.icon, stackUsesText(usable, left, full), countTold(usableText(usable), members.length))
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
        // A party of none is a giant hand floating where the party would stand.
        const looks = this.run.heroes.length > 0 ? this.run.heroes.map(hero => hero.sprite) : [HAND_VISUAL]
        view.party = looks.flatMap(look => {
            const sprite = this.sprites.of(look)
            return sprite ? [sprite] : []
        })
        this.#mapView = view
        this.#connectInputs(view)
        view.onHover = place => {
            const info = place && infoOf(place)
            this.#tell(info ? concat(info.name, " : ", info.description) : null)
        }
        this.#mapScroll.content = view
        this.#mapFocus = true
        const paper = this.#mapArt?.paper
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
        this.#mapScroll.offset = view.partyRowBottom() - this.#mapScroll.bounds.height
    }

    /** What the pointer hovers, as tall as a few lines whatever it says. */
    #toldPanel(): Component {
        this.#told.parent?.remove(this.#told)
        this.#told.tell(null)
        this.#told.hint = this.#hint
        const panel = this.#panel(this.#told)
        const lineHeight = this.theme.font.lineHeight * this.theme.textScale
        const room = this.theme.panel.padding + this.#told.padding
        panel.fixedSize = { width: 0, height: TOLD_LINES * lineHeight + 2 * room }
        return panel
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
                button.enabled = next.enabled ?? true
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
        middle.add(choice, { x: "stretch", y: "end" })
        choice.onHover = (depth, index, over) => {
            if(over) steps[depth]?.show?.(index)
            this.#tell(over ? steps[depth]?.tell(index) ?? null : null)
        }
        return this.#haltFrame(null, middle, dialog, null)
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
        if(shown.decks?.length) this.#hint = CARD_HINT
        const stuff = this.#stuffShown(shown, "chain", this.#middleRoom(), ON_SCENE)
        if(stuff) column.add(stuff)
        if(shown.text !== undefined){
            column.add(new Paragraph(this.theme, shown.text, { ...ON_SCENE, onLink: this.#told.hearLink }))
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
            ...stacked(usables, usable => usable).map(({ first, members }) => {
                const full = members.length * (first.charges ?? 1)
                return this.#thingView(first.icon, stackUsesText(first, full, full), countTold(usableText(first), members.length))
            }),
        ]
        if(things.length > 0) column.add(this.#bag(things), { align: "start" })
        return column
    }

    /** Things in a bag, to add to a column aligned at its start so the bag wraps at the width of the column. */
    #bag(things: readonly Component[]): BagView {
        return new BagView(this.theme, things, this.#bagFrame)
    }

    /** Give the bags their frame once loaded, telling when it could not be. */
    async #loadBag(assets: Assets): Promise<void> {
        try {
            this.#bagFrame = await BagView.loadFrame(this.ui.gpu, assets)
        } catch(error){
            if(!(error instanceof AssetError)) throw error
            this.options.report(`Le sac n'a pas pu être chargé : ${error.message}`)
            return
        }
        this.refresh()
    }

    /** A deck of the party with its cards, named and colored by its place among those of its character. */
    #deckView(deck: readonly Card[], size: CardPlace, room: number, look: ParagraphOptions): DeckView {
        const owner = this.#ownerOf(deck)
        return new DeckView(this.theme, deck, {
            room, size,
            name: owner && deckLine(owner, deck),
            nameLook: { ...look, onLink: this.#told.hearLink },
            deck: this.#placeOf(deck),
            tell: text => this.#tell(text),
        })
    }

    /** Items as pictures, the same ones in one with their count. */
    #itemViews(items: readonly Item[]): AbsItemIcon[] {
        return stacked(items, item => item).map(({ first, members }) => {
            return this.#thingView(first.icon, countText(members.length), countTold(described(first, first), members.length))
        })
    }

    /** An item or a usable, as its picture with its uses left, lit and told on hover. */
    #thingView(icon: Visual, uses: string|null, told: Text): AbsItemIcon {
        const view = new AbsItemIcon(this.theme, this.sprites, icon, uses ?? "", 1, THING_ICON_SIZE)
        view.onHover = over => this.#tell(over ? told : null)
        return view
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
        const upgrades = (shown.upgrades ?? []).map(upgrade => new CardView(this.theme, pictured(upgrade), "hand"))
        return [...boosters.map(booster => boosterView(this.theme, booster, this.sprites.booster)), ...upgrades]
    }

    #cardView(card: Card, deck: number|null): CardView {
        this.#hint = CARD_HINT
        const view = new CardView(this.theme, card, "chain")
        view.deck = deck
        view.onHover = over => this.#tell(over ? cardText(card) : null)
        return view
    }

    /** A panel in the color of the place, the scene showing through. */
    #panel(content: Component): Panel {
        content.parent?.remove(content)
        const panel = new Panel(this.theme, { background: this.#veil })
        panel.content = content
        return panel
    }

    #paragraph(text: Text, color?: Color): Paragraph {
        return new Paragraph(this.theme, text, { onLink: this.#told.hearLink, ...color ? { color } : {} })
    }

    /** The title of a dialog, outlined to read on the scene, in the color of what is chosen by default. */
    #title(text: Text, color: Color = CHOSEN_TEXT): Paragraph {
        return new Paragraph(this.theme, text, { color, outline: TEXT_OUTLINE, onLink: this.#told.hearLink })
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
