import { rgba } from "../../base/Rgba"
import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { damage } from "../../battle/words"
import { placeBoulder } from "../../hazard/subs/Rocky"
import { Heart } from "../../heart/Heart"
import { SHIELD_HEART } from "../../heart/subs/ShieldHeartKind"
import { AbstractElement } from "../AbstractElement"
import type { Element } from "../Element"

/** How many hearts the stone takes. */
const STONE_DAMAGE = 2

/** Stone: it wounds and shields, and stands in the way. */
export class Stone extends AbstractElement {


    constructor(){
        super(
            "Pierre", rgba(0.65, 0.62, 0.58), "écrasé",
            damage(STONE_DAMAGE, "physical"),
            ["un cœur ", SHIELD_HEART],
            "un rocher : qui le touche subit le négatif, une fois",
        )
    }


    public applyNegative({ unit }: UnitContext, target: Unit): void {
        target.hearts.damage(STONE_DAMAGE, "physical", unit)
    }

    public applyPositive(_ctx: UnitContext, target: Unit): void {
        target.hearts.give(new Heart(SHIELD_HEART))
    }

    public invoke({ battle, unit }: UnitContext, at: Vector2, direction: Vector2, effect: Element): void {
        placeBoulder(battle, unit, at, direction, effect)
    }
}

export const STONE_ELEMENT = new Stone()
