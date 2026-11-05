import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import { meters, shotDamage } from "../../../battle/words"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit, UnitStats } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BlowCard } from "./BlowCard"
import { UNIT } from "../../../base/keywords"

/** How many hearts a shot takes, before the bonus of the unit: less than a blow, for its reach. */
export const SHOT_DAMAGE = 1

/** How far the shot of the catalog flies, in meters. */
export const SHOT_RANGE = 5

/** How wide the shot of the catalog is, in meters: a thin line, which touches the body it stops on. */
const SHOT_WIDTH = 0.1

/** How long the trail of a flying shot is, as a share of its flight. */
const SHOT_TRAIL = 0.3

/** How many bodies the crossbow of the catalog goes into: it stops on the last. */
const CROSSBOW_PIERCE = 2

/** The point a share of the way along a segment. */
function along(from: Vector2, to: Vector2, share: number): Vector2 {
    return from.plus(to.minus(from).times(share))
}

/** A shot straight ahead, stopping on the first unit it meets, or the last it may go into. */
export class ShotCard extends BlowCard {


    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How far it flies, in meters. */
        public readonly range: number,

        /** How wide it is, in meters. */
        public readonly width: number,

        /** How many bodies it goes into: it stops on the last. */
        public readonly pierce: number,
    ){
        super(name, description, rarity, SHOT_DAMAGE)
    }


    /** The hearts its unit adds to it: its precision, for a shot. */
    public override bonus(stats: UnitStats): number {
        return stats.precision.value
    }

    public reach(battle: Battle, unit: Unit, pose: Pose, progress: number): Area {
        const end = this.#end(battle, unit, pose)
        // While it flies, only its trail shows; landed, it covers its whole line, to hit what it met.
        const trail = Math.max(0, progress - SHOT_TRAIL)
        const from = progress < 1 ? along(pose.position, end, trail) : pose.position
        return { kind: "segment", from, to: along(pose.position, end, progress), width: this.width }
    }


    /** Where it stops from a pose: on the last body it may go into, or on what stops any shot. */
    #end(battle: Battle, unit: Unit, pose: Pose): Vector2 {
        const range = this.range * unit.stats.throwRange.value
        const crossed: Unit[] = []
        for(;;){
            const { end, unit: met } = battle.ray(unit, range, pose, crossed)
            if(!met || crossed.length + 1 >= this.pierce) return end
            crossed.push(met)
        }
    }
}

export const SHOT = new ShotCard("Tir", [
    "Tire droit devant, jusqu'à ", meters(SHOT_RANGE), " × portée : ", shotDamage(SHOT_DAMAGE),
    " à la première ", UNIT, " touchée.",
], Rarity.COMMON, SHOT_RANGE, SHOT_WIDTH, 1)

export const CROSSBOW = new ShotCard("Arbalète", [
    "Tire droit devant, jusqu'à ", meters(SHOT_RANGE), " × portée : ", shotDamage(SHOT_DAMAGE), " à chacune des ",
    String(CROSSBOW_PIERCE), " premières ", UNIT.as("unités"), ", que le carreau traverse.",
], Rarity.RARE, SHOT_RANGE, SHOT_WIDTH, CROSSBOW_PIERCE)
