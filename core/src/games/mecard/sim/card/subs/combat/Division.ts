import { NOTE_COLOR } from "../../../battle/previewColors"
import type { Unit } from "../../../battle/Unit"
import { Heart } from "../../../heart/Heart"
import { SHIELD_HEART } from "../../../heart/subs/ShieldHeartKind"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME, WORD_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { HEART, PERFECT_CLONE } from "../../../base/keywords"
import { INVOCATION } from "../../../battle/mecanic/summon/keyword"
import * as Summons from "../../../battle/mecanic/summon"
import { DamageType } from "../../../battle/DamageType"
import * as Previews from "../../../battle/preview/Previews"

/** What the division says of a unit with too few hearts to split. */
const TOO_WEAK = "trop faible"

/** How many shield hearts the clone of a unit would live by: half of what it has left, rounded down. */
function shareOf(unit: Unit): number {
    return Math.floor(unit.life / 2)
}

/** What the division says of the clone it would call. */
function said(share: number): string {
    return share > 0 ? `division ${share}` : TOO_WEAK
}

/** A perfect clone of the unit, living on shields as many as half of its hearts left. */
export const DIVISION = new ActionCard("Division", [
    INVOCATION.as("Invoque"), " un ", PERFECT_CLONE, " de toi, dont les seuls ", HEART.as("cœurs"), " sont de type ",
    SHIELD_HEART, " : la moitié de tes ", HEART.as("cœurs"), " restants, arrondie à l'inférieur, que tu perds. Zéro : raté.",
], Rarity.EPIC, {
    use: function ({ battle, unit }){
        const share = shareOf(unit)
        if(share <= 0){
            battle.events.push({ type: "skipped", unit, reason: TOO_WEAK })
            hold(battle, WORD_TIME, [Previews.label(unit.position, TOO_WEAK, NOTE_COLOR)])
            return
        }
        battle.perfectClone(unit, Heart.many(SHIELD_HEART, share))
        unit.hearts.damage(share, DamageType.PHYSICAL, null)
        hold(battle, SHORT_TIME, [Previews.label(unit.position, said(share), NOTE_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        const spot = shareOf(unit) > 0 ? battle.cloneSpot(unit, pose) : null
        return Previews.still(
            pose, Previews.label(pose.position, said(shareOf(unit)), NOTE_COLOR), ...spot ? [Summons.summonShown(spot)] : [],
        )
    },
})
