import type { Area } from "../../battle/Area"
import type { Battle } from "../../battle/Battle"
import type { Unit } from "../../battle/Unit"
import { BLAZE } from "../../card/subs/body/BodyCards"
import { WAIT } from "../../card/subs/movement/Wait"
import { Heart } from "../../heart/Heart"
import { TIME_HEART } from "../../heart/subs/TimeHeartKind"
import { placeHazard } from "../Hazard"

/** Leave flames lit by a unit: they play right after it, wait, then burn whoever is still in them. */
export function placeFlames(battle: Battle, owner: Unit, area: Area): Unit|null {
    return placeHazard(battle, owner, {
        sprite: "fire", name: "Flammes", zone: area, hearts: [new Heart(TIME_HEART)], cards: [WAIT, BLAZE],
    })
}
