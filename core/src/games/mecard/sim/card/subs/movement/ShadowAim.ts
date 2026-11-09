import type { Vector2 } from "../../../base/Vector2"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR, TURN_LENGTH } from "../../../battle/previewColors"
import type { Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, turn, WORD_TIME } from "../tools/playing"
import { arrow, label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { shadowImages } from "./ShadowStep"

/** What the aim says when nobody is in reach. */
const NOBODY = "personne à viser"

/** Where a unit at a pose sees from: where it stands, then beyond each wall of the arena. */
function sights(battle: Battle, unit: Unit, pose: Pose): Vector2[] {
    return [pose.position, ...shadowImages(battle.arena, pose.position, unit.radius)]
}

/** The way to the closest enemy in vision of a pose, straight or through a wall, none when nobody is. */
function wayOf(battle: Battle, unit: Unit, pose: Pose): Vector2|null {
    let way: Vector2|null = null
    let closest = Infinity
    for(const sight of sights(battle, unit, pose)){
        const enemy = battle.nearestEnemy(unit, Infinity, sight)
        const distance = enemy?.position.distance(sight) ?? Infinity
        if(!enemy || distance >= closest) continue
        closest = distance
        way = enemy.position.minus(sight).normalized
    }
    return way
}

/** A turn at the closest enemy by the shortest way, the walls of the arena leading to the opposite ones. */
export const SHADOW_AIM = new ActionCard("Viser de l'ombre", [
    "Se tourne vers l'ennemi le plus proche, en comptant à travers les murs de l'arène, qui mènent au mur opposé.",
], Rarity.RARE, {
    use: function* (ctx){
        const { battle, unit } = ctx
        const way = wayOf(battle, unit, unit)
        if(way){
            yield* turn(ctx, way)
            return
        }
        battle.events.push({ type: "skipped", unit, reason: NOBODY })
        yield* hold(battle, WORD_TIME, [label(unit.position, NOBODY, NOTE_COLOR)])
    },
    // A reach around each place it sees from: what lies past a wall shows on the opposite side.
    preview: ({ battle, unit, pose }) => {
        const way = wayOf(battle, unit, pose)
        if(!way) return still(pose, label(pose.position, NOBODY, NOTE_COLOR))
        const tip = pose.position.plus(way.times(TURN_LENGTH))
        const turned = arrow([pose.position, tip], MOVE_WIDTH, MOVE_COLOR)
        return still({ ...pose, direction: way }, turned)
    },
})
