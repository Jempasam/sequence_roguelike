import type { Rng } from "../../base/Rng"
import { WANDERING_SAMURAI, ELF_ASSASSIN, GOBLIN, BERSERKER, ORC_BATTLE_SHAMAN, GHOST_SHOGUN } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import { TRAINER_HALT } from "../../halt/subs/gift/TrainerHalt"
import { ENCHANTER_HALT } from "../../halt/subs/deck/EnchanterHalt"
import type { FightType } from "../../fight/FightType"
import { tieredEncounter } from "../encounter"
import type { Tiers } from "../encounter"
import type { FloorType } from "../Floor"
import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** Who lives on this floor, by depth. */
const TIERS: Tiers = {
    shallow: [WANDERING_SAMURAI, ELF_ASSASSIN, GOBLIN],
    middle: [BERSERKER, WANDERING_SAMURAI, ELF_ASSASSIN],
    deep: [WANDERING_SAMURAI, ORC_BATTLE_SHAMAN, BERSERKER, ELF_ASSASSIN],
}

/** Dojo: Des lames rapides, et un shogun fantôme au bout. Plus de dresseurs et d'enchanteurs. */
export class DojoFloor extends AbstractFloor {

    public readonly type: FloorType = DOJO_FLOOR

    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [TRAINER_HALT, 8], [ENCHANTER_HALT, 8],
        )
    }

    protected monsters(fight: FightType, layer: number, rng: Rng): Monster[] {
        return tieredEncounter(TIERS, GHOST_SHOGUN, fight, layer, this.level, rng)
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
