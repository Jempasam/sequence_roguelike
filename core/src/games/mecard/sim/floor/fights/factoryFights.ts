import { Vector2 } from "../../base/Vector2"
import {
    GARRISON_GOBLIN, GOBLIN_MECHA, GOBLIN_PILOT, GOBLIN_WRESTLER, KAMIKAZE_ROBOT, SNIPER,
} from "../../catalog/monsters"
import { CONVEYOR, FLAMETHROWER_TURRET, PATROL_ROBOT, PILLAR, PISTON, RING_ROPE } from "../../catalog/hazards"
import { AGGRESSION, BATTLE, BOSS, ELITE } from "../../fight/fights"
import { TURRET_ENGINEER_KIT, MECHANIC_KIT } from "../../catalog/kits"
import { designed, designedKits, lay, put } from "./designed"

/** The fights of the factory: robots and goblin pilots, a goblin mecha at the end. */
export const FACTORY_FIGHTS = [
    designedKits({
        category: AGGRESSION, layers: [4, 9], name: "Saboteurs de l'usine",
        hazards: [lay(PILLAR, 2, 3), lay(PILLAR, 4, 3)],
        description: "Un ingénieur de tourelles et un mécanicien protègent leurs machines.",
        kits: [TURRET_ENGINEER_KIT, MECHANIC_KIT],
    }),
    designed({
        category: BATTLE, layers: [0, 4], name: "Chaîne de montage",
        hazards: [
            lay(CONVEYOR, 1, 3, Vector2.RIGHT),
        ],
        description: "Des robots kamikazes qui sortent de la chaîne, un gobelin de garnison qui surveille.",
        populate: stage => {
            put(stage, KAMIKAZE_ROBOT, 2, 1)
            put(stage, KAMIKAZE_ROBOT, 4, 1)
            put(stage, GARRISON_GOBLIN, 3, 0)
            if(stage.level >= 2) put(stage, KAMIKAZE_ROBOT, 3, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 5], name: "Ring de l'usine",
        hazards: [
            lay(RING_ROPE, -0.3, 3, Vector2.DOWN),
            lay(RING_ROPE, 6.3, 3, Vector2.DOWN),
            lay(PILLAR, 3, 3),
        ],
        description: "Un catcheur au centre, des gobelins de garnison qui posent des tourelles.",
        populate: stage => {
            put(stage, GOBLIN_WRESTLER, 3, 1)
            put(stage, GARRISON_GOBLIN, 2, 0)
            put(stage, GARRISON_GOBLIN, 4, 0)
            if(stage.level >= 2) put(stage, KAMIKAZE_ROBOT, 1, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [3, 7], name: "Pilotes et leurs robots",
        hazards: [
            lay(PATROL_ROBOT, 0, 2, Vector2.DOWN),
            lay(PISTON, 3, 3, Vector2.DOWN),
        ],
        description: "Des gobelins pilotes qui boostent des robots kamikazes, un sniper en poste.",
        populate: stage => {
            put(stage, KAMIKAZE_ROBOT, 2, 1)
            put(stage, KAMIKAZE_ROBOT, 4, 1)
            put(stage, GOBLIN_PILOT, 1, 0)
            put(stage, GOBLIN_PILOT, 5, 0)
            put(stage, SNIPER, 3, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [6, 9], name: "Atelier de réparation",
        hazards: [
            lay(CONVEYOR, 5, 4, Vector2.LEFT),
            lay(PISTON, 3, 3, Vector2.DOWN),
        ],
        description: "Un catcheur et des robots devant, des pilotes et des snipers qui tirent par-dessus.",
        populate: stage => {
            put(stage, GOBLIN_WRESTLER, 3, 1)
            put(stage, KAMIKAZE_ROBOT, 1, 1)
            put(stage, KAMIKAZE_ROBOT, 5, 1)
            put(stage, GOBLIN_PILOT, 2, 0)
            put(stage, GOBLIN_PILOT, 4, 0)
            put(stage, SNIPER, 3, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Brigade de robots",
        hazards: [
            lay(PATROL_ROBOT, 0, 2, Vector2.DOWN),
            lay(PATROL_ROBOT, 6, 2, Vector2.DOWN),
        ],
        description: "Six robots kamikazes en ligne, des pilotes qui les rendent plus dangereux.",
        populate: stage => {
            for(const column of [0, 1, 2, 4, 5, 6]) put(stage, KAMIKAZE_ROBOT, column, 1)
            put(stage, GOBLIN_PILOT, 2, 0)
            put(stage, GOBLIN_PILOT, 4, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Les catcheurs",
        hazards: [
            lay(FLAMETHROWER_TURRET, 0, 3, Vector2.RIGHT),
            lay(CONVEYOR, 5, 4, Vector2.LEFT),
        ],
        description: "Deux catcheurs, des pilotes et un sniper dans les gradins.",
        populate: stage => {
            put(stage, GOBLIN_WRESTLER, 2, 1)
            put(stage, GOBLIN_WRESTLER, 4, 1)
            put(stage, GOBLIN_PILOT, 1, 0)
            put(stage, GOBLIN_PILOT, 5, 0)
            put(stage, SNIPER, 3, 0)
            put(stage, GARRISON_GOBLIN, 3, 1)
        },
    }),
    designed({
        category: BOSS, layers: [11, 11], name: "Le mécha-gobelin et ses pilotes",
        hazards: [
            lay(PATROL_ROBOT, 0, 2, Vector2.DOWN),
            lay(FLAMETHROWER_TURRET, 6, 3, Vector2.LEFT),
        ],
        description: "Le mécha-gobelin au centre, des robots devant, des pilotes et un sniper derrière.",
        populate: stage => {
            put(stage, GOBLIN_MECHA, 3, 0)
            put(stage, KAMIKAZE_ROBOT, 2, 1)
            put(stage, KAMIKAZE_ROBOT, 4, 1)
            put(stage, GOBLIN_PILOT, 1, 0)
            put(stage, GOBLIN_PILOT, 5, 0)
            put(stage, SNIPER, 6, 1)
        },
    }),
]
