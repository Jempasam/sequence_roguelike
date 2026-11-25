import { visual } from "../../base/Visual"
import type { UnitContext } from "../../battle/Action"
import type { Preview } from "../../battle/preview/Preview"
import type { PreviewContext } from "../../battle/preview/PreviewContext"
import * as Previews from "../../battle/preview/Previews"
import { MOVE_WIDTH, NOTE_COLOR, CONTROL_COLOR } from "../../battle/previewColors"
import { SOUL_LINKED } from "../../status/subs/Wounds"

import { AbstractUsable } from "./AbstractUsable"
import { BATTLE_ROUND } from "../../base/keywords"

/** How far a ball of wool is thrown, in meters. */
const WOOL_RANGE = 5

/** How many rounds a thread holds. */
const WOOL_ROUNDS = 1

/** A ball of wool: its unit and the enemy nearest to it are tied, and every wound of one is repeated on the other. */
export class WoolBall extends AbstractUsable {


    constructor(
        /** How far it reaches, in meters. */
        public readonly range: number,
    ){
        super(
            "Pelote de laine", visual("usables/wool_ball"),
            [
                "Lie l'ennemi le plus proche, à ", range, " m au plus, à toi pendant ", WOOL_ROUNDS,
                " ", BATTLE_ROUND, " : chaque blessure de l'un est répétée à l'identique sur l'autre. 2 utilisations, rechargées à chaque combat.",
            ],
            { charges: 2, refill: "battle" },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        const target = battle.nearestEnemy(unit, this.range)
        if(!target){
            battle.events.push({ type: "skipped", unit, reason: "personne à portée" })
            return
        }
        battle.applyStatus(unit, SOUL_LINKED, WOOL_ROUNDS)
        battle.applyStatus(target, SOUL_LINKED, WOOL_ROUNDS)
    }

    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const target = battle.nearestEnemy(unit, this.range, pose.position)
        if(!target) return Previews.still(pose, Previews.label(pose.position, "personne à portée", NOTE_COLOR))
        return Previews.still(
            pose,
            Previews.arrow([pose.position, target.position], MOVE_WIDTH / 2, CONTROL_COLOR),
            ...Previews.strike([], [target]),
            Previews.label(target.position, "lié", NOTE_COLOR),
        )
    }
}

export const WOOL_BALL = new WoolBall(WOOL_RANGE)
