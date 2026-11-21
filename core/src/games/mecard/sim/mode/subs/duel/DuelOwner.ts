import type { Observer } from "../../../base/Observable"
import type { Battle } from "../../../battle/Battle"

import { BattleDriver } from "../../../../sync/battle/BattleDriver"
import type { HandleChannel } from "../../HandleChannel"
import { NO_PICK, OWN_UNITS, Seats } from "../../../../sync/run/Seats"

/**
 * What the manager says to the owner of a duel: who plays which units, which starts it, or that a player
 * left, lost its connection, or is back. One of them at a time.
 */
export type DuelOrder = {
    readonly start?: { readonly [id: string]: readonly string[] }
    readonly left?: string
    readonly lost?: string
    readonly back?: string
}

/**
 * What the owner of a duel says to the manager: the name of the winning camp, none for a draw, or why the
 * duel could not be played. One of them at a time.
 */
export type DuelSaid = {
    readonly over?: { readonly winner: string|null }
    readonly failed?: string
}

/** Told once the duel starts: the units its owner plays, and what it says once it is ready. */
type Started = (me: string, units: readonly string[], ready: () => void) => void

/**
 * A duel as its owner holds it: the battle, who plays which of its units, and what plays its rounds. It
 * tells the manager no more than how it ended.
 *
 * @remarks
 * It sleeps until the duel is shown to its owner: what the manager said before is kept, and said again then.
 */
export class DuelOwner {


    constructor(
        private readonly battle: Battle,

        /** The way to the manager. */
        private readonly manager: HandleChannel,

        /** Tell the player something went wrong, which does not stop the game. */
        private readonly report: (text: string) => void,

        /** Told once the duel starts: the units its owner plays, and what it says once it is ready. */
        private readonly started: Started = () => {},
    ){}


    /** The duel is shown to its owner: what was told before is told now. */
    public show(me: string): void {
        this.#me = me
        for(const order of this.#pending.splice(0)) this.order(order)
    }

    /** The manager says what to do. */
    public order(order: DuelOrder): void {
        const me = this.#me
        if(me === null){
            this.#pending.push(order)
            return
        }
        if(order.start) this.#start(me, order.start)
        const driver = this.#driver
        if(!driver) return
        if(order.lost !== undefined){
            driver.host.lost(order.lost)
            driver.step()
        }
        if(order.back !== undefined) driver.host.back(order.back)
        if(order.left !== undefined){
            this.#part(driver, order.left)
            driver.step()
        }
    }

    /**
     * A player says what it plans, or that it is ready: one that plays on the very battle of its owner
     * committed already, and only says it is ready.
     */
    public heard(from: string, plan: unknown): boolean {
        const driver = this.#driver
        if(!driver) return false
        const owes = this.battle.awaited.units.some(unit => driver.seats.holderOf(unit.name) === from)
        if(owes) driver.host.receive(from, JSON.stringify(plan))
        else driver.host.committed(from)
        return true
    }

    public dispose(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
        this.#driver?.dispose()
        this.#driver = null
        this.#me = null
    }


    #me: string|null = null
    #driver: BattleDriver|null = null
    #observers: Observer[] = []
    readonly #pending: DuelOrder[] = []

    #start(me: string, parties: Readonly<Record<string, readonly string[]>>): void {
        if(this.#driver) return
        const seats = new Seats(OWN_UNITS, NO_PICK)
        for(const [id, names] of Object.entries(parties)) seats.assign(id, names)
        const driver = new BattleDriver(this.battle, seats)
        this.#driver = driver
        this.#observers = [
            driver.faulted.add(fault => this.report(fault.describe())),
            driver.failed.add(fault => this.manager.notify({ failed: fault.describe() } satisfies DuelSaid)),
            driver.over.add(battle => {
                this.manager.notify({ over: { winner: battle.winner?.name ?? null } } satisfies DuelSaid)
            }),
        ]
        this.started(me, seats.unitsOf(me), () => this.#ready(me))
        driver.begin()
    }

    /** What the owner plays says it is ready: what it committed is in the battle already. */
    #ready(me: string): void {
        this.#driver?.host.committed(me)
    }

    /** A player left for good: its units are played as bots, and nobody waits for it any more. */
    #part(driver: BattleDriver, id: string): void {
        driver.host.fillIn(id)
        for(const name of driver.seats.unitsOf(id)){
            const unit = this.battle.units.find(each => each.name === name)
            if(unit) this.battle.control(unit, "bot")
        }
        driver.seats.drop(id)
        driver.host.gone(id)
    }
}
