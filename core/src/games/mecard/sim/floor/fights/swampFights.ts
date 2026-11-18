import {
    ELF_ARCHER, GOBLIN, HYDRA, MAD_ALCHEMIST, ORC_BATTLE_SHAMAN, SLIME, THORN_TANK, TOXIC_TOAD,
} from "../../catalog/monsters"
import { BUSH, PUDDLE_ZONE, TREE } from "../../catalog/hazards"
import { AGGRESSION, BATTLE, BOSS, ELITE } from "../../fight/fights"
import { SWAMP_SORCERER_KIT, WITCHER_KIT } from "../../catalog/kits"
import { designed, designedKits, lay, put } from "./designed"

/** The fights of the swamp: mud, poison and toads, a hydra at the end. */
export const SWAMP_FIGHTS = [
    designedKits({
        category: AGGRESSION, layers: [4, 9], name: "Chasseurs de sorcières",
        hazards: [lay(TREE, 2, 3), lay(TREE, 4, 3)],
        description: "Un sorcier des marais et un sorceleur t'attendent dans la brume.",
        kits: [SWAMP_SORCERER_KIT, WITCHER_KIT],
    }),
    designed({
        category: BATTLE, layers: [0, 4], name: "Crapauds du marais",
        hazards: [
            lay(PUDDLE_ZONE, 2, 3),
            lay(PUDDLE_ZONE, 4, 4),
            lay(BUSH, 5, 3),
        ],
        description: "Deux crapauds toxiques qui crachent, un gobelin embourbé devant.",
        populate: stage => {
            put(stage, GOBLIN, 3, 1)
            put(stage, TOXIC_TOAD, 2, 0)
            put(stage, TOXIC_TOAD, 4, 0)
            if(stage.level >= 2) put(stage, SLIME, 1, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 5], name: "Boue vivante",
        hazards: [
            lay(PUDDLE_ZONE, 3, 3),
            lay(BUSH, 1, 3),
            lay(BUSH, 5, 3),
        ],
        description: "Des slimes dans la boue, un crapaud qui les arrose.",
        populate: stage => {
            put(stage, SLIME, 2, 1)
            put(stage, SLIME, 4, 1)
            put(stage, TOXIC_TOAD, 3, 0)
            if(stage.level >= 2) put(stage, GOBLIN, 3, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [3, 7], name: "L'alchimiste fou",
        hazards: [
            lay(TREE, 1, 3),
            lay(PUDDLE_ZONE, 3, 3),
            lay(TREE, 5, 3),
        ],
        description: "Un alchimiste fou protégé par des crapauds, un archer elfe sur la berge.",
        populate: stage => {
            put(stage, MAD_ALCHEMIST, 3, 0)
            put(stage, TOXIC_TOAD, 2, 1)
            put(stage, TOXIC_TOAD, 4, 1)
            put(stage, ELF_ARCHER, 1, 0)
            put(stage, SLIME, 5, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [6, 9], name: "Marais empoisonné",
        hazards: [
            lay(PUDDLE_ZONE, 1, 3),
            lay(PUDDLE_ZONE, 3, 4),
            lay(PUDDLE_ZONE, 5, 3),
            lay(TREE, 3, 3),
        ],
        description: "Deux alchimistes fous, un tank épineux qui tient la berge, des crapauds en renfort.",
        populate: stage => {
            put(stage, THORN_TANK, 3, 1)
            put(stage, MAD_ALCHEMIST, 2, 0)
            put(stage, MAD_ALCHEMIST, 4, 0)
            put(stage, TOXIC_TOAD, 1, 1)
            put(stage, TOXIC_TOAD, 5, 1)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Les shamans du marais",
        hazards: [
            lay(TREE, 2, 3),
            lay(TREE, 4, 3),
            lay(PUDDLE_ZONE, 3, 4),
        ],
        description: "Deux orcs shamans qui se synchronisent, protégés par un tank épineux.",
        populate: stage => {
            put(stage, THORN_TANK, 3, 1)
            put(stage, ORC_BATTLE_SHAMAN, 2, 0)
            put(stage, ORC_BATTLE_SHAMAN, 4, 0)
            put(stage, TOXIC_TOAD, 1, 1)
            put(stage, TOXIC_TOAD, 5, 1)
            put(stage, MAD_ALCHEMIST, 3, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Banc de crapauds",
        hazards: [
            lay(PUDDLE_ZONE, 2, 3),
            lay(PUDDLE_ZONE, 4, 3),
            lay(BUSH, 3, 4),
        ],
        description: "Une mare de crapauds toxiques, deux alchimistes fous qui les dopent.",
        populate: stage => {
            for(const column of [1, 2, 4, 5]) put(stage, TOXIC_TOAD, column, 1)
            put(stage, MAD_ALCHEMIST, 2, 0)
            put(stage, MAD_ALCHEMIST, 4, 0)
            put(stage, SLIME, 3, 1)
        },
    }),
    designed({
        category: BOSS, layers: [11, 11], name: "L'hydre et ses crapauds",
        hazards: [
            lay(TREE, 1, 3),
            lay(TREE, 5, 3),
            lay(PUDDLE_ZONE, 3, 3),
            lay(BUSH, 3, 4),
        ],
        description: "L'hydre au centre de la mare, des crapauds et des alchimistes sur ses rives.",
        populate: stage => {
            put(stage, HYDRA, 3, 0)
            put(stage, TOXIC_TOAD, 2, 1)
            put(stage, TOXIC_TOAD, 4, 1)
            put(stage, MAD_ALCHEMIST, 1, 0)
            put(stage, MAD_ALCHEMIST, 5, 0)
            put(stage, THORN_TANK, 0, 1)
        },
    }),
]
