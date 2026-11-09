import { frenchNumber } from "../../../battle/words"
import { DISTANCE, PORTEE, PRECISION } from "../../../base/keywords"
import { PHYSICAL_COLOR } from "../../../battle/previewColors"
import type { Vector2 } from "../../../base/Vector2"
import type { Action } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"

import { ActionCard } from "../ActionCard"
import { hold, sweep } from "../tools/playing"
import { polygon, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { DamageType } from "../../../battle/DamageType"

/** How far the shotgun of the catalog reaches, in meters, before the reach of the unit. */
const SHOTGUN_RANGE = 2.5

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
            use: function* ({ battle, unit }){
                const reach = range * unit.stats.throwRange.value
                const lines: { from: Vector2, to: Vector2 }[] = []
                for(let i = 0; i < pellets; i++){
                    const side = (battle.rng.next() * 2 - 1) * spread
                    const ahead = unit.direction
                    const way = ahead.plus(ahead.right.times(side)).normalized ?? ahead
                    const { end } = battle.ray(unit, reach, { position: unit.position, direction: way })
                    lines.push({ from: unit.position, to: end })
                }
                const segment = (line: typeof lines[number], share: number): Area => {
                    const to = line.from.plus(line.to.minus(line.from).times(share))
                    return { kind: "segment", from: line.from, to, width: PELLET_WIDTH }
                }
                yield* sweep(battle, BLAST_TIME, share => {
                    return lines.map(line => polygon(segment(line, share), PHYSICAL_COLOR))
                })
                for(const line of lines){
                    const pellet = pelletDamage + unit.stats.precision.value
                    battle.strike(unit, segment(line, 1), pellet, DamageType.PHYSICAL)
                }
                const landed = lines.map(line => polygon(segment(line, 1), PHYSICAL_COLOR))
                yield* hold(battle, RECOVERY_TIME, landed)
            },
            // The pellets are drawn when they fire: the preview shows where they may go.
            preview: ({ unit, pose }) => {
                const radius = range * unit.stats.throwRange.value
                const cosHalf = 1 / Math.sqrt(1 + spread * spread)
                return still(pose, polygon({
                    kind: "sector", center: pose.position, direction: pose.direction, radius, cosHalf,
                }, PHYSICAL_COLOR))
            },
        }
    }
}

export const SHOTGUN = new ShotgunCard(SHOTGUN_RANGE, SHOTGUN_PELLETS, PELLET_DAMAGE, SHOTGUN_SPREAD)
