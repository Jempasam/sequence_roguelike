import { visual } from "../../base/Visual"
import type { UnitContext } from "../../battle/Action"
import { SummonedHearts } from "../../battle/words"
import { summonedHearts } from "../../card/subs/summon/SummonCard"
import { SUMMON_AHEAD, summonAt, summonSpot } from "../../card/subs/tools/playing"
import { THORN_HEART } from "../../heart/subs/ThornHeartKind"

import { AbstractUsable } from "./AbstractUsable"

/** How many thorn hearts the cactus of the catalog lives by, before the summoning of the unit. */
const CACTUS_HEARTS = 2

/** A folding cactus: a body of thorn hearts set down ahead, that wounds whoever breaks them. */
export class FoldingCactus extends AbstractUsable {


    constructor(
        /** How many thorn hearts it lives by. */
        public readonly hearts: number,
    ){
        super(
            "Cactus pliable", visual("usables/cactus"),
            ["Pose un cactus à ", SUMMON_AHEAD, " m devant toi : ", new SummonedHearts(hearts, THORN_HEART), ". 2 utilisations."],
            { charges: 2 },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        summonAt(battle, unit, [summonSpot(unit, unit, SUMMON_AHEAD)], {
            sprite: visual("units/cactus"), name: "Cactus", hearts: () => summonedHearts(unit, this.hearts, THORN_HEART),
            fleeting: true,
        })
    }
}

export const FOLDING_CACTUS = new FoldingCactus(CACTUS_HEARTS)
