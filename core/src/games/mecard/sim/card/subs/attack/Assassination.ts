import { DamageType } from "../../../battle/DamageType"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BLOW_DAMAGE } from "./BlowCard"
import { BACKSTAB, DAGGER_RANGE, DAGGER_WIDTH, DaggerCard } from "./Dagger"
import { ALLONGE, DISTANCE, FORCE, UNIT, BATTLE_ROUND } from "../../../base/keywords"
import { SHADOW_THRUST_LOOK } from "../tools/blowLooks"
import * as Steps from "../../../battle/mecanic/step"

/**
 * A stab that plays the round over when it kills: what the unit played so far, itself included, comes again
 * right after it. Each kill does, so it ends with the targets.
 */
export class AssassinationCard extends DaggerCard {


    public override readonly look = SHADOW_THRUST_LOOK

    protected override land(battle: Battle, unit: Unit, area: Area): Unit[] {
        const hit = super.land(battle, unit, area)
        if(hit.some(target => !target.alive)){
            Steps.insert(battle, unit, unit.stepsPlayed.splice(0), { word: "chaîne rejouée" })
        }
        return hit
    }
}

export const ASSASSINATION = new AssassinationCard("Assassinat", [
    "Poignarde sur ", DAGGER_RANGE, "×", ALLONGE, " ", DISTANCE, " devant : ", BLOW_DAMAGE, "+", FORCE, " ",
    DamageType.PHYSICAL, " à chaque ", UNIT, ", ×", BACKSTAB, " dans le dos. Si la cible meurt, tout ce que tu as joué ce ", BATTLE_ROUND, ", Assassinat compris, est rejoué juste après.",
], Rarity.EPIC, DAGGER_RANGE, DAGGER_WIDTH, BACKSTAB)
