import { visual } from "../../base/Visual"
import type { UnitContext } from "../../battle/Action"

import { AbstractUsable } from "./AbstractUsable"
import { BATTLE_TURN, INVOCATION } from "../../base/keywords"

/** A trumpet: each ally and summon of its unit plays its next step at once, before its turn. */
export class Trumpet extends AbstractUsable {


    constructor(){
        super(
            "Trompette", visual("usables/trumpet"),
            ["Tes alliés et tes ", INVOCATION.as("invocations"), " jouent tout de suite leur prochaine ", BATTLE_TURN.as("étape"), ". Une fois par combat."],
            { charges: 1, refill: "battle" },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        const followers = battle.living.filter(other => other !== unit && other.team === unit.team)
        for(const follower of followers) battle.playNow(follower)
    }
}

export const TRUMPET = new Trumpet()
