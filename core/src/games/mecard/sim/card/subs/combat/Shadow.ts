import { NOTE_COLOR } from "../../../battle/previewColors"
import { UNIT_RADIUS } from "../../../battle/Unit"
import { placeHazard } from "../../../hazard/Hazard"
import { Heart } from "../../../heart/Heart"
import { TIME_HEART } from "../../../heart/subs/TimeHeartKind"
import { SHADOW_LINK_DAMAGE, ShadowLink } from "../../../process/subs/ShadowLink"

import { ActionCard } from "../ActionCard"
import { MergedCard } from "../composite/MergedCard"
import { BLINK } from "../movement/Blink"
import { hold, SHORT_TIME } from "../tools/playing"
import { label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { visual } from "../../../base/Visual"
import { DamageType } from "../../../battle/DamageType"

/** A shadow left where the unit stands, which it jumps back to as the round ends. */
export const SHADOW = new ActionCard("Ombre", [
    "Laisse une ombre là où tu es. En fin de round, tu te téléportes à l'ombre la plus proche : ",
    SHADOW_LINK_DAMAGE, " ", DamageType.PHYSICAL, " à chaque corps sur le chemin, quelles que soient tes stats.",
], Rarity.RARE, {
    use: function* ({ battle, unit }){
        placeHazard(battle, unit, {
            sprite: visual("units/shadow"), name: "Ombre", hearts: [new Heart(TIME_HEART)],
            zone: { kind: "circle", center: unit.position, radius: UNIT_RADIUS },
        })
        battle.startProcess(unit, new ShadowLink())
        yield* hold(battle, SHORT_TIME, [label(unit.position, "ombre", NOTE_COLOR)])
    },
    preview: ({ pose }) => still(pose, label(pose.position, "ombre", NOTE_COLOR)),
})

/** A shadow left behind and a blink at once. */
export const SHADOW_BLINK = new MergedCard([SHADOW, BLINK], { name: "Ombre fulgurante", rarity: Rarity.LEGENDARY })
