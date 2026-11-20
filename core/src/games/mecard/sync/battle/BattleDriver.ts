import type { Fault } from "../../../../engine/net/Fault"
import type { Observer } from "../../sim/base/Observable"
import type { Battle } from "../../sim/battle/Battle"

import { signal, UnloadableFault } from "../faults"
import { detailOf } from "../read"
import type { Seats } from "../run/Seats"
import { BattleHost } from "./BattleHost"

/**
 * What plays a battle whose units are held by players, on the manager: it takes in their plans with a
 * {@link BattleHost}, plays what a round is ready for as soon as everyone is, and tells when the battle is
 * over.
 *
 * @remarks
 * The manager itself plays no unit: it is ready at the start of each preparation. A unit nobody holds, a body
 * summoned, is planned as a bot rather than waited for. A round that is ready while another is being played
 * goes
 * on after it, so a battle is never advanced twice at once. A battle that cannot be advanced is not played
 * any more:
 * {@link BattleDriver.failed} tells why.
 */
export class BattleDriver {


    /** Takes in the plans of the players. */
    public readonly host: BattleHost

    /** Told of what was dealt with: a plan that could not be read or taken in. */
    public readonly faulted = signal<Fault>()

    /** Told once, when the battle cannot be advanced. */
    public readonly failed = signal<Fault>()

    /** Told once, when the battle is over. */
    public readonly over = signal<Battle>()

    constructor(
        public readonly battle: Battle,

        /** Who plays what. */
        public readonly seats: Seats,
    ){
        this.host = new BattleHost(battle, seats, () => this.step())
        this.#observers = [
            this.host.faulted.add(fault => this.faulted.notify(fault)),
            battle.phaseChanged.add(phase => {
                if(this.#isStopped) return
                if(phase === "preparation") this.host.ready()
                else if(phase === "over") this.#end()
            }),
        ]
    }


    /** Play the first round. */
    public begin(): void {
        this.step()
    }

    /** Play what is ready: the round, then the draw of the next, until a player is waited for. */
    public step(): void {
        if(this.#isStepping){
            this.#isAgain = true
            return
        }
        this.#isStepping = true
        try {
            do {
                this.#isAgain = false
                if(this.#isStopped || this.battle.phase === "over") break
                this.#advance()
            } while(this.#isAgain)
        } finally {
            this.#isStepping = false
        }
    }

    /** Stop playing: the battle is left as it is. */
    public dispose(): void {
        this.#isStopped = true
        for(const observer of this.#observers) observer.remove()
        this.host.dispose()
    }


    readonly #observers: readonly Observer[]
    #isStepping = false
    #isAgain = false
    #isStopped = false

    #advance(): void {
        const { battle, seats } = this
        try {
            for(const unit of battle.awaited.units){
                if(seats.holderOf(unit.name) === null) battle.commitPlan(unit, battle.planAsBot(unit))
            }
            if(battle.phase === "preparation" && battle.awaited.units.length > 0) return
            battle.advance()
            if(battle.phase === "draw") battle.advance()
        } catch(error){
            this.#isStopped = true
            this.failed.notify(new UnloadableFault("duel", detailOf(error)))
        }
    }

    #end(): void {
        if(this.#isStopped) return
        this.#isStopped = true
        this.over.notify(this.battle)
    }
}
