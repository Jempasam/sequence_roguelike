import { visual } from "../../base/Visual"
import type { UnitContext } from "../../battle/Action"
import type { Preview } from "../../battle/preview/Preview"
import type { PreviewContext } from "../../battle/preview/PreviewContext"
import * as Previews from "../../battle/preview/Previews"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../battle/previewColors"

import { AbstractUsable } from "./AbstractUsable"

/** A parcel: the nearest ally receives a copy of the last card its unit played, in its hand for this battle. */
export class Parcel extends AbstractUsable {


    constructor(){
        super(
            "Colis", visual("usables/parcel"),
            ["L'allié le plus proche reçoit une copie de ta dernière carte jouée, dans sa main pour ce combat. 2 utilisations, rechargées à chaque combat."],
            { charges: 2, refill: "battle" },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        const heir = battle.nearestAlly(unit)
        const sent = unit.lastPlayed
        if(!heir || !sent || !battle.giveCard(heir, sent)){
            battle.events.push({ type: "skipped", unit, reason: "rien à envoyer" })
        }
    }

    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const heir = battle.nearestAlly(unit, Infinity, pose.position)
        if(!heir) return Previews.still(pose, Previews.label(pose.position, "personne en vue", NOTE_COLOR))
        return Previews.still(
            pose,
            Previews.arrow([pose.position, heir.position], MOVE_WIDTH / 2, MOVE_COLOR),
            Previews.label(heir.position, "colis", NOTE_COLOR),
        )
    }
}

export const PARCEL = new Parcel()
