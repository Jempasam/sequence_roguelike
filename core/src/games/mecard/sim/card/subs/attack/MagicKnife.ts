import { visual } from "../../../base/Visual"
import { DISTANCE, PORTEE, UNIT } from "../../../base/keywords"
import type { Vector2 } from "../../../base/Vector2"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import { DamageType } from "../../../battle/DamageType"
import type { Unit } from "../../../battle/Unit"
import { NOTE_COLOR, PHYSICAL_COLOR } from "../../../battle/previewColors"
import { Heart } from "../../../heart/Heart"
import { SOLID_HEART } from "../../../heart/subs/SolidHeartKind"
import { KNIFE_RETURN_DAMAGE, KnifeReturn } from "../../../process/subs/KnifeReturn"
import { Rarity } from "../../Rarity"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How many hearts the knife takes from each unit it goes through, before any bonus. */
const KNIFE_DAMAGE = 1

/** How far the knife flies, in meters, before the reach of the unit. */
const KNIFE_RANGE = 5

/** How wide the way of the knife is, in meters: a thin line. */
const KNIFE_WIDTH = 0.3

/** Where a knife thrown from a pose ends: at the first wall or pillar, going through every body. */
function landing(battle: Battle, unit: Unit, pose: Pose): Vector2 {
    const range = KNIFE_RANGE * unit.stats.throwRange.value
    const crossed: Unit[] = []
    for(;;){
        const { end, unit: met } = battle.ray(unit, range, pose, crossed)
        if(!met) return end
        crossed.push(met)
    }
}

/** The way of the knife, from a pose to where it lands. */
function wayOf(from: Vector2, to: Vector2): Area {
    return Areas.line(from, to, KNIFE_WIDTH)
}

/**
 * A knife thrown ahead, going through everything: it wounds each unit on its way, and stays where it landed. As the
 * round ends it comes back to its thrower, wounding each unit on the way back.
 */
export const MAGIC_KNIFE = new ActionCard("Couteau magique", [
    "Lance un couteau droit devant, jusqu'à ", KNIFE_RANGE, "×", PORTEE, " ", DISTANCE, " : ", KNIFE_DAMAGE, " ",
    DamageType.PHYSICAL, " à chaque ", UNIT, " sur le chemin. À la fin du round, il revient vers toi : ",
    KNIFE_RETURN_DAMAGE, " ", DamageType.PHYSICAL, " à chaque ", UNIT, " sur le chemin.",
], Rarity.EPIC, {
    use: function ({ battle, unit }){
        const end = landing(battle, unit, unit)
        battle.strike(unit, wayOf(unit.position, end), KNIFE_DAMAGE, DamageType.PHYSICAL)
        const knife = battle.place(unit, {
            sprite: visual("units/spirit"), name: "Couteau de lancer", at: end, direction: unit.direction,
            hearts: [new Heart(SOLID_HEART)], tangible: false, targetable: false, touchable: false, movable: false,
        })
        if(knife) battle.startProcess(unit, new KnifeReturn(knife))
        hold(battle, SHORT_TIME, [Previews.label(end, "couteau", NOTE_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        const end = landing(battle, unit, pose)
        const way = wayOf(pose.position, end)
        return Previews.still(
            pose, Previews.polygon(way, PHYSICAL_COLOR), Previews.polygon(wayOf(end, pose.position), PHYSICAL_COLOR),
            Previews.label(end, "couteau", NOTE_COLOR),
        )
    },
})
