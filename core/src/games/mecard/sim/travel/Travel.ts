import type { Text } from "../../../../semantic"
import { Observable } from "../base/Observable"
import type { Card } from "../card/Card"
import { exitsOf } from "../catalog/floors"
import { HALT_TYPES } from "../catalog/halts"
import type { Floor } from "../floor/Floor"
import type { Halt } from "../halt/Halt"
import type { CardChoosing, Choosing, Count, HaltContext, Shown, Way } from "../halt/HaltContext"
import type { HaltMoment } from "../halt/SceneLook"
import type { Hero } from "../run/Hero"
import { isHalt, Journey } from "../run/Journey"
import type { HaltKind, Place } from "../run/Journey"
import type { Run } from "../run/Run"

import { CardsDialog, ConfirmDialog, HeroDialog, OfferDialog, TellDialog } from "./dialogs"
import type { Dialog } from "./dialogs"

/**
 * Where a journey stands: on the map, the players choosing where to go; entering a place; visiting a halt;
 * or at a fight, until the run is done with it.
 */
export type TravelPhase = "map"|"entering"|"visit"|"fight"

/** The party went from a place to another. */
export interface PlaceMove {
    /** Where it stood, none before the first place of the floor. */
    readonly from: Place|null

    readonly to: Place
}

/**
 * A journey at a rest, on the map: all it takes to stand a {@link Travel} there again. The halts made so far
 * are not in it: read back, a halt is made anew when asked for, and none may be gone back into.
 */
export interface TravelState {
    readonly floor: Floor
    readonly journey: Journey
    readonly place: Place|null
    readonly depth: number
}

/** A dialog open, and what its answers do, in the indices of what it offers. */
interface Step {
    readonly dialog: Dialog
    answer(picks: readonly number[]): void
    readonly back: (() => void)|undefined
}

/**
 * The journey of a run between its fights: the floor, its map, where the party stands, the halt it visits
 * and the dialog open there.
 *
 * @remarks
 * As a battle does, it holds where it stands, tells what happens through its observables, and moves only
 * when told to: {@link Travel.go} leaves the party entering its place, and whoever shows the journey calls
 * {@link Travel.enter} once it showed the way in. A fight is only told, by {@link Travel.fightReached}:
 * fighting it is up to the run.
 *
 * The halts ask their questions through a {@link HaltContext} only it holds, each question opening a
 * {@link Dialog}, answered by its `take` methods. A character asked while a pick is taken in follows the
 * dialog of that pick, which stays open: answering it again takes back the steps after it. So
 * {@link Travel.dialogs} is a list, and an answer says which dialog it is for.
 */
export class Travel {


    //// Triggers ////

    /** The party went to another place of the map. */
    public readonly moved: Observable<PlaceMove>

    /** The journey went into another phase. */
    public readonly phaseChanged: Observable<TravelPhase>

    /** The party went into a floor, on its new map. */
    public readonly floorEntered: Observable<Floor>

    /** The map was drawn anew, the party standing before its first layer. */
    public readonly mapDrawn: Observable<Journey>

    /** A visit opens, before its first dialog. */
    public readonly visitStarted: Observable<Halt>

    /** A visit closed, however it ended. */
    public readonly visitEnded: Observable<Halt>

    /** The party came to a fight. Nothing goes on until the run fought it. */
    public readonly fightReached: Observable<Place>

    /** Things are offered. */
    public readonly offerAsked: Observable<OfferDialog>

    /** A character is asked for. */
    public readonly heroAsked: Observable<HeroDialog>

    /** Cards are asked for. */
    public readonly cardsAsked: Observable<CardsDialog>

    /** Something is shown, to go on with or not. */
    public readonly confirmAsked: Observable<ConfirmDialog>

    /** What came of the visit is told. */
    public readonly told: Observable<TellDialog>

    /** The character of the halt visited reacts to a moment of the visit. */
    public readonly reacted: Observable<HaltMoment>


    //// State ////

    /** How many places the party went to, from 1 once it stands on the first, the exits not counted. */
    public depth = 1

