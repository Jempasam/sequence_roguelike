import { Add, ModifierKey } from "../../../base/Attribute"
import { FORCE } from "../../../base/keywords"
import type { Vector2 } from "../../../base/Vector2"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import { MOMENTUM } from "../../../status/subs/Momentum"

import { AbstractItem } from "../AbstractItem"

/** The cosine of the turn, 10°, past which a move is no more along the gaze. */
const STRAIGHT_COS = Math.cos(10 * Math.PI / 180)

/** How much strength a half turn on the spot gives, for the round. */
const EYE_STRENGTH = 1

/** Where a unit stood and faced when a step of it began, and told when the step ends. */
function watchSteps(
    { unit, hold }: PlugContext, ended: (from: { position: Vector2, direction: Vector2 }) => void,
): void {
    let from = { position: unit.position, direction: unit.direction }
    hold(unit.stepStarted.add(() => {
        from = { position: unit.position, direction: unit.direction }
    }))
    hold(unit.stepEnded.add(() => ended(from)))
}

/** The eye of the predator: a half turn on the spot, a gaze caught, makes its unit stronger for the round. */
export class PredatorEye extends AbstractItem {


    constructor(){
        super("Œil du prédateur", visual("items/scope"), [
            "Après une action qui ne te déplace pas mais te tourne de plus de 90°, gagne +", EYE_STRENGTH, " ", FORCE,
            " jusqu'à la fin du round.",
        ])
    }


    public init(ctx: PlugContext): void {
        const { battle, unit, hold } = ctx
        const keys: ModifierKey[] = []
        const clear = (): void => {
            for(const key of keys) unit.stats.strength.remove(key)
            keys.length = 0
        }
        watchSteps(ctx, from => {
            if(!unit.position.equals(from.position) || from.direction.dot(unit.direction) >= 0) return
            const key = new ModifierKey("œil du prédateur")
            keys.push(key)
            unit.stats.strength.add(key, new Add(EYE_STRENGTH))
        })
        hold(battle.roundEnded.add(clear))
        hold({ remove: clear })
    }
}

export const PREDATOR_EYE = new PredatorEye()

/** Roller skates: each step carrying its unit straight along its gaze gives it a momentum. */
export class Roller extends AbstractItem {


    constructor(){
        super("Roller", visual("items/roller"), [
            "À chaque déplacement dans la direction du regard, donne +1 ", MOMENTUM, ".",
        ])
    }


    public init(ctx: PlugContext): void {
        const { battle, unit } = ctx
        watchSteps(ctx, from => {
            const way = unit.position.minus(from.position).normalized
            if(!way || !from.direction.equals(unit.direction)) return
            if(way.dot(from.direction) >= STRAIGHT_COS) battle.applyStatus(unit, MOMENTUM, 1)
        })
    }
}

export const ROLLER = new Roller()
