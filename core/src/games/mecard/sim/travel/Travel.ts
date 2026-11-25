import type { Text } from "../../../../semantic"
import { Observable } from "../base/Observable"
import type { Card } from "../card/Card"
import { exitsOf } from "../catalog/floors"
import type { Fight } from "../fight/Fight"
import type { Floor } from "../floor/Floor"
import type { Halt } from "../halt/Halt"
import type {
    CardChoosing, CatalogChoosing, CatalogPick, Choosing, Count, HaltContext, Shown, Way,
} from "../halt/HaltContext"
import type { HaltType } from "../halt/HaltType"
import { EXIT_HALT } from "../halt/subs/ExitHalt"
import type { HaltMoment } from "../halt/SceneLook"
import type { Hero } from "../run/Hero"
import { Journey } from "../run/Journey"
import type { Place } from "../run/Journey"
import type { Run } from "../run/Run"
import { loadTravel, saveTravel } from "../save/travelSave"
import type { TravelSave } from "../save/travelSave"

import { CardsDialog, CatalogDialog, ConfirmDialog, HeroDialog, OfferDialog, TellDialog } from "./dialogs"
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
    readonly floorNumber: number|null

    /** The places of the map the party stood on, in order. */
    readonly trail: readonly Place[]
}

/** A dialog answered, and the indices of what was picked in it, none for a dialog only gone on with. */
export interface Answer<D extends Dialog> {
    readonly dialog: D
    readonly picks: readonly number[]

    /** The thing of the catalogue picked, for a dialog that asks for one, which has no list to pick in. */
    readonly pick?: CatalogPick
}

/** What a journey waits for from the players. */
export interface TravelAwaited {
    /** The places they may go to, none out of the map. */
    readonly places: readonly Place[]

    /** The dialogs open, none out of a visit. */
    readonly dialogs: readonly Dialog[]
}

/** A dialog open, and what its answers do, in the indices of what it offers. */
interface Step {
    readonly dialog: Dialog
    answer(picks: readonly number[], pick?: CatalogPick): void
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
 * {@link Dialog}, answered by its `take` methods. A character asked while an offer or a character is taken
 * in follows the dialog of that pick, which stays open: answering it again takes back the steps after it. So
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

    /** A halt changed the run: told at each change it makes, as many times as it makes some. */
    public readonly haltImpacted: Observable<Halt>

    /** A visit closed, however it ended. */
    public readonly visitEnded: Observable<Halt>

    /** The party came to a fight. Nothing goes on until the run fought it. */
    public readonly fightReached: Observable<Place>

    /** The fight reached is fought: its battle starts. */
    public readonly fightEntered: Observable<Place>

    /** The fight left, back to the map, however it ended. */
    public readonly fightLeft: Observable<Place>

    /** Things are offered. */
    public readonly offerAsked: Observable<OfferDialog>

    /** A character is asked for. */
    public readonly heroAsked: Observable<HeroDialog>

    /** Cards are asked for. */
    public readonly cardsAsked: Observable<CardsDialog>

    /** A thing of the catalogue is asked for. */
    public readonly catalogAsked: Observable<CatalogDialog>

    /** Something is shown, to go on with or not. */
    public readonly confirmAsked: Observable<ConfirmDialog>

    /** What came of the visit is told. */
    public readonly told: Observable<TellDialog>

    /** One of the things offered was taken, before what it does. */
    public readonly offerTaken: Observable<Answer<OfferDialog>>

    /** A character asked for was taken, before what it does. */
    public readonly heroTaken: Observable<Answer<HeroDialog>>

    /** The cards asked for were taken, before what it does. */
    public readonly cardsTaken: Observable<Answer<CardsDialog>>

    /** The thing of the catalogue asked for was taken, before what it does. */
    public readonly catalogTaken: Observable<Answer<CatalogDialog>>

    /** What a dialog showed was gone on with, before what it does. */
    public readonly confirmAccepted: Observable<Answer<ConfirmDialog>>

    /** A dialog was gone back from, to the one before it. */
    public readonly wentBack: Observable<Dialog>

    /** The character of the halt visited reacts to a moment of the visit. */
    public readonly reacted: Observable<HaltMoment>

    /** A save was loaded: the party stands on the map it holds, and nothing else was told of it. */
    public readonly loaded: Observable<Travel>


    //// State ////

    /** How many places the party went to, from 1 once it stands on the first, the exits not counted. */
    public depth = 1

    /**
     * Which floor of the run is being gone through, from 1 for the first: none for a run read back from a save
     * that did not tell it, which cannot know.
     */
    public floorNumber: number|null = 1

