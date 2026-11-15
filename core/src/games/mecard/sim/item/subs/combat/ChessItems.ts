import { Add, ModifierKey } from "../../../base/Attribute"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import { DODGE_CARD } from "../../../card/subs/combat/DodgeCard"
import { DODGE } from "../../../status/subs/Dodge"
import type { Unit } from "../../../battle/Unit"

import { AbstractItem } from "../AbstractItem"

/** How far apart two bodies may stand and still touch, in meters: a body stops a stride short of another. */
const CONTACT_SLACK = 0.08

/** How much strength each body its owner summons has more. */
const CROWN_STRENGTH = 1

/** How many rounds a positive status lasts more for the holder of the ashtray. */
const ASHTRAY_ROUNDS = 1

/** How far the horseshoe takes its holder forward after a dodge, in meters. */
const HORSESHOE_STRIDE = 1

/** Spurs: a move of the unit that touches another unit gives it a dodge. */
export class Spurs extends AbstractItem {


    constructor(){
        super("Éperons", visual("items/spurs"), ["Chaque déplacement qui touche une unité te donne esquive 1."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.unitMoved.add(({ unit: mover, to }) => {
            if(mover !== unit) return
            const touching = battle.touchables.some(other => {
                return other !== unit && other.position.distance(to) <= unit.radius + other.radius + CONTACT_SLACK
            })
            if(touching) battle.applyStatus(unit, DODGE, 1)
        }))
    }
}

export const SPURS = new Spurs()

/** A crown: each body its unit summons has more strength. */
export class KingCrown extends AbstractItem {


    constructor(){
        super("Couronne de roi", visual("items/king_crown"), ["Tes invocations ont +", CROWN_STRENGTH, " force."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.signals.spawned.add(({ unit: body }) => {
            if(body.owner !== unit) return
            const key = new ModifierKey("couronne de roi")
            body.stats.strength.add(key, new Add(CROWN_STRENGTH))
        }))
    }
}

export const KING_CROWN = new KingCrown()

/** An ashtray: each positive status that comes onto its holder lasts a round more. */
export class Ashtray extends AbstractItem {


    constructor(){
        super("Cendrier", visual("items/ashtray"), ["Tes statuts positifs durent un round de plus."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.signals.statusAdded.add(({ unit: holder, type }) => {
            if(holder !== unit || type.polarity !== "positive") return
            const status = unit.statuses.get(type)
            if(status) status.setLevel(status.level + ASHTRAY_ROUNDS)
        }))
    }
}

export const ASHTRAY = new Ashtray()

/** A horseshoe: after each dodge it plays, its holder goes a meter ahead. */
export class Horseshoe extends AbstractItem {


    constructor(){
        super("Fer à cheval", visual("items/horseshoe"), ["Chaque Esquive te fait avancer de ", HORSESHOE_STRIDE, " m."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(unit.stepEnded.add(() => this.#after(battle, unit)))
    }

    #after(battle: PlugContext["battle"], unit: Unit): void {
        const last = unit.stepsPlayed[unit.stepsPlayed.length - 1]
        if(last === DODGE_CARD.get()) battle.move(unit, unit.direction, HORSESHOE_STRIDE * unit.stats.move.value)
    }
}

export const HORSESHOE = new Horseshoe()
