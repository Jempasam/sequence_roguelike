import type { Rng } from "../../base/Rng"
import { BULL, ELF_ARCHER, ELF_ASSASSIN, GOBLIN_RIDER, HUNTER, TROLL } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import { FORGE_HALT } from "../../halt/subs/deck/ForgeHalt"
import { TAVERN_HALT } from "../../halt/subs/gift/TavernHalt"
import { TRAINER_HALT } from "../../halt/subs/gift/TrainerHalt"
import { WITCH_HALT } from "../../halt/subs/gift/WitchHalt"
import { HOSPITAL_HALT } from "../../halt/subs/party/HospitalHalt"
import type { FightType } from "../../run/PlaceType"
import { encounter } from "../encounter"
import type { FloorType } from "../Floor"

import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** Who lives in the forest. */
const MONSTERS: readonly Monster[] = [HUNTER, ELF_ASSASSIN, GOBLIN_RIDER, BULL, ELF_ARCHER]

/** The forest: fast hunters, but the party finds rest and company on the way. */
export class ForestFloor extends AbstractFloor {


    public readonly type: FloorType = FOREST_FLOOR


    /** Places to rest and people to meet, more than to craft. */
    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [HOSPITAL_HALT, 9], [TAVERN_HALT, 6], [TRAINER_HALT, 6], [WITCH_HALT, 6], [FORGE_HALT, 2],
        )
    }

    protected monsters(fight: FightType, layer: number, rng: Rng): Monster[] {
        return encounter(MONSTERS, TROLL, fight, layer, this.level, rng)
    }
}

/** The sort of the forest. */
export const FOREST_FLOOR: FloorType = {
    name: "Forêt",
    description: "Des chasseurs rapides, et un troll au bout. Plus d'hôpitaux, de tavernes et de dresseurs.",
    icon: visual("floors/forest/logo"),
    look: sceneLook(16, 32, 22, "mecard/floors/forest"),
    decorations: [
        { picture: visual("floors/forest/cabin"), size: 2 },
        { picture: visual("floors/forest/tree"), size: 2 },
        { picture: visual("floors/forest/bush"), size: 2 },
        { picture: visual("floors/forest/stump"), size: 2 },
        { picture: visual("floors/forest/grass"), size: 2 },
    ],
    create: level => new ForestFloor(level),
}
