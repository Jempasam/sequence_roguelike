import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import { AIM_RANGE } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR, RANGE_COLOR, TURN_LENGTH } from "../../../battle/previewColors"
import { frenchNumber, meters } from "../../../battle/words"
import type { Action, PreviewContext } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"

import { ActionCard } from "../ActionCard"
import { hold, turn, WORD_TIME } from "../tools/playing"
import { arrow, label, polygon, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/**
 * Which enemy in reach an aim turns to: the closest, one drawn at random when it plays, the one with the
 * most hearts, the one lacking the most, or the farthest.
 */
export type AimChoice = "nearest"|"random"|"sturdiest"|"weakest"|"farthest"

/** How much farther than the vision the aims of the catalog looking for more than the closest reach. */
const LONG_AIM = 1.5

/** The enemies of a unit in a reach from a point, in the order they entered. */
function enemiesInReach(battle: Battle, unit: Unit, range: number, from: Vector2): Unit[] {
    return battle.enemiesOf(unit).filter(enemy => enemy.position.distance(from) <= range)
}

/** The enemy that best fits a measure, the first of the ties, none for none. */
function best(enemies: readonly Unit[], measure: (enemy: Unit) => number): Unit|null {
    let found: Unit|null = null
    let score = -Infinity
    for(const enemy of enemies){
        const value = measure(enemy)
        if(value > score){
            found = enemy
            score = value
        }
    }
    return found
}

/** A turn straight at an enemy in reach, chosen by a rule: the answer to an enemy that moves. */
export class AimCard extends ActionCard {


    constructor(
        name: string, description: Text, rarity: Rarity,

        /** Which enemy it turns to. */
        public readonly choice: AimChoice,

        /** How much farther than the vision of its unit it reaches, a factor. */
        public readonly reach: number,
    ){
        super(name, description, rarity, AimCard.#aiming(choice, reach))
    }


    /**
     * The enemy it would turn to from a point, none when there is none. One drawn at random is drawn from
     * the battle, unless it is a preview, which cannot know.
     */
    static #target(
        choice: AimChoice, battle: Battle, unit: Unit, range: number, from: Vector2, playing: boolean,
    ): Unit|null {
        const enemies = enemiesInReach(battle, unit, range, from)
        switch(choice){
            case "nearest": return battle.nearestEnemy(unit, range, from)
            case "random": return playing ? battle.rng.pick(enemies) ?? null : null
            case "sturdiest": return best(enemies, enemy => enemy.life)
            case "weakest": return best(enemies, enemy => enemy.missing)
            case "farthest": return best(enemies, enemy => enemy.position.distance(from))
            default: return null
        }
    }

    static #aiming(choice: AimChoice, reach: number): Action {
        const range = (unit: Unit) => unit.stats.aimRange.value * reach
        const toward = ({ battle, unit, pose }: PreviewContext, playing: boolean): Vector2|null => {
            const target = AimCard.#target(choice, battle, unit, range(unit), pose.position, playing)
            return target?.position.minus(pose.position).normalized ?? null
        }
        return {
            use: function* (ctx){
                const { battle, unit } = ctx
                const way = toward({ battle, unit, pose: unit }, true)
                if(way){
                    yield* turn(ctx, way)
                    return
                }
                battle.events.push({ type: "skipped", unit, reason: "personne à viser" })
                yield* hold(battle, WORD_TIME, [label(unit.position, "personne à viser", NOTE_COLOR)])
            },
            // The reach shows under the turn, so where an enemy must stand to be aimed at reads at a glance.
            preview: ctx => {
                const { battle, unit, pose } = ctx
                const reachShown = polygon({ kind: "circle", center: pose.position, radius: range(unit) }, RANGE_COLOR)
                if(choice === "random"){
                    const some = enemiesInReach(battle, unit, range(unit), pose.position).length > 0
                    return still(pose, reachShown, label(pose.position, some ? "au hasard" : "personne à viser", NOTE_COLOR))
                }
                const way = toward(ctx, false)
                if(!way) return still(pose, reachShown, label(pose.position, "personne à viser", NOTE_COLOR))
                const tip = pose.position.plus(way.times(TURN_LENGTH))
                const turned = arrow([pose.position, tip], MOVE_WIDTH, MOVE_COLOR)
                return still({ ...pose, direction: way }, reachShown, turned)
            },
        }
    }
}

/** What an aim reaching farther than the vision says of its reach. */
function longReach(): Text {
    return `la vision × ${frenchNumber(LONG_AIM)}`
}

export const AIM = new AimCard("Viser", [
    "Se tourne droit vers l'ennemi le plus proche, jusqu'à ", meters(AIM_RANGE), " (la vision).",
], Rarity.COMMON, "nearest", 1)

export const RANDOM_AIM = new AimCard("Viser au hasard", [
    "Se tourne droit vers un ennemi tiré au hasard, jusqu'à ", longReach(), ".",
], Rarity.COMMON, "random", LONG_AIM)

export const FAR_AIM = new AimCard("Viser le plus loin", [
    "Se tourne droit vers l'ennemi le plus éloigné, jusqu'à ", longReach(), ".",
], Rarity.COMMON, "farthest", LONG_AIM)

export const STURDY_AIM = new AimCard("Viser le plus robuste", [
    "Se tourne droit vers l'ennemi qui a le plus de cœurs, jusqu'à ", longReach(), ".",
], Rarity.RARE, "sturdiest", LONG_AIM)

export const WEAK_AIM = new AimCard("Viser le plus blessé", [
    "Se tourne droit vers l'ennemi le plus blessé, jusqu'à ", longReach(), ".",
], Rarity.RARE, "weakest", LONG_AIM)
