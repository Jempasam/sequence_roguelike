import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR, RANGE_COLOR } from "../../../battle/previewColors"
import { damage, meters } from "../../../battle/words"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import type { Process } from "../../../process/Process"
import { Hook, IronChain, LaserLink } from "../../../process/subs/Links"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { arrow, label, polygon, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** How many hearts the laser link takes from each enemy across it, each end of a turn. */
const LASER_DAMAGE = 1

/** How close the ally hooked stands at most, from center to center, in meters. */
const HOOK_REACH = 2

/** How far the iron chain aims, how far apart its ends may stand before it pulls, and how far it pulls. */
const CHAIN_RANGE = 2
const CHAIN_SLACK = 2
const CHAIN_PULL = 1

/**
 * An action tying its unit to another for the round: what it finds from a pose, none when there is none, and
 * the process tying them.
 */
function linkAction(
    find: (battle: Battle, unit: Unit, pose: Pose) => Unit|null,
    process: (partner: Unit) => Process,
    word: string,
    /** How far around the unit it looks for the partner, in meters, shown under the preview; none for no circle. */
    reach?: number,
): Action {
    return {
        use: function* ({ battle, unit }){
            const partner = find(battle, unit, unit)
            if(!partner){
                battle.events.push({ type: "skipped", unit, reason: "personne à lier" })
                yield* hold(battle, SHORT_TIME, [label(unit.position, "personne", NOTE_COLOR)])
                return
            }
            battle.startProcess(unit, process(partner))
            yield* hold(battle, SHORT_TIME, [arrow([unit.position, partner.position], MOVE_WIDTH, CONTROL_COLOR)])
        },
        preview: ({ battle, unit, pose }) => {
            const partner = find(battle, unit, pose)
            const circle = reach === undefined ? [] : [polygon({ kind: "circle", center: pose.position, radius: reach }, RANGE_COLOR)]
            if(!partner) return still(pose, ...circle, label(pose.position, "personne", NOTE_COLOR))
            return still(
                pose, ...circle,
                label(pose.position, word, NOTE_COLOR),
                arrow([pose.position, partner.position], MOVE_WIDTH, CONTROL_COLOR),
            )
        },
    }
}


export const LASER_LINK = new ActionCard("Lien laser", [
    "Jusqu'à la fin du round, un laser te relie à l'allié le plus proche : à chaque fin de tour, ",
    damage(LASER_DAMAGE, "physical"), " à chaque ennemi sur le laser.",
], Rarity.RARE, linkAction(
    (battle, unit, pose) => battle.nearestAlly(unit, Infinity, pose.position),
    ally => new LaserLink(ally, LASER_DAMAGE), "laser",
))

export const HOOK_ON = new ActionCard("Accroche", [
    "S'accroche à l'allié le plus proche, à ", meters(HOOK_REACH), " au plus, jusqu'à la fin du round : quand tu ",
    "bouges ou tournes, il te suit en gardant sa place. L'accroche casse s'il se retrouve trop loin.",
], Rarity.COMMON, linkAction(
    (battle, unit, pose) => battle.nearestAlly(unit, HOOK_REACH, pose.position),
    ally => new Hook(ally, HOOK_REACH), "accroche", HOOK_REACH,
))

export const IRON_CHAIN = new ActionCard("Chaîne de fer", [
    "Enchaîne le premier ennemi devant toi, à ", meters(CHAIN_RANGE), " au plus, jusqu'à la fin du round : à chaque ",
    "fin de tour, s'il est à plus de ", meters(CHAIN_SLACK), ", vous êtes tirés l'un vers l'autre de ",
    meters(CHAIN_PULL), " chacun.",
], Rarity.RARE, linkAction(
    (battle, unit, pose) => {
        const hit = battle.ray(unit, CHAIN_RANGE, pose).unit
        return hit && hit.team !== unit.team ? hit : null
    },
    target => new IronChain(target, CHAIN_SLACK, CHAIN_PULL), "chaîne",
))
