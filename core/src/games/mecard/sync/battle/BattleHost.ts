import type { Observer } from "../../sim/base/Observable"
import { planFor } from "../../sim/ai/Bot"
import type { Battle } from "../../sim/battle/Battle"
import { CardChain } from "../../sim/card/CardChain"
import { cardsInHand } from "../../sim/save/battleSave"

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
 * for it.
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

    /**
     * What hears that a plan could not be read or taken in. A failure nobody hears is thrown, so it is never
     * silent.
     */
    public onError: ((error: unknown) => void)|null = null

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
        try {
            const message = readPlanMessage(text)
            if(message.round !== battle.round) return
            for(const plan of message.plans) this.#commit(battle, guest, plan)
        } catch(error){
            this.#fail(error)
        }
        this.fillIn(guest)
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
        for(const unit of owed) battle.commit(unit, planFor(unit))
    }

    /** Wait for a client no more. */
    public left(guest: string): void {
        this.#waiting.delete(guest)
        this.#tellReady()
    }

    /** Stop hosting the battle. */
    public dispose(): void {
        this.#unregisterObservers()
    }


    #engine: Battle|null = null

    /** The clients that owe their plans this round. */
    readonly #waiting = new Set<string>()

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

    /** Wait anew for whoever holds a unit playing this round. */
    #openRound(battle: Battle): void {
        this.#hostReady = false
        this.#told = false
        this.#waiting.clear()
        for(const unit of battle.initiative){
            const holder = this.seats.holderOf(unit.name)
            if(holder !== null) this.#waiting.add(holder)
        }
    }

    /** @throws {@link Error} When the unit is not the client's to play, or the plan cannot be played. */
    #commit(battle: Battle, guest: string, plan: UnitPlan): void {
        const unit = battle.units.find(each => each.name === plan.unit)
        if(!unit || this.seats.holderOf(unit.name) !== guest) throw new Error(`${guest} does not play ${plan.unit}.`)
        battle.commit(unit, new CardChain(cardsInHand(unit.hand, plan.cards, unit.unlimited)))
        battle.activate(unit, plan.usables.map(index => unit.usables[index]))
    }

    #tellReady(): void {
        if(this.#told || !this.#hostReady || this.#waiting.size > 0) return
        this.#told = true
        this.everyoneReady()
    }

    #fail(error: unknown): void {
        if(!this.onError) throw error
        this.onError(error)
    }
}
