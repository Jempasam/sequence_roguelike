import { Vector2 } from "../../../base/Vector2"
import { MOVE_COLOR, MOVE_WIDTH, TURN_LENGTH } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"

import { ActionCard } from "../ActionCard"
import { turn } from "../tools/playing"
import { arrow, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** How many directions a turn can face: a full turn cut in as many steps, the first one straight up. */
export const TURN_STEPS = 16

/** The unit vectors of the steps, clockwise from up, written out so the simulation computes no angle. */
const DIRECTIONS: readonly Vector2[] = [
    new Vector2(0, -1), new Vector2(0.3826834, -0.9238795), new Vector2(0.7071068, -0.7071068),
    new Vector2(0.9238795, -0.3826834), new Vector2(1, 0), new Vector2(0.9238795, 0.3826834),
    new Vector2(0.7071068, 0.7071068), new Vector2(0.3826834, 0.9238795), new Vector2(0, 1),
    new Vector2(-0.3826834, 0.9238795), new Vector2(-0.7071068, 0.7071068), new Vector2(-0.9238795, 0.3826834),
    new Vector2(-1, 0), new Vector2(-0.9238795, -0.3826834), new Vector2(-0.7071068, -0.7071068),
    new Vector2(-0.3826834, -0.9238795),
]

/** What every turn has in common: a unit plays one turn per round, whichever way it faces. */
const TURN_GROUP = {}

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

    public readonly group = TURN_GROUP

    static #turning(direction: Vector2): Action {
        return {
            use: ctx => turn(ctx, direction),
            preview: ({ pose }) => {
                const tip = pose.position.plus(direction.times(TURN_LENGTH))
                return still({ ...pose, direction }, arrow([pose.position, tip], MOVE_WIDTH, MOVE_COLOR))
            },
        }
    }
}

/** Every turn, by step: the only instances, so a card is told from another by its place here. */
export const TURNS: readonly TurnCard[] = DIRECTIONS.map((_, step) => new TurnCard(step))

/** The step whose direction is the nearest to a vector, 0 when it has none. */
export function nearestTurn(direction: Vector2): number {
    let best = 0
    for(let step = 1; step < TURN_STEPS; step++){
        if(DIRECTIONS[step].dot(direction) > DIRECTIONS[best].dot(direction)) best = step
    }
    return best
}
