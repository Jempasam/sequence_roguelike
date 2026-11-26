import { frenchNumber } from "../../../battle/words"
import { DISTANCE, PORTEE, PRECISION } from "../../../base/keywords"
import { PHYSICAL_COLOR } from "../../../battle/previewColors"
import type { Vector2 } from "../../../base/Vector2"
import { SHOT_LOOK } from "../tools/blowLooks"
import type { Action } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import { UNIT_RADIUS } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, sweep } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { DamageType } from "../../../battle/DamageType"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How far the shotgun of the catalog reaches, in meters, before the reach of the unit. */
const SHOTGUN_RANGE = 2.5 - UNIT_RADIUS

/** How many pellets the shotgun of the catalog fires. */
const SHOTGUN_PELLETS = 3

/** How many hearts each pellet takes, before the precision of the unit. */
const PELLET_DAMAGE = 1

/**
 * How far to the side of ahead a pellet may go, for each meter ahead: about 22° on either side. Without
 * trigonometry: a pellet goes along ahead plus this much of its right, at most, normalized.
 */
const SHOTGUN_SPREAD = 0.4

/** How wide a pellet is, in meters: a thin line, which touches the body it stops on. */
const PELLET_WIDTH = 0.1

/** How long the pellets take to fly, in seconds. */
const BLAST_TIME = 0.15

/** How long the pellets stay shown once landed, in seconds. */
const RECOVERY_TIME = 0.15

/**
 * Pellets fired ahead, each along a way drawn at random within a spread when it fires, each stopping on the
 * first body or pillar it meets.
 */
export class ShotgunCard extends ActionCard {


    constructor(
        /** How far it reaches, in meters, before the reach of the unit. */
        public readonly range: number,

        /** How many pellets it fires. */
        public readonly pellets: number,

        /** How many hearts each pellet takes, before the precision of the unit. */
        public readonly pelletDamage: number,

        /** How far to the side a pellet may go, for each meter ahead. */
        public readonly spread: number,
    ){
        super("Pompe", [
            "Tire ", pellets, " plombs devant, chacun dans un angle tiré au hasard, jusqu'à ", frenchNumber(range),
            "×", PORTEE, " ", DISTANCE, " : ", pelletDamage, "+", PRECISION, " ", DamageType.PHYSICAL, " chacun.",
        ], Rarity.RARE, ShotgunCard.#firing(range, pellets, pelletDamage, spread))
    }


    static #firing(range: number, pellets: number, pelletDamage: number, spread: number): Action {
        return {
            use: function ({ battle, unit }){
                const reach = range * unit.stats.throwRange.value
                const lines: { from: Vector2, to: Vector2 }[] = []
                for(let i = 0; i < pellets; i++){
                    const side = (battle.rng.next() * 2 - 1) * spread
                    const ahead = unit.direction
                    const way = ahead.plus(ahead.right.times(side)).normalized ?? ahead
                    const { start, end } = battle.ray(unit, reach, { position: unit.position, direction: way })
                    lines.push({ from: start, to: end })
                }
                const segment = (line: typeof lines[number], share: number): Area => {
                    const to = line.from.plus(line.to.minus(line.from).times(share))
                    return Areas.line(line.from, to, PELLET_WIDTH)
                }
                sweep(battle, BLAST_TIME, share => {
                    return lines.map(line => Previews.polygon(segment(line, share), PHYSICAL_COLOR))
                })
                for(const line of lines){
                    const pellet = pelletDamage + unit.stats.precision.value
                    battle.strike(unit, segment(line, 1), pellet, DamageType.PHYSICAL, () => 1, SHOT_LOOK)
                }
                const landed = lines.map(line => Previews.polygon(segment(line, 1), PHYSICAL_COLOR))
                hold(battle, RECOVERY_TIME, landed)
            },
            // The pellets are drawn when they fire: the preview shows where they may go.
            preview: ({ battle, unit, pose }) => {
                const radius = range * unit.stats.throwRange.value
                const cosHalf = 1 / Math.sqrt(1 + spread * spread)
                const area: Area = Areas.arc(unit.muzzle(pose), pose.direction, radius, cosHalf)
                return Previews.still(pose, ...Previews.strike([area], battle.fetch(area, unit)))
            },
        }
    }
}

export const SHOTGUN = new ShotgunCard(SHOTGUN_RANGE, SHOTGUN_PELLETS, PELLET_DAMAGE, SHOTGUN_SPREAD)
