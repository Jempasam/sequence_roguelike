import { blowDamage, meters } from "../../../battle/words"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BLOW_DAMAGE } from "./BlowCard"
import { BACKSTAB, DAGGER_RANGE, DAGGER_WIDTH, DaggerCard } from "./Dagger"
import { UNIT } from "../../../base/keywords"

/** How many times the blow of the assassin hurts a feverish unit. */
const FEVERISH_FACTOR = 2

/** A stab harder on the feverish, on top of the back. */
export class AssassinBlowCard extends DaggerCard {


    protected override scale(target: Unit, unit: Unit): number {
        return super.scale(target, unit) * (target.feverish ? FEVERISH_FACTOR : 1)
    }
}

export const ASSASSIN_BLOW = new AssassinBlowCard("Coup d'assassin", [
    "Poignarde sur ", meters(DAGGER_RANGE), " devant : ", blowDamage(BLOW_DAMAGE), " à chaque ", UNIT, ", ×", String(BACKSTAB),
    " dans le dos, ×", String(FEVERISH_FACTOR), " sur une ", UNIT, " fébrile (plus de cœurs vides que pleins). Les deux se cumulent.",
], Rarity.RARE, DAGGER_RANGE, DAGGER_WIDTH, BACKSTAB)
