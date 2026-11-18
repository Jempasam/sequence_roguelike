import { visual } from "../../../base/Visual"
import { DISTANCE } from "../../../base/keywords"
import { DamageType } from "../../../battle/DamageType"
import { NOTE_COLOR } from "../../../battle/previewColors"
import { UNIT_RADIUS } from "../../../battle/Unit"
import { Heart } from "../../../heart/Heart"
import { SOLID_HEART } from "../../../heart/subs/SolidHeartKind"
import {
    SLINGSHOT_FACTOR, SLINGSHOT_METERS_PER_HEART, SlingshotPull,
} from "../../../process/subs/SlingshotPull"
import { Rarity } from "../../Rarity"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import * as Previews from "../../../battle/preview/Previews"
/** How far ahead the slingshot is set down, in meters: at the contact. */
const AHEAD = 1 - UNIT_RADIUS

export const SLINGSHOT = new ActionCard("Lance-pierre", [
    "Pose un lance-pierre à ", AHEAD, " ", DISTANCE, " devant, auquel tu es attaché. À la fin du round, tu es ",
    "propulsé vers lui sur ", SLINGSHOT_FACTOR, " fois la distance qui vous sépare ; l'unité touchée est repoussée ",
    "d'autant. Collision : 1 ", DamageType.PHYSICAL, " par ", SLINGSHOT_METERS_PER_HEART, " ", DISTANCE, ".",
], Rarity.EPIC, {
    use: function ({ battle, unit }){
        const slingshot = battle.place(unit, {
            sprite: visual("units/stone"), name: "Lance-pierre", at: unit.muzzle().plus(unit.direction.times(AHEAD)),
            direction: unit.direction, hearts: [new Heart(SOLID_HEART)],
            tangible: false, targetable: false, touchable: false, movable: false,
        })
        if(slingshot) battle.startProcess(unit, new SlingshotPull(slingshot))
        hold(battle, SHORT_TIME, [Previews.label(unit.position, "lance-pierre", NOTE_COLOR)])
    },
    preview: ({ unit, pose }) => Previews.still(pose, Previews.label(unit.muzzle(pose).plus(pose.direction.times(AHEAD)), "lance-pierre", NOTE_COLOR)),
})
