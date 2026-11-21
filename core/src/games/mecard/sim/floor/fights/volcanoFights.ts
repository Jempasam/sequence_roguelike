import {
    BERSERKER, FIRE_LIZARD, FIRE_MAGE, IMP, MAGMA_DRAGON, PHOENIX_HYDRA, STONE_GOLEM,
} from "../../catalog/monsters"
import { GEYSER, HOLE, ROCK_BLOCK } from "../../catalog/hazards"
import { AGGRESSION, BATTLE, BOSS, ELITE } from "../../fight/fights"
import { PYROMANCER_KIT, BERSERKER_KIT } from "../../catalog/kits"
import { designed, designedKits, lay, put } from "./designed"

/** The fights of the volcano: lava and fire lizards, a magma dragon at the end. */
export const VOLCANO_FIGHTS = [
    designedKits({
        category: AGGRESSION, layers: [4, 9], name: "Pillards du cratère",
        hazards: [lay(ROCK_BLOCK, 2, 3), lay(ROCK_BLOCK, 4, 3)],
        description: "Un pyromancien et un berserker incendient tout sur leur passage.",
        kits: [PYROMANCER_KIT, BERSERKER_KIT],
    }),
    designed({
        category: ELITE, layers: [5, 9], name: "L'hydre phénix et ses lézards",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(GEYSER, 5, 3),
        ],
        description: "Une hydre qui renaît de ses cendres, des lézards de feu pour l'attiser.",
        populate: stage => {
            put(stage, PHOENIX_HYDRA, 3, 0)
            put(stage, FIRE_LIZARD, 2, 1)
            put(stage, FIRE_LIZARD, 4, 1)
            put(stage, IMP, 1, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 4], name: "Lézards des cendres",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(GEYSER, 4, 3),
        ],
        description: "Deux lézards de feu et leur lance-flammes, un diablotin qui danse entre eux.",
        populate: stage => {
            put(stage, FIRE_LIZARD, 2, 1)
            put(stage, FIRE_LIZARD, 4, 1)
            put(stage, IMP, 3, 0)
            if(stage.level >= 2) put(stage, FIRE_MAGE, 3, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 5], name: "Étincelles",
        hazards: [
            lay(GEYSER, 2, 3),
            lay(ROCK_BLOCK, 5, 3),
        ],
        description: "Un mage de feu protégé par des diablotins.",
        populate: stage => {
            put(stage, FIRE_MAGE, 3, 0)
            put(stage, IMP, 2, 1)
            put(stage, IMP, 4, 1)
            if(stage.level >= 2) put(stage, FIRE_LIZARD, 3, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [3, 7], name: "Coulée de pierre",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(ROCK_BLOCK, 3, 4),
            lay(ROCK_BLOCK, 5, 3),
        ],
        description: "Un golem de pierre qui avance dans la coulée, des lézards sur ses flancs.",
        populate: stage => {
            put(stage, STONE_GOLEM, 3, 0)
            put(stage, FIRE_LIZARD, 1, 1)
            put(stage, FIRE_LIZARD, 5, 1)
            put(stage, FIRE_MAGE, 1, 0)
            put(stage, FIRE_MAGE, 5, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [6, 9], name: "Forge du volcan",
        hazards: [
            lay(GEYSER, 1, 3),
            lay(GEYSER, 5, 3),
            lay(ROCK_BLOCK, 3, 4),
        ],
        description: "Berserkers en première ligne, lézards et mages de feu qui les couvrent d'étincelles.",
        populate: stage => {
            put(stage, BERSERKER, 2, 1)
            put(stage, BERSERKER, 4, 1)
            put(stage, FIRE_LIZARD, 3, 1)
            put(stage, FIRE_MAGE, 1, 0)
            put(stage, FIRE_MAGE, 3, 0)
            put(stage, FIRE_MAGE, 5, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Les gardiens de la lave",
        hazards: [
            lay(GEYSER, 3, 3),
            lay(HOLE, 1, 4),
            lay(HOLE, 5, 4),
        ],
        description: "Deux golems de pierre aux deux bouts, des lézards de feu entre eux.",
        populate: stage => {
            put(stage, STONE_GOLEM, 1, 0)
            put(stage, STONE_GOLEM, 5, 0)
            put(stage, FIRE_LIZARD, 3, 1)
            put(stage, FIRE_LIZARD, 3, 0)
            put(stage, FIRE_MAGE, 0, 1)
            put(stage, FIRE_MAGE, 6, 1)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Éruption de diablotins",
        hazards: [
            lay(ROCK_BLOCK, 2, 3),
            lay(ROCK_BLOCK, 4, 3),
            lay(GEYSER, 3, 4),
        ],
        description: "Six diablotins et trois mages de feu : tout brûle.",
        populate: stage => {
            for(const column of [0, 1, 2, 4, 5, 6]) put(stage, IMP, column, 1)
            put(stage, FIRE_MAGE, 1, 0)
            put(stage, FIRE_MAGE, 3, 0)
            put(stage, FIRE_MAGE, 5, 0)
        },
    }),
    designed({
        category: BOSS, layers: [11, 11], name: "Le dragon de magma et ses lézards",
        hazards: [
            lay(GEYSER, 1, 3),
            lay(GEYSER, 5, 3),
            lay(ROCK_BLOCK, 3, 3),
        ],
        description: "Le dragon de magma au centre du cratère, des lézards de feu devant, des mages derrière.",
        populate: stage => {
            put(stage, MAGMA_DRAGON, 3, 0)
            put(stage, FIRE_LIZARD, 2, 1)
            put(stage, FIRE_LIZARD, 4, 1)
            put(stage, FIRE_MAGE, 1, 0)
            put(stage, FIRE_MAGE, 5, 0)
            put(stage, BERSERKER, 0, 1)
        },
    }),
]
