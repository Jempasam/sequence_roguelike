import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import type { Vector2 } from "../../../base/Vector2"
import type { Action, Indicator, Pose, Preview, PreviewContext } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"

import { ModifierCard } from "../ModifierCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { arrow, chained, label, polygon, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { DISTANCE, UNIT } from "../../../base/keywords"

/** How far the hypnosis of the catalog reaches, in meters: as far as a spell. */
const HYPNOSIS_RANGE = 4

/** The cosine of half the angle of the cone of the hypnosis of the catalog: a cone of 60°. */
const HYPNOSIS_COS_HALF = Math.sqrt(3) / 2

/** What a hypnosis finding nobody says. */
const NOBODY = "personne à hypnotiser"

/** The previews of actions one after the other, from a pose. */
function previewAll(actions: readonly Action[], ctx: PreviewContext, from: Pose): Preview {
    const previews: Preview[] = []
    let pose = from
    for(const each of actions){
        const preview = each.preview({ ...ctx, pose })
        previews.push(preview)
        pose = preview.pose
    }
    return chained(previews, from)
}

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
                " à travers tout, joue l'action tout de suite, à ta place.",
            ],
            Rarity.EPIC, actions => [HypnosisCard.#hypnotizing(range, cosHalf, actions)],
        )
    }


    static #hypnotizing(range: number, cosHalf: number, actions: readonly Action[]): Action {
        const cone = ({ position, direction }: Pose): Area => {
            return { kind: "sector", center: position, direction, radius: range, cosHalf }
        }
        const targetOf = (battle: Battle, unit: Unit, pose: Pose): Unit|null => {
            return closestTo(pose.position, battle.unitsIn(cone(pose), unit))
        }
        // The cone, and the arrow up to the body of the target, or the word saying nobody is in it.
        const aimed = (pose: Pose, target: Unit|null): Indicator[] => {
            const zone = polygon(cone(pose), CONTROL_COLOR)
            if(!target) return [zone, label(pose.position, NOBODY, NOTE_COLOR)]
            const way = target.position.minus(pose.position).normalized
            if(!way) return [zone]
            const end = target.position.minus(way.times(target.radius))
            return [zone, arrow([pose.position, end], MOVE_WIDTH, CONTROL_COLOR)]
        }
        return {
            use: function* ({ battle, unit }){
                const target = targetOf(battle, unit, unit)
                if(!target) battle.events.push({ type: "skipped", unit, reason: NOBODY })
                yield* hold(battle, SHORT_TIME, aimed(unit, target))
                if(target) battle.inject(target, actions)
            },
            // The actions are shown from where the target stands, played by it.
            preview: ctx => {
                const target = targetOf(ctx.battle, ctx.unit, ctx.pose)
                const shown = aimed(ctx.pose, target)
                if(!target) return still(ctx.pose, ...shown)
                const theirs = previewAll(actions, { ...ctx, unit: target }, target)
                return still(ctx.pose, ...shown, label(target.position, "hypnotisé", NOTE_COLOR), ...theirs.indicators)
            },
        }
    }
}

export const HYPNOSIS = new HypnosisCard(HYPNOSIS_RANGE, HYPNOSIS_COS_HALF)
