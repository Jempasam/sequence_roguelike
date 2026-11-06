import type { Vector2 } from "../../base/Vector2"
import type { Battle } from "../../battle/Battle"
import type { Unit } from "../../battle/Unit"
import { KAMIKAZE } from "../../card/subs/body/BodyCards"
import { WAIT } from "../../card/subs/movement/Wait"
import { Heart } from "../../heart/Heart"
import { TIME_HEART } from "../../heart/subs/TimeHeartKind"
import { placeHazard } from "../Hazard"

/** The radius a bomb is drawn with, in meters. */
export const BOMB_RADIUS = 0.2

/** Leave a bomb thrown by a unit: it plays right after it, waits, then blows up at the next pass. */
export function placeBomb(battle: Battle, owner: Unit, center: Vector2): Unit|null {
    return placeHazard(battle, owner, {
        sprite: "bomb", name: "Bombe", zone: { kind: "circle", center, radius: BOMB_RADIUS },
        hearts: [new Heart(TIME_HEART)], cards: [WAIT, KAMIKAZE],
    })
}
