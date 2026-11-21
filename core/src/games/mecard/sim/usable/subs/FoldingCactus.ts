import { UNIT_RADIUS } from "../../battle/Unit"
import { visual } from "../../base/Visual"
import type { UnitContext } from "../../battle/Action"
import { HeartCount } from "../../battle/words"
import { summonedHearts } from "../../card/subs/summon/SummonCard"
import { THORN_HEART } from "../../heart/subs/ThornHeartKind"

import { AbstractUsable } from "./AbstractUsable"

/** How many thorn hearts the cactus of the catalog lives by, before the summoning of the unit. */
const CACTUS_HEARTS = 2

/** How far ahead of the edge of its unit the cactus is set down, in meters. */
const CACTUS_AHEAD = 1 - UNIT_RADIUS

/** A folding cactus: a body of thorn hearts set down ahead, that wounds whoever breaks them. */
export class FoldingCactus extends AbstractUsable {


    constructor(
        /** How many thorn hearts it lives by. */
        public readonly hearts: number,
    ){
        super(
            "Cactus pliable", visual("usables/cactus"),
            ["Pose un cactus à ", CACTUS_AHEAD, " m devant toi : ", new HeartCount(hearts), " + invocation, en cœurs épineux. 2 utilisations."],
            { charges: 2 },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        const spot = unit.muzzle(unit).plus(unit.direction.times(CACTUS_AHEAD))
        if(!battle.arena.inside(spot, UNIT_RADIUS)) return
        battle.summon(unit, visual("units/cactus"), "Cactus", spot, summonedHearts(unit, this.hearts, THORN_HEART))
    }
}

export const FOLDING_CACTUS = new FoldingCactus(CACTUS_HEARTS)
