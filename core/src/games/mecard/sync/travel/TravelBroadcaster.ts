import type { Observer } from "../../sim/base/Observable"
import type { Halt } from "../../sim/halt/Halt"
import type { CatalogPick } from "../../sim/halt/HaltContext"
import type { Place } from "../../sim/run/Journey"
import type { Dialog } from "../../sim/travel/dialogs"
import type { PlaceMove, Travel, TravelPhase } from "../../sim/travel/Travel"

import type { SyncSender } from "../SyncChannel"
import { writeTravelMessage } from "./TravelMessage"
import type { TravelAnswerKind, TravelBody } from "./TravelMessage"
import type { Removable } from "../../../../lifetime"

/**
 * The main client of a journey, telling its viewers: it sends each move of the party, and the journey as it
 * stands whenever a halt is left. It reads the journey through its observers only, so it knows nothing of it.
 *
 * @remarks
 * A viewer connecting hears what stands last, not the moves since: it takes the next one from there.
 */
export class TravelBroadcaster {


    /** The journey told. */
    public get engine(): Travel { return this.#engine }

    /** Tell another journey in place of this one, sent at once. */
    public set engine(travel: Travel){
        this.#unregisterObservers()
        this.#follow(travel)
    }

    constructor(
        engine: Travel,

        public readonly sender: SyncSender,
    ){
        this.#peers = sender.onPeer(() => this.#initialMessage())
        this.#engine = engine
        this.#follow(engine)
    }


    /** Stop telling the journey. */
    public dispose(): void {
        this.#unregisterObservers()
        this.#peers.remove()
    }


    #engine: Travel

    /** Which journey is told, from 1. */
    #number = 0

    /** How many messages of the journey were sent. */
    #sequence = 0

    /** The journey as it last stood, none before the first. */
    #lastSave: string|null = null

    readonly #peers: Removable

    #observers: Observer[] = []

    #follow(travel: Travel): void {
        this.#engine = travel
        this.#number++
        this.#sequence = 0
        this.#registerObservers()
        this.#sendSave()
    }

    #registerObservers(): void {
        const travel = this.#engine
        this.#before = travel.phase
        this.#observers = [
            travel.moved.add(move => this.#sendMove(move)),
            travel.phaseChanged.add(phase => this.#phaseChanged(phase)),
            travel.visitStarted.add(halt => this.#sendOpening(halt)),
            travel.offerTaken.add(({ dialog, picks }) => this.#sendAnswer(dialog, "offer", picks)),
            travel.heroTaken.add(({ dialog, picks }) => this.#sendAnswer(dialog, "hero", picks)),
            travel.cardsTaken.add(({ dialog, picks }) => this.#sendAnswer(dialog, "cards", picks)),
            travel.catalogTaken.add(({ dialog, picks, pick }) => this.#sendAnswer(dialog, "catalog", picks, pick)),
            travel.confirmAccepted.add(({ dialog, picks }) => this.#sendAnswer(dialog, "confirm", picks)),
            travel.wentBack.add(dialog => this.#sendBack(dialog)),
            travel.visitEnded.add(() => {
                if(this.#told) this.#sendStamped({ kind: "left" })
                this.#told = false
                this.#sendSave()
            }),
        ]
    }

    /** The phase the journey was in before the one it is in, to tell how a visit opened. */
    #before: TravelPhase = "map"

    /** The phase before the one just entered, kept as the visit that follows reads it. */
    #beforeVisit: TravelPhase = "map"

    #phaseChanged(phase: TravelPhase): void {
        this.#beforeVisit = this.#before
        this.#before = phase
    }

    /**
     * Tell a visit that opens, but not the one a fight won leads to, nor a fight: a viewer takes those from
     * the battle it is told, and from the journey when the halt is left.
     */
    #sendOpening(halt: Halt): void {
        const travel = this.#engine
        const { place } = travel
        this.#told = false
        if(this.#beforeVisit === "entering" && place && !place.fight){
            this.#told = true
            this.#sendStamped({ kind: "entered", place: travel.journey.places.indexOf(place) })
        } else if(this.#beforeVisit === "map"){
            this.#told = true
            this.#sendStamped({ kind: "visited", halt: halt.type.id })
        }
    }

    #sendAnswer(
        dialog: Dialog, answer: TravelAnswerKind, picks: readonly number[], pick?: CatalogPick,
    ): void {
        const at = this.#engine.dialogs.indexOf(dialog)
        if(at < 0 || !this.#told) return
        this.#sendStamped({ kind: "answered", dialog: at, answer, picks, ...pick ? { pick } : {} })
    }

    #sendBack(dialog: Dialog): void {
        const at = this.#engine.dialogs.indexOf(dialog)
        if(at < 0 || !this.#told) return
        this.#sendStamped({ kind: "back", dialog: at })
    }

    /** Was the visit open told as it opened? One a won fight leads to is not, nor are its answers. */
    #told = false

    /** Send a message of the journey, stamped as the next. */
    #sendStamped(message: TravelBody): void {
        this.#sequence++
        this.sender.send(writeTravelMessage({ ...message, number: this.#number, sequence: this.#sequence }))
    }

    #unregisterObservers(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }

    /** What a viewer connecting starts from. */
    #initialMessage(): string|null {
        return this.#lastSave
    }

    #sendMove({ from, to }: PlaceMove): void {
        const travel = this.#engine
        const rank = (place: Place): number => travel.journey.places.indexOf(place)
        this.#sequence++
        this.sender.send(writeTravelMessage({
            kind: "moved", number: this.#number, sequence: this.#sequence,
            from: from && rank(from), to: rank(to), depth: travel.depth,
        }))
    }

    #sendSave(): void {
        this.#sequence++
        this.#lastSave = writeTravelMessage({
            kind: "save", number: this.#number, sequence: this.#sequence, save: this.#engine.save(),
        })
        this.sender.send(this.#lastSave)
    }
}
