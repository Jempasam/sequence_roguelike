import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import type { Vector2 } from "../../../base/Vector2"
import type { Action, Pose } from "../../../battle/Action"
import type { Indicator } from "../../../battle/preview/Preview"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import type { Card } from "../../Card"

import { ModifierCard } from "../ModifierCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { DISTANCE, UNIT } from "../../../base/keywords"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How far the hypnosis of the catalog reaches, in meters: as far as a spell. */
const HYPNOSIS_RANGE = 4 - UNIT_RADIUS

/** The cosine of half the angle of the cone of the hypnosis of the catalog: a cone of 60°. */
const HYPNOSIS_COS_HALF = Math.sqrt(3) / 2

/** What a hypnosis finding nobody says. */
const NOBODY = "personne à hypnotiser"

/** The unit closest to a point among others, the first of them when several are as close, none for none. */
function closestTo(point: Vector2, units: readonly Unit[]): Unit|null {
    let closest: Unit|null = null
    for(const each of units){
        if(!closest || each.position.distance(point) < closest.position.distance(point)) closest = each
    }
    return closest
}

/** A cone going through everything: the closest unit in it plays the actions at once, for the caster. */
export class HypnosisCard extends ModifierCard {


    constructor(
        /** How far it reaches, in meters. */
        public readonly range: number,

        /** The cosine of half the angle of its cone. */
        public readonly cosHalf: number,
    ){
        super(
            "Hypnose",
            [
                "L'", UNIT, " la plus proche dans un cône devant, jusqu'à ", range, " ", DISTANCE,
                " à travers tout, joue l'action à son prochain tour, à ta place : les cartes jouées s'ajoutent à sa chaîne.",
            ],
            Rarity.EPIC, (action, tree) => HypnosisCard.#hypnotizing(range, cosHalf, action, tree),
        )
    }


    static #hypnotizing(range: number, cosHalf: number, action: Action, tree: readonly Card[]): Action {
        const cone = (unit: Unit, pose: Pose): Area => {
            return Areas.arc(unit.muzzle(pose), pose.direction, range, cosHalf)
        }
        const targetOf = (battle: Battle, unit: Unit, pose: Pose): Unit|null => {
            return closestTo(pose.position, battle.fetch(cone(unit, pose), unit))
        }
        // The cone, and the arrow up to the body of the target, or the word saying nobody is in it.
        const aimed = (unit: Unit, pose: Pose, target: Unit|null): Indicator[] => {
            const zone = Previews.polygon(cone(unit, pose), CONTROL_COLOR)
            if(!target) return [zone, Previews.label(pose.position, NOBODY, NOTE_COLOR)]
            const way = target.position.minus(pose.position).normalized
            if(!way) return [zone]
            const end = target.position.minus(way.times(target.radius))
            return [zone, Previews.arrow([unit.muzzle(pose, way), end], MOVE_WIDTH, CONTROL_COLOR)]
        }
        return {
            use: ({ battle, unit }) => {
                const target = targetOf(battle, unit, unit)
                if(!target) battle.events.push({ type: "skipped", unit, reason: NOBODY })
                hold(battle, SHORT_TIME, aimed(unit, unit, target))
                if(target) battle.inject(target, action, tree)
            },
            // The action is shown from where the target stands, played by it.
            preview: ctx => {
                const target = targetOf(ctx.battle, ctx.unit, ctx.pose)
                const shown = aimed(ctx.unit, ctx.pose, target)
                if(!target) return Previews.still(ctx.pose, ...shown)
                const theirs = action.preview({ ...ctx, unit: target, pose: target })
                return Previews.still(ctx.pose, ...shown, Previews.label(target.position, "hypnotisé", NOTE_COLOR), ...theirs.indicators)
            },
        }
    }
}

export const HYPNOSIS = new HypnosisCard(HYPNOSIS_RANGE, HYPNOSIS_COS_HALF)
