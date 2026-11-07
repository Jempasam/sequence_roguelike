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
    icon: "mecard/floors/forest/logo.png",
    look: sceneLook(16, 32, 22, "mecard/floors/forest"),
    decorations: [
        { picture: "mecard/floors/forest/cabin.png", size: 2 },
        { picture: "mecard/floors/forest/tree.png", size: 2 },
        { picture: "mecard/floors/forest/bush.png", size: 2 },
        { picture: "mecard/floors/forest/stump.png", size: 2 },
        { picture: "mecard/floors/forest/grass.png", size: 2 },
    ],
    create: level => new ForestFloor(level),
}
