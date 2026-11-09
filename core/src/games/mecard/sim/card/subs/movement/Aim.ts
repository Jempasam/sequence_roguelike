import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import type { Unit } from "../../../battle/Unit"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR, TURN_LENGTH } from "../../../battle/previewColors"
import type { Action, PreviewContext } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"

import { ActionCard } from "../ActionCard"
import { hold, turn, WORD_TIME } from "../tools/playing"
import { arrow, label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/**
 * Which enemy in reach an aim turns to: the closest, one drawn at random when it plays, the one with the
 * most hearts, the one lacking the most, or the farthest.
 */
export type AimChoice = "nearest"|"random"|"sturdiest"|"weakest"|"farthest"

/** The enemies of a unit, in the order they entered: an aim sees as far as the arena goes. */
function enemiesInReach(battle: Battle, unit: Unit): Unit[] {
    return battle.enemiesOf(unit)
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
    ){
        super(name, description, rarity, AimCard.#aiming(choice))
    }


    /**
     * The enemy it would turn to from a point, none when there is none. One drawn at random is drawn from
     * the battle, unless it is a preview, which cannot know.
     */
    static #target(
        choice: AimChoice, battle: Battle, unit: Unit, from: Vector2, playing: boolean,
    ): Unit|null {
        const enemies = enemiesInReach(battle, unit)
        switch(choice){
            case "nearest": return battle.nearestEnemy(unit, Infinity, from)
            case "random": return playing ? battle.rng.pick(enemies) ?? null : null
            case "sturdiest": return best(enemies, enemy => enemy.life)
            case "weakest": return best(enemies, enemy => enemy.missing)
            case "farthest": return best(enemies, enemy => enemy.position.distance(from))
            default: return null
        }
    }

    static #aiming(choice: AimChoice): Action {
        const toward = ({ battle, unit, pose }: PreviewContext, playing: boolean): Vector2|null => {
            const target = AimCard.#target(choice, battle, unit, pose.position, playing)
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
            preview: ctx => {
                const { battle, unit, pose } = ctx
                if(choice === "random"){
                    const some = enemiesInReach(battle, unit).length > 0
                    return still(pose, label(pose.position, some ? "au hasard" : "personne à viser", NOTE_COLOR))
                }
                const way = toward(ctx, false)
                if(!way) return still(pose, label(pose.position, "personne à viser", NOTE_COLOR))
                const tip = pose.position.plus(way.times(TURN_LENGTH))
                const turned = arrow([pose.position, tip], MOVE_WIDTH, MOVE_COLOR)
                return still({ ...pose, direction: way }, turned)
            },
        }
    }
}

export const AIM = new AimCard("Viser", [
    "Se tourne droit vers l'ennemi le plus proche, aussi loin soit-il.",
], Rarity.COMMON, "nearest")

export const RANDOM_AIM = new AimCard("Viser au hasard", [
    "Se tourne droit vers un ennemi tiré au hasard.",
], Rarity.COMMON, "random")

export const FAR_AIM = new AimCard("Viser le plus loin", [
    "Se tourne droit vers l'ennemi le plus éloigné.",
], Rarity.COMMON, "farthest")

export const STURDY_AIM = new AimCard("Viser le plus robuste", [
    "Se tourne droit vers l'ennemi qui a le plus de cœurs.",
], Rarity.RARE, "sturdiest")

export const WEAK_AIM = new AimCard("Viser le plus blessé", [
    "Se tourne droit vers l'ennemi le plus blessé.",
], Rarity.RARE, "weakest")
