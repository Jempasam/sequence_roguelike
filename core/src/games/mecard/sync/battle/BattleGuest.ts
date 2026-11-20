import type { Battle } from "../../sim/battle/Battle"
import type { Unit } from "../../sim/battle/Unit"
import { savedCard } from "../../sim/save/battleSave"

import { Fault } from "../../../../engine/net/Fault"
import { PLAN_TOPIC } from "../SyncChannel"
import type { SyncLink } from "../SyncChannel"
import { signal, UnloadableFault } from "../faults"
import { writePlanMessage } from "./PlanMessage"
import type { UnitPlan } from "./PlanMessage"

/**
 * A client playing units of a battle hosted elsewhere: it gives the host what was committed for them. The
 * round then comes as it does to a viewer.
 */
export class BattleGuest {


    /** The battle played, none between two. */
    public engine: Battle|null

    /** Told of what could not be done: a client that is ready with no battle to play. */
    public readonly faulted = signal<Fault>()

    constructor(
        engine: Battle|null,

        /** The way to the host. */
        public readonly link: SyncLink,

        /** The units it plays, by their names. */
        public readonly units: () => readonly string[],
    ){
        this.engine = engine
    }


    /** Give the host what was committed for its units: the client is ready. */
    public ready(): void {
        const battle = this.engine
        if(!battle){
            this.faulted.notify(new UnloadableFault(PLAN_TOPIC.name, "A client is ready for a battle being fought only."))
            return
        }
        const units = new Set(this.units())
        const played = battle.initiative.filter(unit => units.has(unit.name))
        const plans = played.flatMap(unit => this.#planOf(battle, unit))
        this.link.send(writePlanMessage({ round: battle.round, plans }))
    }


    /** What a unit is to play, none when nothing was committed for it. */
    #planOf(battle: Battle, unit: Unit): UnitPlan[] {
        const chain = battle.planOf(unit)
        if(!chain) return []
        const usables = battle.activatedBy(unit).map(each => unit.usables.indexOf(each))
        return [{ unit: unit.name, cards: chain.cards.map(savedCard), usables }]
    }
}
