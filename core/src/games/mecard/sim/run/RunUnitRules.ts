import type { Observer } from "../base/Observable"
import { LookaheadAi } from "../ai/LookaheadAi"
import { ShuffleAi } from "../ai/ShuffleAi"
import type { Battle } from "../battle/Battle"
import type { Unit } from "../battle/Unit"

import type { Run } from "./Run"
import type { UnitRule } from "./unitRules"

/** What is told of a battle with no unit to change. */
const NO_TARGET = "Règles : aucune unité à modifier dans ce combat."

/**
 * Changes the units of each battle a run starts, by the rules it is given, to try the game another way.
 *
 * @remarks
 * The units it changes are picked before any rule applies: those that no player plays and no smart AI either,
 * which count for their team and have cards. A unit that comes during the battle is left as it is. The rules
 * are not saved.
 */
export class RunUnitRules {


    /** The run whose battles are changed. */
    public get engine(): Run { return this.#engine }

    /** Change the battles of another run instead of this one, by the same rules. */
    public set engine(run: Run){
        if(run === this.#engine) return
        this.#observer?.remove()
        this.#engine = run
        if(!this.#isDisposed) this.#register()
    }

    constructor(
        engine: Run,

        /** Tell the players which units a battle had changed. */
        private readonly tell: (text: string) => void,
    ){
        this.#engine = engine
        this.#register()
    }


    /** The rules it applies, in the order they apply. */
    public get rules(): readonly UnitRule[] {
        return [...this.#rules.values()].sort((first, second) => first.rank - second.rank)
    }

    /** Apply a rule from the next battle on, in place of the one of the same id. */
    public set(rule: UnitRule): void {
        this.#rules.set(rule.id, rule)
    }

    /** Apply no rule from the next battle on. */
    public clear(): void {
        this.#rules.clear()
    }

    /** Stop changing the battles. */
    public dispose(): void {
        this.#isDisposed = true
        this.#observer?.remove()
        this.#observer = null
    }


    #engine: Run
    #observer: Observer|null = null
    #isDisposed = false
    readonly #rules = new Map<string, UnitRule>()

    #register(): void {
        this.#observer = this.#engine.battleStarted.add(battle => this.#apply(battle))
    }

    #apply(battle: Battle): void {
        if(this.#rules.size === 0) return
        const targets = battle.units.filter(unit => isTarget(unit, battle))
        for(const rule of this.rules) for(const unit of targets) rule.apply(unit, battle)
        const names = targets.map(unit => unit.name).join(", ")
        this.tell(names ? `Règles appliquées à : ${names}.` : NO_TARGET)
    }
}

/** Is it a unit the rules change: one with cards, counting for its team, played by no player nor smart AI? */
function isTarget(unit: Unit, battle: Battle): boolean {
    if(unit.controller === "player" || !unit.decisive || !unit.plays) return false
    const ai = battle.controllerOf(unit)
    return !(ai instanceof LookaheadAi || ai instanceof ShuffleAi)
}
