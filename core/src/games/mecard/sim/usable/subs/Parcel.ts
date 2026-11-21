import { visual } from "../../base/Visual"
import type { UnitContext } from "../../battle/Action"

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
}

export const PARCEL = new Parcel()
