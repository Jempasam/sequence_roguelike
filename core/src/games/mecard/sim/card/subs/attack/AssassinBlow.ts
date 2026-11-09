import { frenchNumber } from "../../../battle/words"
import { DamageType } from "../../../battle/DamageType"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BLOW_DAMAGE } from "./BlowCard"
import { BACKSTAB, DAGGER_RANGE, DAGGER_WIDTH, DaggerCard } from "./Dagger"
import { ALLONGE, DISTANCE, FEBRILE, FORCE, UNIT } from "../../../base/keywords"

/** How many times the blow of the assassin hurts a feverish unit. */
const FEVERISH_FACTOR = 2

/** A stab harder on the feverish, on top of the back. */
export class AssassinBlowCard extends DaggerCard {


    protected override scale(target: Unit, unit: Unit): number {
        return super.scale(target, unit) * (target.feverish ? FEVERISH_FACTOR : 1)
    }
}

export const ASSASSIN_BLOW = new AssassinBlowCard("Coup d'assassin", [
    "Poignarde sur ", frenchNumber(DAGGER_RANGE), "×", ALLONGE, " ", DISTANCE, " devant : ", BLOW_DAMAGE, "+", FORCE, " ",
    DamageType.PHYSICAL, " à chaque ", UNIT, ", ×", BACKSTAB, " dans le dos, ×", FEVERISH_FACTOR, " sur une ", UNIT, " ", FEBRILE, ". Les deux se cumulent.",
], Rarity.RARE, DAGGER_RANGE, DAGGER_WIDTH, BACKSTAB)