    /** The places of the map the party stood on, in order, the map of the floor being gone through only. */
    public readonly trail: Place[] = []

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
        this.haltImpacted = new Observable(report)
        this.visitEnded = new Observable(report)
        this.fightReached = new Observable(report)
        this.fightEntered = new Observable(report)
        this.fightLeft = new Observable(report)
        this.offerAsked = new Observable(report)
        this.heroAsked = new Observable(report)
        this.cardsAsked = new Observable(report)
        this.catalogAsked = new Observable(report)
        this.confirmAsked = new Observable(report)
        this.told = new Observable(report)
        this.offerTaken = new Observable(report)
        this.heroTaken = new Observable(report)
        this.cardsTaken = new Observable(report)
        this.catalogTaken = new Observable(report)
        this.confirmAccepted = new Observable(report)
        this.wentBack = new Observable(report)
        this.reacted = new Observable(report)
        this.loaded = new Observable(report)
        this.floor = floor
        this.journey = this.#newJourney()
        Object.defineProperty(this.#context, "fight", { get: () => this.#fight })
    }


    public get phase(): TravelPhase { return this.#phase }

    /** The place the party stands on, none before the first of the floor. */
    public get place(): Place|null { return this.#place }

    /** The halt being visited, none out of a visit. */
    public get halt(): Halt|null { return this.#halt }

    /** The fight reached, or just won while its halt is visited, none otherwise. */
    public get fight(): Fight|null { return this.#fight }

    /** The steps of the dialog open, from its first, none when none is. */
    public get dialogs(): readonly Dialog[] {
        return this.#steps.map(step => step.dialog)
    }

    /** The places the party may go to next. */
    public get next(): readonly Place[] {
        return this.journey.nextOf(this.#place)
    }

    /** What it waits for from the players: a place to go to on the map, or the answers of a visit. */
    public get awaited(): TravelAwaited {
        const { returnable } = this
        const onMap = this.#phase === "map"
        const places = onMap ? [...this.next, ...returnable ? [returnable] : []] : []
        return { places, dialogs: this.dialogs }
    }

    /** Does it only wait to be told to go on: the party on its way into a place? */
    public get canAdvance(): boolean {
        return this.#phase === "entering"
    }

    /**
     * Go on to what comes next: into the place the party is entering.
     *
     * @throws {@link Error} When the party is not entering a place.
     */
    public advance(): void {
        this.enter()
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
     * @throws {@link Error} When the place holds no halt.
     */
    public haltOf(place: Place): Halt {
        const { halt: type } = place
        if(!type) throw new Error("A place holding a fight only holds no halt.")
        const kept = this.#halts.get(place)
        if(kept) return kept
        const halt = type.create(this.run)
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
        return {
            floor: this.floor, journey: this.journey, place: this.#place, depth: this.depth,
            floorNumber: this.floorNumber, trail: [...this.trail],
        }
    }

    /**
     * Stand the journey where a state has it, nothing told: it is another journey, not a move of this one.
     * The run makes its journey itself, so a state is read back into it rather than into a new one.
     */
    public restore({ floor, journey, place, depth, floorNumber, trail }: TravelState): void {
        this.floor = floor
        this.journey = journey
        this.depth = depth
        this.floorNumber = floorNumber
        this.trail.length = 0
        this.trail.push(...trail)
        this.#place = place
        this.#halts.clear()
        this.#phase = "map"
        this.#halt = null
        this.#fight = null
        this.#steps.length = 0
    }

    /** Written down, to read back with {@link Travel.load}: see {@link saveTravel}. */
    public save(): TravelSave {
        return saveTravel(this)
    }

    /**
     * Stand where a save has it, in place: what listens to it stays, and only {@link Travel.loaded} is told.
     *
     * @throws {@link Error} When the save is of another version, or names what the catalog does not have.
     */
    public load(save: TravelSave): void {
        loadTravel(save, this.run)
        this.loaded.notify(this)
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
     * Wait to enter the place the party stands on, as {@link Travel.go} leaves it, without moving: for a journey
     * that was already stood on the place by a move it heard of.
     *
     * @throws {@link Error} Out of the map, or where the party stands on no place.
     */
    public arrive(): void {
        if(this.#phase !== "map") throw new Error(`The party arrives from the map, not during ${this.#phase}.`)
        if(!this.#place) throw new Error("The party stands on no place to arrive at.")
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
        // A halt already made on a place with a fight is the one its won fight led to: going back is no fight.
        if(place.fight && !this.#halts.has(place)){
            this.#fight = place.fight.create(this.run, place)
            this.#enterPhase("fight")
            this.fightReached.notify(place)
            return
        }
        this.#open(this.haltOf(place))
    }

    /**
     * Tell the fight reached is fought. The run calls it as its battle starts; nothing is told when the party
     * is in no fight, as when a battle is only watched.
     */
    public startFight(): void {
        const place = this.#place
        if(this.#phase === "fight" && place) this.fightEntered.notify(place)
    }

    /**
     * Tell the fight reached is won: the halt of its place opens, being told of the fight, or the party goes back
     * to the map when the place holds none. Nothing is done when the party is in no fight.
     */
    public endFight(): void {
        const place = this.#place
        if(this.#phase !== "fight" || !place) return
        if(!place.halt){
            this.leave()
            return
        }
        this.fightLeft.notify(place)
        this.#open(this.haltOf(place))
    }

    /**
     * Visit a new halt of a sort where the party stands, without going anywhere. It belongs to no place, so
     * nothing of it stays once left.
     *
     * @throws {@link Error} Out of the map.
     */
    public visit(type: HaltType): void {
        if(this.#phase !== "map") throw new Error(`The party visits from the map, not during ${this.#phase}.`)
        this.#open(type.create(this.run))
    }

    /**
     * Back to the map, from a visit, closed, or from a fight. A party entering a place has left nothing
     * yet, so nothing is done then.
     */
    public leave(): void {
        if(this.#phase === "entering") return
        if(this.#halt?.locked) return
        const halt = this.#halt
        const fought = this.#phase === "fight" ? this.#place : null
        this.#fight = null
        this.#steps.length = 0
        // Forgotten first, so the visit is over for whatever the halt does as it stops.
        this.#halt = null
        halt?.stop(this.#context)
        this.#enterPhase("map")
        if(halt) this.visitEnded.notify(halt)
        if(fought) this.fightLeft.notify(fought)
    }

    /** Stand the party on any place, without entering it. */
    public jump(place: Place): void {
        this.#standOn(place)
    }

    /**
     * Lay a halt in a row of the map, where the party may reach it: the map is told drawn again.
     *
     * @param layer - The row, from 0.
     * @throws {@link Error} When the row is not one a halt may be laid in.
     */
    public layHalt(type: HaltType, layer: number): Place {
        const place = this.journey.insertHalt(type, layer)
        this.mapDrawn.notify(this.journey)
        return place
    }

    /**
     * Lay a whole row of halts in the map, one behind each place of a row: the map is told redrawn.
     *
     * @param layer - The row it takes, from 0, the rows from there moving down: see Journey.insertLayer.
     * @throws {@link Error} When the row is not one the map has room for.
     */
    public layLayer(type: HaltType, layer: number): readonly Place[] {
        const places = this.journey.insertLayer(type, layer)
        this.mapDrawn.notify(this.journey)
        return places
    }

    /**
     * The next place holding a sort of halt on the floor being gone through: the lowest one on a row strictly
     * past the one the party stands on, none when there is none.
     */
    public nextPlaceOf(type: HaltType): Place|null {
        const row = this.#place?.layer ?? -1
        const ahead = this.journey.places.filter(place => place.halt === type && place.layer > row)
        return ahead.reduce<Place|null>((lowest, place) => !lowest || place.layer < lowest.layer ? place : lowest, null)
    }

    /** Go into a floor, its map new, the party standing before its first layer. */
    public enterFloor(floor: Floor): void {
        this.depth++
        if(this.floorNumber !== null) this.floorNumber++
        this.floor = floor
        this.redrawMap()
        this.floorEntered.notify(floor)
    }

    /** Draw the map of the floor anew, the party standing before its first layer. */
    public redrawMap(): void {
        this.journey = this.#newJourney()
        this.#place = null
        this.trail.length = 0
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
        this.#answer(dialog, [index], this.offerTaken)
    }

    /**
     * Take a character a dialog asks for.
     *
     * @throws {@link Error} When the dialog is not open, or does not let that character be taken.
     */
    public takeHero(dialog: HeroDialog, hero: Hero): void {
        const index = dialog.heroes.indexOf(hero)
        if(index < 0) throw new Error(`${hero.name} cannot be taken here.`)
        this.#answer(dialog, [index], this.heroTaken)
    }

    /**
     * Take the cards a dialog asks for, by their places in its pool, so two copies are two picks.
     *
     * @throws {@link Error} When the dialog is not open, or the picks are not what it asks.
     */
    public takeCards(dialog: CardsDialog, indices: readonly number[]): void {
        const { count, selectable, repeatable } = dialog
        if(indices.length < count.min || indices.length > count.max){
            throw new Error(`The dialog asks ${count.min} to ${count.max} cards, not ${indices.length}.`)
        }
        const once = indices.filter(index => !repeatable[index])
        if(new Set(once).size < once.length) throw new Error("A card cannot be picked twice.")
        if(!indices.every(index => selectable[index])) throw new Error("The dialog does not let that card be picked.")
        this.#answer(dialog, indices, this.cardsTaken)
    }

    /**
     * Take the thing of the catalogue a dialog asks for.
     *
     * @throws {@link Error} When the dialog is not open, or does not let that thing be picked: its type is not
     *   among those allowed, or its name not among the keys.
     */
    public takeCatalog(dialog: CatalogDialog, pick: CatalogPick): void {
        if(!dialog.allowed.includes(pick.category)) throw new Error(`${pick.category} cannot be searched here.`)
        if(dialog.keys && !dialog.keys.has(pick.key)) throw new Error(`${pick.key} cannot be picked here.`)
        this.#answer(dialog, [], this.catalogTaken, pick)
    }

    /**
     * Go on with what a dialog shows.
     *
     * @throws {@link Error} When the dialog is not open.
     */
    public accept(dialog: ConfirmDialog): void {
        this.#answer(dialog, [], this.confirmAccepted)
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
        this.wentBack.notify(dialog)
        this.#context.react("refuse")
        back()
    }


    #phase: TravelPhase = "map"
    #place: Place|null = null
    #halt: Halt|null = null

    /** The fight reached, kept once won while the halt it leads to is visited, none otherwise. */
    #fight: Fight|null = null


    /** The halts of the floor made so far, by their place. */
    readonly #halts = new Map<Place, Halt>()

    /** The steps of the dialog open, from its first. */
    readonly #steps: Step[] = []

    /** Is an answer being taken in? A character asked meanwhile is the next step of the dialog. */
    #picking = false

    /** What the halts ask through. */
    readonly #context: HaltContext = {
        // Read from the travel as the halts ask: see the constructor.
        fight: null,
        offer: <T>(
            title: Text, offers: readonly T[], show: (offer: T) => Shown, done: (offer: T) => void,
            way: Way = {},
        ): void => {
            const dialog = new OfferDialog(title, way.back !== undefined, offers.map(offer => show(offer)))
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
            // The cards told apart by their name only are shown once: a turn, whatever its direction.
            const unlimited = (pick.unlimited ?? []).filter((card, index, all) => {
                return all.findIndex(other => other.name === card.name) === index
            })
            const shown = [...pool, ...unlimited]
            const selectable = shown.map((card, index) => {
                return index < pool.length ? among(card) : pick.copies !== false && among(card)
            })
            const repeatable = shown.map((_, index) => index >= pool.length)
            const back = pick.back !== undefined
            const dialog = new CardsDialog(title, back, shown, selectable, repeatable, count, pick.from ?? pool)
            this.#ask(dialog, picks => done(picks.map(index => shown[index])), pick)
            this.cardsAsked.notify(dialog)
        },
        catalog: (title: Text, choosing: CatalogChoosing, done: (pick: CatalogPick) => void): void => {
            const back = choosing.back !== undefined
            const dialog = new CatalogDialog(title, back, choosing.allowed, choosing.keys ?? null)
            this.#ask(dialog, (_, pick) => {
                if(pick) done(pick)
            }, choosing)
            this.catalogAsked.notify(dialog)
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
        map.fights = { depth: this.depth, ghosts: this.run.ghosts }
        this.floor.fillMap(map)
        map.addExits(exitsOf(this.floor), EXIT_HALT)
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
        this.trail.push(place)
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
    #answer<D extends Dialog>(
        dialog: D, picks: readonly number[], taken: Observable<Answer<D>>, pick?: CatalogPick,
    ): void {
        const at = this.#indexOf(dialog)
        const step = this.#steps[at]
        this.#steps.length = at + 1
        taken.notify(pick ? { dialog, picks, pick } : { dialog, picks })
        this.#context.react("pick")
        // Only a choice of the screen (an offer, a character) is followed by the next step of its choice: what
        // a confirmation or cards leads to is a dialog of its own, which replaces the screen.
        this.#picking = dialog instanceof OfferDialog || dialog instanceof HeroDialog
        try {
            step.answer(picks, pick)
        } finally {
            this.#picking = false
        }
    }
}
