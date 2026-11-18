import { Vector2 } from "../../base/Vector2"
import { BERSERKER, GOBLIN, ICE_MAGE, KAMIKAZE_ROBOT, MEGALASER, STONE_GOLEM } from "../../catalog/monsters"
import { CONVEYOR, EXPLOSIVE_BARREL, HOLE, PATROL_ROBOT, ROCK_BLOCK } from "../../catalog/hazards"
import { AGGRESSION, BATTLE, BOSS, ELITE } from "../../fight/fights"
import { ARTIFICER_KIT, GEOMANCER_KIT } from "../../catalog/kits"
import { designed, designedKits, lay, put } from "./designed"

/** The fights of the mine: robots and stone, a megalaser at the end. */
export const MINE_FIGHTS = [
    designedKits({
        category: AGGRESSION, layers: [4, 9], name: "Prospecteurs jaloux",
        hazards: [lay(ROCK_BLOCK, 2, 3), lay(ROCK_BLOCK, 4, 3)],
        description: "Un artificier et un géomancien défendent leur filon.",
        kits: [ARTIFICER_KIT, GEOMANCER_KIT],
    }),
    designed({
        category: BATTLE, layers: [0, 4], name: "Robots de chantier",
        hazards: [
            lay(PATROL_ROBOT, 0, 2, Vector2.DOWN),
            lay(ROCK_BLOCK, 4, 3),
        ],
        description: "Des robots kamikazes qui foncent, un gobelin pour les lancer.",
        populate: stage => {
            put(stage, KAMIKAZE_ROBOT, 2, 1)
            put(stage, KAMIKAZE_ROBOT, 4, 1)
            put(stage, GOBLIN, 3, 0)
            if(stage.level >= 2) put(stage, KAMIKAZE_ROBOT, 3, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 5], name: "Mineurs en colère",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(ROCK_BLOCK, 5, 3),
            lay(HOLE, 3, 4),
        ],
        description: "Un berserker et un gobelin, un mage de glace qui reste en retrait.",
        populate: stage => {
            put(stage, BERSERKER, 3, 1)
            put(stage, GOBLIN, 1, 1)
            put(stage, ICE_MAGE, 4, 0)
            if(stage.level >= 2) put(stage, GOBLIN, 5, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [3, 7], name: "Éboulement",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(ROCK_BLOCK, 2.5, 4),
            lay(ROCK_BLOCK, 4, 3),
            lay(ROCK_BLOCK, 5.5, 4),
        ],
        description: "Un golem de pierre qui barre la galerie, des robots kamikazes sur ses flancs.",
        populate: stage => {
            put(stage, STONE_GOLEM, 3, 0)
            put(stage, KAMIKAZE_ROBOT, 1, 1)
            put(stage, KAMIKAZE_ROBOT, 5, 1)
            put(stage, GOBLIN, 1, 0)
            put(stage, ICE_MAGE, 5, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [6, 9], name: "Convoi de minerai",
        hazards: [
            lay(CONVEYOR, 0.5, 4, Vector2.RIGHT),
            lay(ROCK_BLOCK, 6, 2),
        ],
        description: "Un convoi de robots escortés par des berserkers, un mage de glace en queue.",
        populate: stage => {
            for(const column of [1, 3, 5]) put(stage, KAMIKAZE_ROBOT, column, 1)
            put(stage, BERSERKER, 2, 0)
            put(stage, BERSERKER, 4, 0)
            put(stage, ICE_MAGE, 0, 0)
            put(stage, ICE_MAGE, 6, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Les deux golems",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(ROCK_BLOCK, 5, 3),
            lay(HOLE, 3, 3),
        ],
        description: "Deux golems de pierre aux deux bouts, un berserker entre eux.",
        populate: stage => {
            put(stage, STONE_GOLEM, 1, 0)
            put(stage, STONE_GOLEM, 5, 0)
            put(stage, BERSERKER, 3, 1)
            put(stage, KAMIKAZE_ROBOT, 3, 0)
            put(stage, ICE_MAGE, 0, 1)
            put(stage, ICE_MAGE, 6, 1)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Charge explosive",
        hazards: [
            lay(EXPLOSIVE_BARREL, 2, 3),
            lay(EXPLOSIVE_BARREL, 4, 3),
            lay(EXPLOSIVE_BARREL, 3, 4),
        ],
        description: "Une ligne entière de robots kamikazes, des berserkers pour finir le travail.",
        populate: stage => {
            for(const column of [0, 1, 2, 4, 5, 6]) put(stage, KAMIKAZE_ROBOT, column, 1)
            put(stage, BERSERKER, 2, 0)
            put(stage, BERSERKER, 4, 0)
        },
    }),
    designed({
        category: BOSS, layers: [11, 11], name: "Le megalaser et ses gardes",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(ROCK_BLOCK, 5, 3),
            lay(EXPLOSIVE_BARREL, 3, 3),
            lay(HOLE, 3, 4),
        ],
        description: "Le megalaser au centre, un golem de pierre de chaque côté, des robots devant.",
        populate: stage => {
            put(stage, MEGALASER, 3, 0)
            put(stage, STONE_GOLEM, 0, 0)
            put(stage, STONE_GOLEM, 6, 0)
            put(stage, KAMIKAZE_ROBOT, 2, 1)
            put(stage, KAMIKAZE_ROBOT, 4, 1)
            if(stage.level >= 2) put(stage, ICE_MAGE, 3, 1)
        },
    }),
]
