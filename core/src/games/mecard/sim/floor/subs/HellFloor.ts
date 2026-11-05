import type { Rng } from "../../base/Rng"
import { BERSERKER, BRUTE, DEVIL, ELF_ASSASSIN, FIRE_MAGE, IMP } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import type { FightKind } from "../../run/Journey"
import { encounter } from "../encounter"
import type { FloorType } from "../Floor"

import { AbstractFloor } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"

/** Who lives in hell. */
const MONSTERS: readonly Monster[] = [FIRE_MAGE, BERSERKER, BRUTE, ELF_ASSASSIN, IMP]

/** Hell: the last floor of a round, before the cave again, harder. */
export class HellFloor extends AbstractFloor {


    public readonly type: FloorType = HELL_FLOOR


    /** Dark bargains, and little rest. */
    protected override weights(): PlaceWeights {
        return { ...super.weights(), demon: 6, altar: 7, madDoctor: 4, elite: 12, hospital: 2 }
    }

    protected monsters(fight: FightKind, layer: number, rng: Rng): Monster[] {
        return encounter(MONSTERS, DEVIL, fight, layer, this.level, rng)
    }
}

/** The sort of hell. */
export const HELL_FLOOR: FloorType = {
    name: "Enfer",
    description: "Du feu et de la rage, et le diable au bout. Plus de démons, d'autels et d'élites, peu d'hôpitaux.",
    icon: "mecard/floors/hell/logo.png",
    look: sceneLook(38, 14, 14, [
        "mecard/floors/hell/1.png", "mecard/floors/hell/2.png", "mecard/floors/hell/3.png",
        "mecard/floors/hell/4.png", "mecard/floors/hell/5.png",
    ], "mecard/floors/hell/border.png"),
    decorations: [
        { picture: "mecard/floors/hell/statue.png", size: 2 },
        { picture: "mecard/floors/hell/flame.png", size: 2 },
        { picture: "mecard/floors/hell/skull.png", size: 2 },
        { picture: "mecard/floors/hell/spike.png", size: 2 },
        { picture: "mecard/floors/hell/crack.png", size: 2 },
    ],
    create: level => new HellFloor(level),
}
