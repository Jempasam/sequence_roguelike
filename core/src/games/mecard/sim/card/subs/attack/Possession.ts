import { DISTANCE, HEART, UNIT } from "../../../base/keywords"
import type { Vector2 } from "../../../base/Vector2"
import type { Battle } from "../../../battle/Battle"
import { DamageType } from "../../../battle/DamageType"
import { NOTE_COLOR, PHYSICAL_COLOR, RANGE_COLOR } from "../../../battle/previewColors"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How far around the possession looks for its prey, in meters. */
const POSSESSION_RADIUS = 3

/** How many hearts its prey has at most. */
const POSSESSION_MAX_LIFE = 3

/** How many hearts it takes from its prey. */
const POSSESSION_DAMAGE = 3

/** Its prey from a point: the enemy around with the fewest hearts, then the nearest, none with too many. */
function preyOf(battle: Battle, unit: Unit, from: Vector2): Unit|null {
    const prey = battle.enemiesOf(unit).filter(enemy => {
        return enemy.alive && enemy.targetable && enemy.life <= POSSESSION_MAX_LIFE
            && enemy.position.distance(from) <= POSSESSION_RADIUS + enemy.radius
    })
    prey.sort((a, b) => a.life - b.life || a.position.distance(from) - b.position.distance(from))
    return prey[0] ?? null
}

export const POSSESSION = new ActionCard("Possession", [
    "Frappe l'", UNIT, " ennemie la plus faible, puis la plus proche, à ", POSSESSION_RADIUS, " ", DISTANCE,
    " autour, d'au plus ", POSSESSION_MAX_LIFE, " ", HEART.as("cœurs"), " : ", POSSESSION_DAMAGE, " ",
    DamageType.PHYSICAL, ". Si elle meurt, tu prends sa place, tourné comme tu l'étais, et joues après ta chaîne ",
    "ce qu'il restait de la sienne.",
], Rarity.EPIC, {
    use: function ({ battle, unit }){
        const prey = preyOf(battle, unit, unit.position)
        if(!prey){
            hold(battle, SHORT_TIME, [Previews.label(unit.position, "aucune proie", NOTE_COLOR)])
            return
        }
        const area = Areas.circle(prey.position, prey.radius)
        // Read before the blow: dying, the prey keeps its chain, but what it holds may change.
        const left = prey.unplayed()
        const at = prey.position
        battle.strike(unit, area, POSSESSION_DAMAGE, DamageType.PHYSICAL, target => target === prey ? 1 : 0)
        hold(battle, SHORT_TIME, [Previews.polygon(area, PHYSICAL_COLOR)])
        if(prey.alive || !unit.alive) return
        battle.teleport(unit, at)
        battle.appendToChain(unit, left)
    },
    preview: ({ battle, unit, pose }) => {
        const zone = Previews.polygon(Areas.circle(pose.position, POSSESSION_RADIUS), RANGE_COLOR)
        const prey = preyOf(battle, unit, pose.position)
        return Previews.still(pose, zone, ...prey ? [...Previews.strike([], [prey]), Previews.label(prey.position, "possession", NOTE_COLOR)] : [])
    },
})
