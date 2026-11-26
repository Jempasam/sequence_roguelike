import { visual } from "../../base/Visual"
import type { UnitContext } from "../../battle/Action"
import { SummonedHearts } from "../../battle/words"
import type { Preview } from "../../battle/preview/Preview"
import type { PreviewContext } from "../../battle/preview/PreviewContext"
import * as Previews from "../../battle/preview/Previews"
import { INVOCATION } from "../../battle/mecanic/summon/keyword"
import { SUMMON_AHEAD } from "../../battle/mecanic/summon/summon"
import * as Summons from "../../battle/mecanic/summon"
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
            [INVOCATION.as("Invoque"), " un cactus à ", SUMMON_AHEAD, " m devant toi : ", new SummonedHearts(hearts, THORN_HEART), ". 6 utilisations."],
            { charges: 6 },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        Summons.summonAt(battle, unit, [Summons.summonSpot(unit, unit, SUMMON_AHEAD)], {
            sprite: visual("units/cactus"), name: "Cactus",
            hearts: () => Summons.summonedHearts(unit, this.hearts, THORN_HEART), fleeting: true,
        })
    }

    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const spot = Summons.summonSpot(unit, pose, SUMMON_AHEAD)
        return Previews.still(pose, ...Summons.summonShows(battle, unit, [spot]))
    }
}

export const FOLDING_CACTUS = new FoldingCactus(CACTUS_HEARTS)
