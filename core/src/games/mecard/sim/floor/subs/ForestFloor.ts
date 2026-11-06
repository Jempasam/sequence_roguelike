import type { Rng } from "../../base/Rng"
import { BULL, ELF_ARCHER, ELF_ASSASSIN, GOBLIN_RIDER, HUNTER, TROLL } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import type { FightKind } from "../../run/Journey"
import { encounter } from "../encounter"
import type { FloorType } from "../Floor"

import { AbstractFloor } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"

/** Who lives in the forest. */
const MONSTERS: readonly Monster[] = [HUNTER, ELF_ASSASSIN, GOBLIN_RIDER, BULL, ELF_ARCHER]

/** The forest: fast hunters, but the party finds rest and company on the way. */
export class ForestFloor extends AbstractFloor {


    public readonly type: FloorType = FOREST_FLOOR


    /** Places to rest and people to meet, more than to craft. */
    protected override weights(): PlaceWeights {
        return { ...super.weights(), hospital: 9, tavern: 6, trainer: 6, witch: 6, forge: 2 }
    }

    protected monsters(fight: FightKind, layer: number, rng: Rng): Monster[] {
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
