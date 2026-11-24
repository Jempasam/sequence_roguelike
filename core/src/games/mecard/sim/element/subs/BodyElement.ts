import { HEART } from "../../base/keywords"
import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { firstRound } from "../../catalog/monsterRounds"
import type { Monster } from "../../catalog/monsters"
import { Heart } from "../../heart/Heart"
import { BLUE_HEART } from "../../heart/subs/BlueHeartKind"
import { levelOf } from "../../potion/Potion"
import type { Potion } from "../../potion/Potion"
import { soakOf } from "../../status/subs/Soaked"
import { summonAt } from "../../card/subs/tools/playing"
import { AbstractElement } from "../AbstractElement"

import type { Boon } from "./body/Boon"
import { pouredDose, PotionBoon } from "./body/PotionBoon"

/**
 * An element made from a body and two effects: what it does against a unit (a potion), what it does for it (a
 * potion, or hearts), and what it calls, a body with blue hearts soaked with the first potion, which it pours
 * on whatever it hits, and which has the effect for a unit too as it arrives.
 *
 * @remarks
 * It holds no state. Its name tells the body and both effects, so two of them with the same ones are the same
 * element to a status made for an element. The body is a monster of the catalog or one an analysis built.
 */
export class BodyElement extends AbstractElement {


    constructor(
        public readonly monster: Monster,

        /** The potion it pours against a unit, and the one its body is soaked with. */
        public readonly negative: Potion,

        /** What it gives to a unit, and to its body when it arrives. */
        public readonly positive: Boon,
    ){
        super(
            monster.name, negative.color, negative.name,
            ["verse ", negative],
            positive.text,
            ["un ", monster, " à ", HEART.as("cœurs"), " ", BLUE_HEART, ", mouillé de ", negative],
        )
    }


    /** Two bodies of one monster with other effects are other elements, though they are called the same. */
    public override get key(): string {
        return `${this.monster.name} (${this.negative.name}/${this.positive.name})`
    }

    /** An element whose effect for a unit is a potion. */
    public static ofPotions(monster: Monster, negative: Potion, positive: Potion): BodyElement {
        return new BodyElement(monster, negative, new PotionBoon(positive))
    }


    public applyNegative(ctx: UnitContext, target: Unit): void {
        new PotionBoon(this.negative).give(ctx, target)
    }

    public applyPositive(ctx: UnitContext, target: Unit): void {
        this.positive.give(ctx, target)
    }

    // The element to apply is this one's own: the body it calls pours its first potion through its soaking.
    public invoke(ctx: UnitContext, at: Vector2, direction: Vector2): void {
        const { battle, unit } = ctx
        const { monster } = this
        const dose = pouredDose(this.negative)
        const [body] = summonAt(battle, unit, [at], {
            sprite: monster.sprite,
            name: monster.name,
            direction,
            hearts: () => Heart.many(BLUE_HEART, monster.hearts + unit.stats.summon.value),
            cards: firstRound(monster),
            ...monster.size === undefined ? {} : { size: monster.size },
        })
        if(!body) return
        battle.applyStatus(body, soakOf(dose), levelOf(dose, unit))
        this.positive.give(ctx, body)
    }
}
