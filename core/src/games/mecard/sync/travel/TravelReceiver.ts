import { haltById } from "../../sim/catalog/halts"
import type { CatalogPick } from "../../sim/halt/HaltContext"
import { placeAt } from "../../sim/save/travelSave"
import { CardsDialog, CatalogDialog, ConfirmDialog, HeroDialog, OfferDialog } from "../../sim/travel/dialogs"
import type { Dialog } from "../../sim/travel/dialogs"
import type { Travel } from "../../sim/travel/Travel"

import { Fault } from "../../../../engine/net/Fault"
import { TRAVEL_TOPIC } from "../SyncChannel"
import type { SyncSource } from "../SyncChannel"
import { signal, UnloadableFault } from "../faults"
import { detailOf } from "../read"
import { readTravelMessage } from "./TravelMessage"
import type { TravelAnswer, TravelEntry, TravelMessage, TravelMove, TravelRest } from "./TravelMessage"
import type { Removable } from "../../../../lifetime"

/** A viewer the party was told to stand elsewhere than where its moves had it: one of them was lost. */
export interface TravelDesync {
    /** Which journey, and which message of it told. */
    readonly number: number
    readonly sequence: number
}

/**
 * A viewer of a journey played elsewhere: it loads each save the main client sends into its journey, and
 * moves the party on its own map in between, which its {@link Travel} tells as the journey played would.
 *
 * @remarks
 * What comes is taken in at once: whatever shows the journey plays it at its own pace, behind it.
 */
export class TravelReceiver {


    /** The journey watched. */
    public engine: Travel

    /** What hears that a move was lost, nothing when none. */
    public readonly desynced = signal<TravelDesync>()

    /** Told of a message that could not be read or taken in: it is left out. */
    public readonly faulted = signal<Fault>()

    constructor(engine: Travel, source: SyncSource){
        this.engine = engine
        this.#listening = source.listen(text => this.receive(text))
    }


    /** Take a message in. */
    public receive(text: string): void {
        const message = readTravelMessage(text)
        if(message instanceof Fault){
            this.faulted.notify(message)
            return
        }
        try {
            if(this.#isStale(message)) return
            this.#heard = { number: message.number, sequence: message.sequence }
            this.#take(message)
        } catch(error){
            this.faulted.notify(new UnloadableFault(TRAVEL_TOPIC.name, detailOf(error)))
        }
    }

    /** Stop listening, and leave the journey watched as it is. */
    public dispose(): void {
        this.#listening.remove()
    }


    readonly #listening: Removable

    /** The journey and the message last heard, none before the first. */
    #heard: { readonly number: number, readonly sequence: number }|null = null

    /** The journey a save came for, none before the first: a move of another has no map to go on. */
    #standing: number|null = null

    /** Is a message older than the last heard, or a move with no map, which joining late may bring? */
    #isStale(message: TravelMessage): boolean {
        if(message.kind !== "save" && message.number !== this.#standing) return true
        const inVisit = this.engine.phase === "visit"
        const isOfVisit = message.kind === "answered" || message.kind === "back" || message.kind === "left"
        if(isOfVisit && !inVisit) return true
        const heard = this.#heard
        if(!heard) return false
        if(message.number !== heard.number) return message.number < heard.number
        return message.sequence <= heard.sequence
    }

    #take(message: TravelMessage): void {
        switch(message.kind){
            case "save": this.#applySave(message); break
            case "moved": this.#move(message); break
            case "entered": this.#enter(message); break
            case "visited": this.engine.visit(haltById(message.halt)); break
            case "answered": this.#answer(message); break
            case "back": this.engine.goBack(this.#dialog(message.dialog)); break
            case "left": this.engine.leave(); break
        }
    }

    /** Stand at the door of the place the party is on, and open its visit. */
    #enter({ place }: TravelEntry): void {
        const travel = this.engine
        if(travel.place !== placeAt(travel.journey, place)) throw new Error("The party is not where it entered.")
        travel.arrive()
        // A screen showing the journey goes in by itself once it showed the way in.
        if(travel.canAdvance) travel.enter()
    }

    #dialog(index: number): Dialog {
        const dialog = this.engine.dialogs[index]
        if(!dialog) throw new Error(`The visit has no dialog open at ${index}.`)
        return dialog
    }

    #answer({ dialog: index, answer, picks, pick }: TravelAnswer): void {
        const travel = this.engine
        const dialog = this.#dialog(index)
        const [first] = picks
        if(answer === "offer" && dialog instanceof OfferDialog) travel.takeOffer(dialog, first)
        else if(answer === "hero" && dialog instanceof HeroDialog) travel.takeHero(dialog, dialog.heroes[first])
        else if(answer === "cards" && dialog instanceof CardsDialog) travel.takeCards(dialog, picks)
        else if(answer === "catalog" && dialog instanceof CatalogDialog && pick) travel.takeCatalog(dialog, pick as CatalogPick)
        else if(answer === "confirm" && dialog instanceof ConfirmDialog) travel.accept(dialog)
        else throw new Error(`The dialog open at ${index} is not one to ${answer}.`)
    }

    #applySave(message: TravelRest): void {
        this.#checkDrift(message)
        this.engine.load(message.save)
        this.#standing = message.number
    }

    #move({ to, depth }: TravelMove): void {
        const travel = this.engine
        const place = placeAt(travel.journey, to)
        travel.depth = depth
        travel.jump(place)
    }

    /** Tell when the party, on the same map, is not where its moves have it here. */
    #checkDrift({ number, sequence, save }: TravelRest): void {
        const travel = this.engine
        const isSameMap = this.#standing === number && travel.journey.scenery === save.journey.scenery
        if(!isSameMap) return
        const own = travel.place && travel.journey.places.indexOf(travel.place)
        if(own !== save.place) this.desynced.notify({ number, sequence })
    }
}
