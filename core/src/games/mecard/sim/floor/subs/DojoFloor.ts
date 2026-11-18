import type { Rng } from "../../base/Rng"
import { sceneLook } from "../../halt/SceneLook"
import { TRAINER_HALT } from "../../halt/subs/gift/TrainerHalt"
import { ENCHANTER_HALT } from "../../halt/subs/deck/EnchanterHalt"
import type { FightCategory } from "../../fight/FightCategory"
import type { FightType } from "../../fight/FightType"
import { laidIn } from "../fights/designed"
import { DOJO_FIGHTS } from "../fights/dojoFights"
import type { FloorType } from "../Floor"
import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** Dojo: Des lames rapides, et un shogun fantôme au bout. Plus de dresseurs et d'enchanteurs. */
export class DojoFloor extends AbstractFloor {

    public readonly type: FloorType = DOJO_FLOOR

    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [TRAINER_HALT, 8], [ENCHANTER_HALT, 8],
        )
    }

    protected fightFor(category: FightCategory, layer: number, rng: Rng): FightType {
        return laidIn(DOJO_FIGHTS, category, layer, rng)
    }
}

/** The sort of Dojo. */
export const DOJO_FLOOR: FloorType = {
    name: "Dojo",
    description: "Des lames rapides, et un shogun fantôme au bout. Plus de dresseurs et d'enchanteurs.",
    icon: visual("floors/dojo/logo"),
    look: sceneLook(40, 20, 28, "dojo"),
    decorations: [
        { picture: visual("floors/dojo/lantern"), size: 2 },
        { picture: visual("floors/dojo/bamboo"), size: 2 },
        { picture: visual("floors/dojo/gate"), size: 2 },
        { picture: visual("floors/dojo/stone"), size: 2 },
        { picture: visual("floors/dojo/bonsai"), size: 2 },
    ],
    create: level => new DojoFloor(level),
}
