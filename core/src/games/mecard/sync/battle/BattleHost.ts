import { Fault } from "../../../../engine/net/Fault"
import type { Observer } from "../../sim/base/Observable"
import type { Battle } from "../../sim/battle/Battle"
import { CardChain } from "../../sim/card/CardChain"
import { cardsInHand } from "../../sim/save/battleSave"

import { signal, NotYoursFault, UnplayableFault } from "../faults"
import { detailOf } from "../read"
import type { Seats } from "../run/Seats"
import { readPlanMessage } from "./PlanMessage"
import type { UnitPlan } from "./PlanMessage"

/**
 * The host of a battle whose units are played by several clients: it commits the plans they give, and keeps
 * who is ready this round.
 *
 * @remarks
 * Being ready is no notion of a battle, which only knows the chains committed: it never moves the battle on,
 * and only tells that everyone is ready. A client gone or failing is planned for as a bot, so nobody waits
 * for it. A client whose connection is lost is planned for as a bot round after round, until it is back:
 * it may come back, so its units are not given up.
 */
export class BattleHost {


    /** The battle hosted, none between two. */
    public get engine(): Battle|null { return this.#engine }

    public set engine(battle: Battle|null){
        this.#unregisterObservers()
        this.#engine = battle
        this.#waiting.clear()
        if(battle) this.#registerObservers(battle)
    }

    /** Told of what was dealt with: a plan that could not be read or taken in, its units played as bots. */
    public readonly faulted = signal<Fault>()

    /** Told of a client whose connection is lost: its units are planned as bots until it is back. */
    public readonly guestLost = signal<string>()

    /** Told of a client whose connection is back: it plans its units again from the next round. */
    public readonly guestBack = signal<string>()

    constructor(
        engine: Battle|null,

        /** Who plays what. */
        public readonly seats: Seats,

        /** Told once a round when the host and every client it waits for are ready. */
        public readonly everyoneReady: () => void,
    ){
        this.engine = engine
    }


    /** Take in what a client gives: it is then ready. A late message, or a second one, is left out. */
    public receive(guest: string, text: string): void {
        const battle = this.#engine
        if(!battle || !this.#waiting.has(guest)) return
        const message = readPlanMessage(text)
        if(message instanceof Fault){
            this.faulted.notify(message)
        } else if(message.round === battle.round){
            for(const plan of message.plans){
                const fault = this.#commit(battle, guest, plan)
                if(fault) this.faulted.notify(fault)
            }
        } else {
            // A plan of a round gone by is no fault: it is what a slow connection brings.
            return
        }
        this.fillIn(guest)
        this.left(guest)
    }

    /**
     * Hear that a client committed its plans straight in the battle, as one that plays on the very battle
     * the host has: it is ready when none of its units is waited for any more, and nothing happens when one
     * still is. A client not waited for, a second call or a late one, is left out as
     * {@link BattleHost.receive} leaves it out.
     */
    public committed(guest: string): void {
        const battle = this.#engine
        if(!battle || !this.#waiting.has(guest)) return
        if(battle.awaited.units.some(unit => this.seats.holderOf(unit.name) === guest)) return
        this.left(guest)
    }

    /** Hear that the host is ready. */
    public ready(): void {
        this.#hostReady = true
        this.#tellReady()
    }

    /** Plan as a bot the units of a client with no chain yet this round. */
    public fillIn(guest: string): void {
        const battle = this.#engine
        if(!battle) return
        const owed = battle.awaited.units.filter(unit => this.seats.holderOf(unit.name) === guest)
        const plans = owed.map(unit => battle.planAsBot(unit))
        owed.forEach((unit, index) => battle.commitPlan(unit, plans[index]))
    }

    /** Hear that the connection of a client is lost: its units are planned as bots until it is back. */
    public lost(guest: string): void {
        if(this.#away.has(guest)) return
        this.#away.add(guest)
        this.fillIn(guest)
        this.left(guest)
        this.guestLost.notify(guest)
    }

    /** Hear that the connection of a client is back: it is waited for again from the next round. */
    public back(guest: string): void {
        if(!this.#away.delete(guest)) return
        this.guestBack.notify(guest)
    }

    /** Wait for a client no more. */
    public left(guest: string): void {
        this.#waiting.delete(guest)
        this.#tellReady()
    }

    /** Hear that a client is gone for good: it is not waited for, nor planned for as lost any more. */
    public gone(guest: string): void {
        this.#away.delete(guest)
        this.left(guest)
    }

    /** Stop hosting the battle. */
    public dispose(): void {
        this.#unregisterObservers()
    }


    #engine: Battle|null = null

    /** The clients that owe their plans this round. */
    readonly #waiting = new Set<string>()

    /** The clients whose connection is lost: they are planned for as bots, and never waited for. */
    readonly #away = new Set<string>()

    /** Did the host say it is ready this round? */
    #hostReady = false

    /** Was it told that everyone is ready this round? */
    #told = false

    #observers: Observer[] = []

    #registerObservers(battle: Battle): void {
        this.#observers = [
            battle.phaseChanged.add(phase => {
                if(phase === "preparation") this.#openRound(battle)
            }),
        ]
    }

    #unregisterObservers(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }

    /** Wait anew for whoever holds a unit playing this round, but for those whose connection is lost. */
    #openRound(battle: Battle): void {
        this.#hostReady = false
        this.#told = false
        this.#waiting.clear()
        for(const unit of battle.initiative){
            const holder = this.seats.holderOf(unit.name)
            if(holder === null) continue
            if(this.#away.has(holder)) this.fillIn(holder)
            else this.#waiting.add(holder)
        }
    }

    /** Commit the plan of a unit, or tell why it cannot be: the sim refuses what it cannot play. */
    #commit(battle: Battle, guest: string, plan: UnitPlan): Fault|null {
        const unit = battle.units.find(each => each.name === plan.unit)
        if(!unit || this.seats.holderOf(unit.name) !== guest) return new NotYoursFault(guest, plan.unit)
        try {
            battle.commit(unit, new CardChain(cardsInHand(unit.hand, plan.cards, unit.unlimited)))
            battle.activate(unit, plan.usables.map(index => unit.usables[index]))
        } catch(error){
            return new UnplayableFault(guest, plan.unit, detailOf(error))
        }
        return null
    }

    #tellReady(): void {
        if(this.#told || !this.#hostReady || this.#waiting.size > 0) return
        this.#told = true
        this.everyoneReady()
    }
}
