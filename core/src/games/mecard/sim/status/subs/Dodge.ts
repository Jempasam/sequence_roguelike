import type { UnitContext } from "../../battle/Action"
import { Guard } from "../Guard"
import type { Parried } from "../Guard"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { DamageType } from "../../battle/DamageType"
import { VIOLENT_PUSH } from "../../battle/mecanic/push/keyword"
import { PUSH_DAMAGE } from "../../battle/mecanic/push/shove"
import { SWAPPING } from "../../battle/mecanic/swap/keyword"
import * as Pushing from "../../battle/mecanic/push"
import * as Swap from "../../battle/mecanic/swap"
import { STUNNED } from "./Stunned"

/** What each guard tells, before what it does more. */
const GUARDING = ["Annule les ", STATUS_LEVEL, " prochaines attaques physiques. −1 à chaque début de tour."]

/** A dodge: the next physical attacks miss. */
export const DODGE = new StatusType("esquive", statusVisual("dodge", 0.55, 0.8, 1), "positive", level => new Dodge(level), {
    description: GUARDING,
})

/** Dodging: the attacks it stops simply miss. */
export class Dodge extends Guard {


    public readonly type: StatusType = DODGE

    protected react(): void {}
}

/** A counter: the next physical attacks are stopped, and stun who struck. */
export const COUNTER = new StatusType("contre", statusVisual("counter", 1, 0.75, 0.3), "positive", level => new Counter(level), {
    description: [...GUARDING, " L'attaquant gagne ", STUNNED, " ", 1, "."],
})

/** Countering: who struck is stunned. */
export class Counter extends Guard {


    public readonly type: StatusType = COUNTER

    protected react({ battle }: UnitContext, { attacker }: Parried): void {
        battle.applyStatus(attacker, STUNNED, 1)
    }
}

/** A wooden shield: the next physical attacks are stopped, but push it back a meter for each heart. */
export const WOODEN_SHIELD = new StatusType(
    "bouclier en bois", statusVisual("wooden_shield", 0.7, 0.5, 0.3), "positive", level => new WoodenShield(level),
    {
        description: [
            ...GUARDING, " Subit une ", VIOLENT_PUSH, " d'un mètre par dégât annulé, à l'opposé de l'attaquant (choc : ",
            PUSH_DAMAGE, " ", DamageType.PHYSICAL, ").",
        ],
    },
)

/** Shielded by wood: pushed away from who struck, a meter for each heart stopped. */
export class WoodenShield extends Guard {


    public readonly type: StatusType = WOODEN_SHIELD

    protected react({ battle, unit }: UnitContext, { attacker, amount }: Parried): void {
        const away = unit.position.minus(attacker.position).normalized
        if(!away) return
        Pushing.shoveViolently({
            battle, by: attacker, target: unit, direction: away, distance: amount, damage: PUSH_DAMAGE, atOnce: true,
        })
    }
}

/** A sliding parry: the next physical attacks are stopped, and it swaps places with who struck. */
export const SLIDING_PARRY = new StatusType(
    "parade glissante", statusVisual("sliding_parry", 0.6, 0.9, 0.8), "positive", level => new SlidingParry(level),
    { description: [...GUARDING, " ", SWAPPING.as("Échange de place"), " avec l'attaquant."] },
)

/** Parrying by sliding: it takes the place of who struck. */
export class SlidingParry extends Guard {


    public readonly type: StatusType = SLIDING_PARRY

    protected react({ battle, unit }: UnitContext, { attacker }: Parried): void {
        Swap.swap(battle, unit, attacker)
    }
}

/** A disarm: the next physical attacks are stopped, and the card that struck goes to its hand. */
export const DISARM = new StatusType("désarmement", statusVisual("disarm", 0.85, 0.85, 0.6), "positive", level => new Disarm(level), {
    description: [...GUARDING, " La dernière carte jouée par l'attaquant va dans ta main pour ce combat."],
})

/** Disarming: the last card the attacker played goes to its hand. */
export class Disarm extends Guard {


    public readonly type: StatusType = DISARM

    protected react({ battle, unit }: UnitContext, { attacker }: Parried): void {
        if(attacker.lastPlayed) battle.giveCard(unit, attacker.lastPlayed)
    }
}
