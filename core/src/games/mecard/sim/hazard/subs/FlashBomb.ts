import type { Vector2 } from "../../base/Vector2"
import type { Battle } from "../../battle/Battle"
import type { Unit } from "../../battle/Unit"
import { FLASH } from "../../card/subs/body/BodyCards"
import { WAIT } from "../../card/subs/movement/Wait"
import { Heart } from "../../heart/Heart"
import { TIME_HEART } from "../../heart/subs/TimeHeartKind"
import { placeHazard } from "../Hazard"
import { BOMB_RADIUS } from "./Bomb"

/** Leave a flash bomb thrown by a unit: it plays right after it, waits, then flashes at the next pass. */
export function placeFlashBomb(battle: Battle, owner: Unit, center: Vector2): Unit|null {
    return placeHazard(battle, owner, {
        sprite: "bomb", name: "Grenade flash", zone: { kind: "circle", center, radius: BOMB_RADIUS },
        hearts: [new Heart(TIME_HEART)], cards: [WAIT, FLASH],
    })
}
