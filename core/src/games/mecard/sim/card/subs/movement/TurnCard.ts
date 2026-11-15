import type { Text } from "../../../../../../semantic"
import { Direction } from "../../../base/Direction"
import { Vector2 } from "../../../base/Vector2"
import { MOVE_COLOR, MOVE_WIDTH, TURN_LENGTH } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"
import type { Card } from "../../Card"

import { ActionCard } from "../ActionCard"
import { turn } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"

/** How many directions a turn can face: a full turn cut in as many steps, the first one straight up. */
export const TURN_STEPS = 32

/** The unit vectors of the steps, clockwise from up, written out so the simulation computes no angle. */
const DIRECTIONS: readonly Vector2[] = [
    new Vector2(0, -1), new Vector2(0.1950903, -0.9807853),
    new Vector2(0.3826834, -0.9238795), new Vector2(0.5555702, -0.8314696),
    new Vector2(0.7071068, -0.7071068), new Vector2(0.8314696, -0.5555702),
    new Vector2(0.9238795, -0.3826834), new Vector2(0.9807853, -0.1950903),
    new Vector2(1, 0), new Vector2(0.9807853, 0.1950903),
    new Vector2(0.9238795, 0.3826834), new Vector2(0.8314696, 0.5555702),
    new Vector2(0.7071068, 0.7071068), new Vector2(0.5555702, 0.8314696),
    new Vector2(0.3826834, 0.9238795), new Vector2(0.1950903, 0.9807853),
    new Vector2(0, 1), new Vector2(-0.1950903, 0.9807853),
    new Vector2(-0.3826834, 0.9238795), new Vector2(-0.5555702, 0.8314696),
    new Vector2(-0.7071068, 0.7071068), new Vector2(-0.8314696, 0.5555702),
    new Vector2(-0.9238795, 0.3826834), new Vector2(-0.9807853, 0.1950903),
    new Vector2(-1, 0), new Vector2(-0.9807853, -0.1950903),
    new Vector2(-0.9238795, -0.3826834), new Vector2(-0.8314696, -0.5555702),
    new Vector2(-0.7071068, -0.7071068), new Vector2(-0.5555702, -0.8314696),
    new Vector2(-0.3826834, -0.9238795), new Vector2(-0.1950903, -0.9807853),
]

/**
 * Every turn, by the direction it turns to, in order from straight up: what a unit plays one of per round,
 * whichever way it faces, so it is also what they have in common.
 */
const TURN_VARIANTS = new Map<Text, Card>()

/** A card turning its unit to one of {@link TURN_STEPS} directions, whatever way it faced. */
export class TurnCard extends ActionCard {


    constructor(
        /** Which of the directions it turns to, from 0 straight up, clockwise. */
        public readonly step: number,
    ){
        super("Tourner", "Se tourne vers la direction du trait.", Rarity.COMMON, TurnCard.#turning(DIRECTIONS[step]))
        this.direction = DIRECTIONS[step]
    }


    /** The unit vector it turns to. */
    public readonly direction: Vector2

    public readonly group = TURN_VARIANTS

    public override variants(): ReadonlyMap<Text, Card> {
        return TURN_VARIANTS
    }

    public override variantFor(unit: Unit): Card {
        return TURNS[nearestTurn(unit.direction)]
    }

    static #turning(direction: Vector2): Action {
        return {
            use: ctx => turn(ctx, direction),
            preview: ({ pose }) => {
                const tip = pose.position.plus(direction.times(TURN_LENGTH))
                return Previews.still({ ...pose, direction }, Previews.arrow([pose.position, tip], MOVE_WIDTH, MOVE_COLOR))
            },
        }
    }
}

/** Every turn, by step: the only instances, so a card is told from another by its place here. */
export const TURNS: readonly TurnCard[] = DIRECTIONS.map((_, step) => new TurnCard(step))

for(const turn of TURNS) TURN_VARIANTS.set(new Direction(turn.direction), turn)

/** The step whose direction is the nearest to a vector, 0 when it has none. */
export function nearestTurn(direction: Vector2): number {
    let best = 0
    for(let step = 1; step < TURN_STEPS; step++){
        if(DIRECTIONS[step].dot(direction) > DIRECTIONS[best].dot(direction)) best = step
    }
    return best
}
