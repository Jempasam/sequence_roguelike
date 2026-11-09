import { frenchNumber } from "../../../battle/words"
import { DamageType } from "../../../battle/DamageType"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BLOW_DAMAGE } from "./BlowCard"
import { BACKSTAB, DAGGER_RANGE, DAGGER_WIDTH, DaggerCard } from "./Dagger"
import { ALLONGE, DISTANCE, FORCE, UNIT } from "../../../base/keywords"

/**
 * A stab that plays the round over when it kills: what the unit played so far, itself included, comes again
 * right after it. Each kill does, so it ends with the targets.
 */
export class AssassinationCard extends DaggerCard {


    protected override land(battle: Battle, unit: Unit, area: Area): Unit[] {
        const hit = super.land(battle, unit, area)
        if(hit.some(target => !target.alive)){
            unit.steps.unshift(...unit.stepsPlayed.splice(0))
            battle.events.push({ type: "status", unit, text: "chaîne rejouée" })
        }
        return hit
    }
}

export const ASSASSINATION = new AssassinationCard("Assassinat", [
    "Poignarde sur ", frenchNumber(DAGGER_RANGE), "×", ALLONGE, " ", DISTANCE, " devant : ", BLOW_DAMAGE, "+", FORCE, " ",
    DamageType.PHYSICAL, " à chaque ", UNIT, ", ×", BACKSTAB, " dans le dos. Si la cible meurt, tout ce que tu as joué ce round, Assassinat compris, est rejoué juste après.",
], Rarity.EPIC, DAGGER_RANGE, DAGGER_WIDTH, BACKSTAB)