    /** The floor being gone through. */
    public floor: Floor

    /** The map of the floor. */
    public journey: Journey

    constructor(
        /** The run it is the journey of. */
        public readonly run: Run,

        floor: Floor,
    ){
        const { report } = run
        this.moved = new Observable(report)
        this.phaseChanged = new Observable(report)
        this.floorEntered = new Observable(report)
        this.mapDrawn = new Observable(report)
        this.visitStarted = new Observable(report)
        this.visitEnded = new Observable(report)
        this.fightReached = new Observable(report)
        this.offerAsked = new Observable(report)
        this.heroAsked = new Observable(report)
        this.cardsAsked = new Observable(report)
        this.confirmAsked = new Observable(report)
        this.told = new Observable(report)
        this.reacted = new Observable(report)
        this.floor = floor
        this.journey = this.#newJourney()
    }


    public get phase(): TravelPhase { return this.#phase }

    /** The place the party stands on, none before the first of the floor. */
    public get place(): Place|null { return this.#place }

    /** The halt being visited, none out of a visit. */
    public get halt(): Halt|null { return this.#halt }

    /** The steps of the dialog open, from its first, none when none is. */
    public get dialogs(): readonly Dialog[] {
        return this.#steps.map(step => step.dialog)
    }

    /** The places the party may go to next. */
    public get next(): readonly Place[] {
        return this.journey.nextOf(this.#place)
    }

    /**
     * The place the party may go back into, where it stands: a halt it visited and left with the run as it
     * was, none otherwise. Asking makes no halt, so it draws nothing, and a halt never entered is not one.
     */
    public get returnable(): Place|null {
        const place = this.#place
        const halt = place && this.#halts.get(place)
        return halt && !halt.hasImpact ? place : null
    }

    /**
     * The halt a place holds: made the first time it is asked for, then the same, what it offers staying.
     *
     * @throws {@link Error} When the place holds a fight.
     */
    public haltOf(place: Place): Halt {
        const { kind } = place
        if(!isHalt(kind)) throw new Error(`A place of kind ${kind} holds a fight, not a halt.`)
        const kept = this.#halts.get(place)
        if(kept) return kept
        const halt = HALT_TYPES[kind].create(this.run)
        this.#halts.set(place, halt)
        return halt
    }


    //// Saving ////

    /**
     * Where the journey stands, at a rest.
     *
     * @throws {@link Error} Out of the map, a visit or a way in being no rest.
     */
    public state(): TravelState {
        if(this.#phase !== "map") throw new Error(`A journey is written down on the map, not during ${this.#phase}.`)
        return { floor: this.floor, journey: this.journey, place: this.#place, depth: this.depth }
    }

    /**
     * Stand the journey where a state has it, nothing told: it is another journey, not a move of this one.
     * The run makes its journey itself, so a state is read back into it rather than into a new one.
     */
    public restore({ floor, journey, place, depth }: TravelState): void {
        this.floor = floor
        this.journey = journey
        this.depth = depth
        this.#place = place
        this.#halts.clear()
    }


    //// Going ////

    /**
     * Go to a place the party may go to next, or back into the halt it stands on, and wait to be entered:
     * see {@link Travel.enter}.
     *
     * @throws {@link Error} Out of the map, or when the party cannot go there.
     */
    public go(place: Place): void {
        if(this.#phase !== "map") throw new Error(`The party goes on from the map, not during ${this.#phase}.`)
        if(place !== this.returnable){
            if(!this.next.includes(place)) throw new Error("The party goes only to a place its place leads to.")
            if(this.#place && !place.exitTo) this.depth++
            this.#standOn(place)
        }
        this.#enterPhase("entering")
    }

    /**
     * Enter the place the party went to: its visit opens, or its fight is told. Whoever shows the journey
     * calls it once it showed the way in.
     *
     * @throws {@link Error} When the party is not entering a place.
     */
    public enter(): void {
        const place = this.#place
        if(this.#phase !== "entering" || !place) throw new Error("The party is entering no place.")
        if(isHalt(place.kind)){
            this.#open(this.haltOf(place))
            return
        }
        this.#enterPhase("fight")
        this.fightReached.notify(place)
    }

    /**
     * Visit a new halt of a kind where the party stands, without going anywhere. It belongs to no place, so
     * nothing of it stays once left.
     *
     * @throws {@link Error} Out of the map.
     */
    public visit(kind: HaltKind): void {
        if(this.#phase !== "map") throw new Error(`The party visits from the map, not during ${this.#phase}.`)
        this.#open(HALT_TYPES[kind].create(this.run))
    }

    /**
     * Back to the map, from a visit, closed, or from a fight. A party entering a place has left nothing
     * yet, so nothing is done then.
     */
    public leave(): void {
        if(this.#phase === "entering") return
        const halt = this.#halt
        this.#steps.length = 0
        // Forgotten first, so the visit is over for whatever the halt does as it stops.
        this.#halt = null
        halt?.stop(this.#context)
        this.#enterPhase("map")
        if(halt) this.visitEnded.notify(halt)
    }

    /** Stand the party on any place, without entering it. */
    public jump(place: Place): void {
        this.#standOn(place)
    }

    /** Go into a floor, its map new, the party standing before its first layer. */
    public enterFloor(floor: Floor): void {
        this.depth++
        this.floor = floor
        this.redrawMap()
        this.floorEntered.notify(floor)
    }

    /** Draw the map of the floor anew, the party standing before its first layer. */
    public redrawMap(): void {
        this.journey = this.#newJourney()
        this.#place = null
        this.#halts.clear()
        this.mapDrawn.notify(this.journey)
    }


    //// Answering ////

    /**
     * Take one of the things of a dialog offering some.
     *
     * @throws {@link Error} When the dialog is not open, or offers nothing at that index.
     */
    public takeOffer(dialog: OfferDialog, index: number): void {
        if(index < 0 || index >= dialog.offers.length) throw new Error(`The dialog offers nothing at ${index}.`)
        this.#answer(dialog, [index])
    }

    /**
     * Take a character a dialog asks for.
     *
     * @throws {@link Error} When the dialog is not open, or does not let that character be taken.
     */
    public takeHero(dialog: HeroDialog, hero: Hero): void {
        const index = dialog.heroes.indexOf(hero)
        if(index < 0) throw new Error(`${hero.name} cannot be taken here.`)
        this.#answer(dialog, [index])
    }

    /**
     * Take the cards a dialog asks for, by their places in its pool, so two copies are two picks.
     *
     * @throws {@link Error} When the dialog is not open, or the picks are not what it asks.
     */
    public takeCards(dialog: CardsDialog, indices: readonly number[]): void {
        const { count, selectable } = dialog
        if(indices.length < count.min || indices.length > count.max){
            throw new Error(`The dialog asks ${count.min} to ${count.max} cards, not ${indices.length}.`)
        }
        if(new Set(indices).size < indices.length) throw new Error("A card cannot be picked twice.")
        if(!indices.every(index => selectable[index])) throw new Error("The dialog does not let that card be picked.")
        this.#answer(dialog, indices)
    }

    /**
     * Go on with what a dialog shows.
     *
     * @throws {@link Error} When the dialog is not open.
     */
    public accept(dialog: ConfirmDialog): void {
        this.#answer(dialog, [])
    }

    /**
     * Go back to the dialog before one.
     *
     * @throws {@link Error} When the dialog is not open, or has none before it.
     */
    public goBack(dialog: Dialog): void {
        const at = this.#indexOf(dialog)
        const { back } = this.#steps[at]
        if(!back) throw new Error("The dialog has no way back: it is left by leaving the place.")
        this.#steps.length = at + 1
        this.#context.react("refuse")
        back()
    }


    #phase: TravelPhase = "map"
    #place: Place|null = null
    #halt: Halt|null = null

    /** The halts of the floor made so far, by their place. */
    readonly #halts = new Map<Place, Halt>()

    /** The steps of the dialog open, from its first. */
    readonly #steps: Step[] = []

    /** Is an answer being taken in? A character asked meanwhile is the next step of the dialog. */
    #picking = false

    /** What the halts ask through. */
    readonly #context: HaltContext = {
        offer: <T>(
            title: Text, offers: readonly T[], show: (offer: T) => Shown, done: (offer: T) => void,
            way: Way = {},
        ): void => {
            const dialog = new OfferDialog(title, way.back !== undefined, offers.map(show))
            this.#ask(dialog, ([index]) => done(offers[index]), way)
            this.offerAsked.notify(dialog)
        },
        hero: (title: Text, done: (hero: Hero) => void, pick: Choosing<Hero> = {}): void => {
            const heroes = this.run.heroes.filter(pick.among ?? (() => true))
            if(heroes.length === 0){
                this.#context.tell("Personne dans l'équipe ne peut en profiter.")
                this.#context.react("refuse")
                return
            }
            const follows = this.#picking
            const dialog = new HeroDialog(title, pick.back !== undefined, heroes, follows)
            const answer = ([index]: readonly number[]): void => done(heroes[index])
            if(follows) this.#steps.push({ dialog, answer, back: pick.back })
            else this.#ask(dialog, answer, pick)
            this.heroAsked.notify(dialog)
        },
        cards: (
            title: Text, pool: readonly Card[], count: Count, done: (cards: Card[]) => void,
            pick: CardChoosing = {},
        ): void => {
            const among = pick.among ?? (() => true)
            const selectable = pool.map(card => among(card))
            const back = pick.back !== undefined
            const dialog = new CardsDialog(title, back, pool, selectable, count, pick.from ?? pool)
            this.#ask(dialog, picks => done(picks.map(index => pool[index])), pick)
            this.cardsAsked.notify(dialog)
        },
        confirm: (title: Text, shown: Shown, action: string, done: () => void, way: Way = {}): void => {
            const dialog = new ConfirmDialog(title, way.back !== undefined, shown, action)
            this.#ask(dialog, () => done(), way)
            this.confirmAsked.notify(dialog)
        },
        tell: (text: Text, shown?: Shown): void => {
            this.#context.react("done")
            const dialog = new TellDialog(text, shown ?? null)
            this.#ask(dialog, () => {}, {})
            this.told.notify(dialog)
        },
        leave: () => this.leave(),
        react: (moment: HaltMoment): void => {
            if(this.#halt) this.reacted.notify(moment)
        },
    }

    /** A map filled by the floor, its exits leading to the floors after it. */
    #newJourney(): Journey {
        const map = new Journey(this.run.rng)
        this.floor.fillMap(map)
        map.addExits(exitsOf(this.floor))
        return map
    }

    #enterPhase(phase: TravelPhase): void {
        if(phase === this.#phase) return
        this.#phase = phase
        this.phaseChanged.notify(phase)
    }

    #standOn(place: Place): void {
        const from = this.#place
        this.#place = place
        this.moved.notify({ from, to: place })
    }

    /** Open the visit of a halt. */
    #open(halt: Halt): void {
        this.#halt = halt
        this.#enterPhase("visit")
        this.visitStarted.notify(halt)
        this.#context.react("arrive")
        halt.start(this.#context)
    }

    /** Open a dialog in place of the one open. */
    #ask(dialog: Dialog, answer: Step["answer"], way: Way): void {
        this.#steps.splice(0, this.#steps.length, { dialog, answer, back: way.back })
    }

    /** Where a dialog stands among the steps open. */
    #indexOf(dialog: Dialog): number {
        const at = this.#steps.findIndex(step => step.dialog === dialog)
        if(at < 0) throw new Error("That dialog is not open.")
        return at
    }

    /** Answer a dialog, the steps after it taken back. */
    #answer(dialog: Dialog, picks: readonly number[]): void {
        const at = this.#indexOf(dialog)
        const step = this.#steps[at]
        this.#steps.length = at + 1
        this.#context.react("pick")
        this.#picking = true
        try {
            step.answer(picks)
        } finally {
            this.#picking = false
        }
    }
}
