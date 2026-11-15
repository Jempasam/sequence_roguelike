import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { firstRound } from "../../catalog/monsterRounds"
import type { Monster } from "../../catalog/monsters"
import { Heart } from "../../heart/Heart"
import { BLUE_HEART } from "../../heart/subs/BlueHeartKind"
import { levelOf, pour } from "../../potion/Potion"
import type { Dose, Potion } from "../../potion/Potion"
import { soakOf } from "../../status/subs/Soaked"
import { AbstractElement } from "../AbstractElement"

/** A dose of a potion as it is poured: not turned around, not distilled. */
function doseOf(potion: Potion): Dose {
    return { potion, sign: 1, factor: 1 }
}

/**
 * An element made from a monster and two potions: a vector of what it does against a unit (the first potion),
 * what it does for it (the second), and what it calls, a body of the monster with blue hearts soaked with the
 * first potion, which it pours on whatever it hits.
 *
 * @remarks
 * It holds no state. Its name tells the monster and both potions, so two of them with the same ones are the
 * same element to a status made for an element.
 */
export class MonsterElement extends AbstractElement {


    constructor(
        public readonly monster: Monster,

        /** The potion it pours against a unit, and the one its body is soaked with. */
        public readonly negative: Potion,

        /** The potion it pours for a unit. */
        public readonly positive: Potion,
    ){
        super(
            `${monster.name} (${negative.name}/${positive.name})`, negative.color, negative.name,
            ["verse ", negative],
            ["verse ", positive],
            ["un ", monster, " à cœurs bleus, mouillé de ", negative],
        )
    }


    public applyNegative({ battle, unit }: UnitContext, target: Unit): void {
        const dose = doseOf(this.negative)
        pour(battle, dose, target, levelOf(dose, unit))
    }

    public applyPositive({ battle, unit }: UnitContext, target: Unit): void {
        const dose = doseOf(this.positive)
        pour(battle, dose, target, levelOf(dose, unit))
    }

    // The element to apply is this one's own: the body it calls pours its first potion through its soaking.
    public invoke({ battle, unit }: UnitContext, at: Vector2, direction: Vector2): void {
        const { monster } = this
        const dose = doseOf(this.negative)
        const body = battle.place(unit, {
            sprite: monster.sprite,
            name: monster.name,
            at,
            direction,
            hearts: Heart.many(BLUE_HEART, monster.hearts + unit.stats.summon.value),
            cards: firstRound(monster),
            ...(monster.size === undefined ? {} : { size: monster.size }),
        })
        if(body) battle.applyStatus(body, soakOf(dose), levelOf(dose, unit))
    }
}
