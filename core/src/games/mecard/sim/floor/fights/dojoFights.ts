import {
    BERSERKER, ELF_ASSASSIN, GHOST_SHOGUN, GOBLIN, ORC_BATTLE_SHAMAN, WANDERING_SAMURAI,
} from "../../catalog/monsters"
import { PILLAR, TORII } from "../../catalog/hazards"
import { AGGRESSION, BATTLE, BOSS, ELITE } from "../../fight/fights"
import { SHADOW_SAMURAI_KIT, ASSASSIN_KIT } from "../../catalog/kits"
import { designed, designedKits, lay, put } from "./designed"

/** The fights of the dojo: fast blades, a ghost shogun at the end. */
export const DOJO_FIGHTS = [
    designedKits({
        category: AGGRESSION, layers: [4, 9], name: "Élèves rebelles",
        hazards: [lay(PILLAR, 2, 3), lay(PILLAR, 4, 3)],
        description: "Un samouraï de l'ombre et un assassin quittent le dojo pour t'attaquer.",
        kits: [SHADOW_SAMURAI_KIT, ASSASSIN_KIT],
    }),
    designed({
        category: BATTLE, layers: [0, 4], name: "Duel de samouraïs",
        hazards: [
            lay(TORII, 3, 3),
        ],
        description: "Un samouraï errant concentré, un assassin elfe dans l'ombre.",
        populate: stage => {
            put(stage, WANDERING_SAMURAI, 3, 1)
            put(stage, ELF_ASSASSIN, 2, 0)
            if(stage.level >= 2) put(stage, GOBLIN, 4, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 5], name: "Élèves du dojo",
        hazards: [
            lay(TORII, 1, 3),
            lay(TORII, 5, 3),
        ],
        description: "Des gobelins à l'entraînement, un assassin elfe qui les surveille.",
        populate: stage => {
            put(stage, GOBLIN, 2, 1)
            put(stage, GOBLIN, 4, 1)
            put(stage, ELF_ASSASSIN, 3, 0)
            put(stage, WANDERING_SAMURAI, 3, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [3, 7], name: "Les deux lames",
        hazards: [
            lay(PILLAR, 1, 3),
            lay(PILLAR, 5, 3),
            lay(TORII, 3, 4),
        ],
        description: "Deux samouraïs côte à côte, des assassins qui frappent de l'ombre.",
        populate: stage => {
            put(stage, WANDERING_SAMURAI, 2, 1)
            put(stage, WANDERING_SAMURAI, 4, 1)
            put(stage, ELF_ASSASSIN, 1, 0)
            put(stage, ELF_ASSASSIN, 5, 0)
            put(stage, BERSERKER, 3, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [6, 9], name: "Salle d'armes",
        hazards: [
            lay(TORII, 3, 3),
            lay(PILLAR, 1, 4),
            lay(PILLAR, 5, 4),
        ],
        description: "Berserkers et samouraïs en arc de cercle, un orc shaman qui synchronise.",
        populate: stage => {
            put(stage, BERSERKER, 1, 1)
            put(stage, WANDERING_SAMURAI, 3, 1)
            put(stage, BERSERKER, 5, 1)
            put(stage, ORC_BATTLE_SHAMAN, 3, 0)
            put(stage, ELF_ASSASSIN, 1, 0)
            put(stage, ELF_ASSASSIN, 5, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Les maîtres d'armes",
        hazards: [
            lay(TORII, 1, 3),
            lay(TORII, 5, 3),
            lay(PILLAR, 3, 4),
        ],
        description: "Trois samouraïs, des orcs shamans qui les rendent furieux.",
        populate: stage => {
            for(const column of [1, 3, 5]) put(stage, WANDERING_SAMURAI, column, 1)
            put(stage, ORC_BATTLE_SHAMAN, 2, 0)
            put(stage, ORC_BATTLE_SHAMAN, 4, 0)
            put(stage, ELF_ASSASSIN, 3, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Ombres du dojo",
        hazards: [
            lay(PILLAR, 1, 3),
            lay(PILLAR, 3, 3),
            lay(PILLAR, 5, 3),
        ],
        description: "Quatre assassins elfes qui se fondent dans l'ombre, des berserkers devant.",
        populate: stage => {
            for(const column of [1, 2, 4, 5]) put(stage, ELF_ASSASSIN, column, 0)
            put(stage, BERSERKER, 2, 1)
            put(stage, BERSERKER, 4, 1)
            put(stage, WANDERING_SAMURAI, 3, 1)
        },
    }),
    designed({
        category: BOSS, layers: [11, 11], name: "Le shogun fantôme et ses lames",
        hazards: [
            lay(TORII, 3, 3),
            lay(PILLAR, 0.5, 4),
            lay(PILLAR, 5.5, 4),
        ],
        description: "Le shogun au centre, deux samouraïs en garde, des assassins dans l'ombre.",
        populate: stage => {
            put(stage, GHOST_SHOGUN, 3, 0)
            put(stage, WANDERING_SAMURAI, 2, 1)
            put(stage, WANDERING_SAMURAI, 4, 1)
            put(stage, ELF_ASSASSIN, 1, 0)
            put(stage, ELF_ASSASSIN, 5, 0)
            put(stage, ORC_BATTLE_SHAMAN, 3, 1)
        },
    }),
]
