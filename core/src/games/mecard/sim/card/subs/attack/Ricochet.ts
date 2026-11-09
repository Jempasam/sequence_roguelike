import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import { PHYSICAL_COLOR } from "../../../battle/previewColors"
import type { Action, Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, sweep } from "../tools/playing"
import { polygon, still } from "../tools/previews"
import { reflected } from "../tools/reflection"
import { Rarity } from "../../Rarity"
import { DISTANCE, PORTEE, PRECISION, UNIT } from "../../../base/keywords"
import { DamageType } from "../../../battle/DamageType"

/** How far the ricochet of the catalog flies, bounce included, in meters, before the reach of the unit. */
const RICOCHET_RANGE = 6

/** How many hearts the ricochet of the catalog takes, before the precision of the unit. */
const RICOCHET_DAMAGE = 1

/** How wide a ricochet is, in meters: a thin line, which touches the body it stops on. */
const RICOCHET_WIDTH = 0.1

/** How many times the bow of the catalog bounces. */
const BOW_BOUNCES = 2

/** How far an arrow of the bow of the catalog flies from each bounce, in meters, before the reach. */
const BOW_RANGE = 5

/** How close to a wall a line must stop to have met it, in meters. */
const WALL_SLACK = 0.01

/** How far from where it bounced the line starts again, in meters, so it does not meet the same wall. */
const BOUNCE_LIFT = 0.01

/** How long the shot flies, in seconds. */
const FLIGHT_TIME = 0.25

/** How long the shot stays shown once landed, in seconds. */
const RECOVERY_TIME = 0.15

/** A straight piece of the way of a shot. */
interface Line {
    readonly from: Vector2
    readonly to: Vector2
}

/** What a shot bounces by. */
interface Bouncing {
    /** How far it flies, in meters, once the reach of the unit counted. */
    readonly range: number

    /** How many times it bounces at most. */
    readonly bounces: number

    /** Does each bounce give it its whole range back? */
    readonly renewing: boolean
}

/** The lines a shot follows from a pose: straight ahead, then off what it meets, unless a unit. */
function lines(battle: Battle, unit: Unit, pose: Pose, { range, bounces, renewing }: Bouncing): Line[] {
    const result: Line[] = []
    let from = pose.position
    let direction = pose.direction
    let left = range
    for(let bounce = 0; ; bounce++){
        const hit = battle.ray(unit, left, { position: from, direction })
        const travelled = from.distance(hit.end)
        result.push({ from, to: hit.end })
        if(hit.unit || bounce >= bounces || travelled >= left - WALL_SLACK) return result
        const way = reflected(battle, hit.end, direction, 0, WALL_SLACK, null)
        if(!way) return result
        from = hit.end.plus(way.times(BOUNCE_LIFT))
        direction = way
        left = renewing ? range : left - travelled
    }
}

/** A shot bouncing off the walls and pillars it meets, stopping on the first body. */
export class RicochetCard extends ActionCard {


    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How far it flies, in meters, before the reach of the unit. */
        public readonly range: number,

        /** How many hearts it takes, before the precision of the unit. */
        public readonly amount: number,

        /** How many times it bounces at most. */
        public readonly bounces: number,

        /** Does each bounce give it its whole range back? */
        public readonly renewing: boolean,
    ){
        super(name, description, rarity, RicochetCard.#shooting(range, amount, bounces, renewing))
    }


    static #shooting(range: number, amount: number, bounces: number, renewing: boolean): Action {
        const bouncing = (unit: Unit): Bouncing => {
            return { range: range * unit.stats.throwRange.value, bounces, renewing }
        }
        const segment = (line: Line, share = 1): Area => {
            return { kind: "segment", from: line.from, to: line.from.plus(line.to.minus(line.from).times(share)), width: RICOCHET_WIDTH }
        }
        return {
            use: function* ({ battle, unit }){
                const path = lines(battle, unit, unit, bouncing(unit))
                yield* sweep(battle, FLIGHT_TIME, flown => {
                    // Each line flies over an equal share of the flight.
                    const share = flown * path.length
                    return path.map((line, index) => {
                        return polygon(segment(line, Math.min(1, Math.max(0, share - index))), PHYSICAL_COLOR)
                    })
                })
                for(const line of path){
                    const shot = amount + unit.stats.precision.value
                    if(battle.strike(unit, segment(line), shot, DamageType.PHYSICAL).length > 0) break
                }
                yield* hold(battle, RECOVERY_TIME, path.map(line => polygon(segment(line), PHYSICAL_COLOR)))
            },
            preview: ({ battle, unit, pose }) => {
                const path = lines(battle, unit, pose, bouncing(unit))
                return still(pose, ...path.map(line => polygon(segment(line), PHYSICAL_COLOR)))
            },
        }
    }
}

export const RICOCHET = new RicochetCard("Ricochet", [
    "Tire droit devant : le tir rebondit une fois sur le premier mur ou pilier, ", RICOCHET_RANGE, "×", PORTEE, " ",
    DISTANCE, " en tout. ", RICOCHET_DAMAGE, "+", PRECISION, " ", DamageType.PHYSICAL, " à la première ", UNIT,
    " touchée.",
], Rarity.RARE, RICOCHET_RANGE, RICOCHET_DAMAGE, 1, false)

export const BOUNCING_BOW = new RicochetCard("Arc à rebond", [
    "Tire droit devant, jusqu'à ", BOW_RANGE, "×", PORTEE, " ", DISTANCE, " : la flèche rebondit ", BOW_BOUNCES,
    " fois sur les murs et les piliers, et chaque rebond lui rend toute sa portée. ", RICOCHET_DAMAGE, "+",
    PRECISION, " ", DamageType.PHYSICAL, " à la première ", UNIT, " touchée.",
], Rarity.RARE, BOW_RANGE, RICOCHET_DAMAGE, BOW_BOUNCES, true)
