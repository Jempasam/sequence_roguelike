import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action, Pose } from "../../../battle/Action"
import type { Indicator } from "../../../battle/preview/Preview"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import type { Card } from "../../Card"

import { ModifierCard } from "../ModifierCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { DISTANCE, UNIT } from "../../../base/keywords"
import { inOrder } from "../tools/sequence"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How far the synchronisation of the catalog reaches around its caster, in meters: a wide circle. */
const SYNCHRONISATION_RANGE = 6

/** What the synchronisation does when no ally is in reach: it plays alone. */
const NOBODY = "personne à synchroniser"

/**
 * A wide circle around the caster: the closest ally in it plays the action too, at its next step, while the
 * caster plays it as it would. The cards played are added to the chain of the ally.
 */
export class SynchronisationCard extends ModifierCard {


    constructor(
        /** How far it reaches around the caster, in meters. */
        public readonly range: number,
    ){
        super(
            "Synchronisation",
            [
                "L'allié le plus proche, jusqu'à ", range, " ", DISTANCE, " autour de toi, joue l'action aussi, à son prochain tour, ",
                "en même temps que toi : sans ", UNIT, " alliée, tu la joues seul.",
            ],
            Rarity.RARE, (action, tree) => inOrder([SynchronisationCard.#synchronizing(range, action, tree), action]),
        )
    }


    static #synchronizing(range: number, action: Action, tree: readonly Card[]): Action {
        const targetOf = (battle: Battle, unit: Unit, at: Pose): Unit|null => {
            return battle.nearestAlly(unit, range, at.position)
        }
        // The circle, and the arrow up to the ally, or the word saying nobody is there.
        const aimed = (pose: Pose, target: Unit|null): Indicator[] => {
            const zone = Previews.polygon(Areas.circle(pose.position, range), CONTROL_COLOR)
            if(!target) return [zone, Previews.label(pose.position, NOBODY, NOTE_COLOR)]
            const way = target.position.minus(pose.position).normalized
            if(!way) return [zone]
            const end = target.position.minus(way.times(target.radius))
            return [zone, Previews.arrow([pose.position, end], MOVE_WIDTH, CONTROL_COLOR)]
        }
        return {
            use: ({ battle, unit }) => {
                const target = targetOf(battle, unit, unit)
                if(!target) battle.events.push({ type: "skipped", unit, reason: NOBODY })
                hold(battle, SHORT_TIME, aimed(unit, target))
                if(target) battle.inject(target, action, tree)
            },
            // The action is shown from where the ally stands, as it plays it.
            preview: ctx => {
                const target = targetOf(ctx.battle, ctx.unit, ctx.pose)
                const shown = aimed(ctx.pose, target)
                if(!target) return Previews.still(ctx.pose, ...shown)
                const theirs = action.preview({ ...ctx, unit: target, pose: target })
                return Previews.still(ctx.pose, ...shown, Previews.label(target.position, "synchronisé", NOTE_COLOR), ...theirs.indicators)
            },
        }
    }
}

export const SYNCHRONISATION = new SynchronisationCard(SYNCHRONISATION_RANGE)
