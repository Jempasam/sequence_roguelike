import type { PlugContext, UnitContext } from "../../battle/Action"
import { DamageType } from "../../battle/DamageType"
import type { Unit } from "../../battle/Unit"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"
import * as Areas from "../../battle/area/Areas"

/** How many hearts the knife takes from each unit on its way back, before any bonus. */
export const KNIFE_RETURN_DAMAGE = 1

/** How wide the way back of the knife is, in meters: a thin line. */
export const KNIFE_RETURN_WIDTH = 0.3

/**
 * A knife thrown away that comes back: as the round ends, it flies back to its thrower in a straight line, wounding
 * every unit on the way, and is gone.
 */
export class KnifeReturn extends AbstractProcess {


    constructor(
        /** The knife left where the throw ended. */
        public readonly knife: Unit,
    ){
        super("couteau lancé", visual("processes/spirit_anchor", { color: [0.85, 0.9, 1] }),
            `À la fin du round, le couteau revient vers toi : ${KNIFE_RETURN_DAMAGE} dégât physique à chaque unité sur le chemin.`,
        )
    }


    public override init({ battle, unit, hold }: PlugContext): void {
        hold(battle.tether(unit, this.knife, visual("tethers/laser", { color: [0.85, 0.9, 1] })))
    }


    public dispose({ battle, unit }: UnitContext): void {
        const { knife } = this
        if(unit.alive && battle.phase !== "over" && knife.alive){
            battle.strike(unit, Areas.line(knife.position, unit.position, KNIFE_RETURN_WIDTH), KNIFE_RETURN_DAMAGE, DamageType.PHYSICAL)
        }
        battle.vanish(knife)
    }
}
