import { BULL, ELF_ARCHER, ELF_ASSASSIN, GOBLIN_RIDER, HUNTER, TROLL } from "../../catalog/monsters"
import { BUSH, ROCK_BLOCK, TREE } from "../../catalog/hazards"
import { AGGRESSION, BATTLE, BOSS, ELITE } from "../../fight/fights"
import { HUNTER_KIT, DRUID_KIT } from "../../catalog/kits"
import { designed, designedKits, lay, put } from "./designed"

/** The fights of the forest: hunters and fast blades, a troll at the end. */
export const FOREST_FIGHTS = [
    designedKits({
        category: AGGRESSION, layers: [4, 9], name: "Chasseurs de la forêt",
        hazards: [lay(TREE, 2, 3), lay(TREE, 4, 3)],
        description: "Un chasseur et un druide te prennent pour leur gibier.",
        kits: [HUNTER_KIT, DRUID_KIT],
    }),
    designed({
        category: BATTLE, layers: [0, 4], name: "Chasseurs à l'affût",
        hazards: [
            lay(TREE, 1, 3),
            lay(TREE, 5, 3),
            lay(BUSH, 3, 4),
        ],
        description: "Deux chasseurs embusqués derrière un archer elfe.",
        populate: stage => {
            put(stage, HUNTER, 2, 1)
            put(stage, HUNTER, 4, 1)
            put(stage, ELF_ARCHER, 3, 0)
            if(stage.level >= 2) put(stage, ELF_ASSASSIN, 3, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 5], name: "Cavaliers gobelins",
        hazards: [
            lay(TREE, 2, 3),
            lay(BUSH, 4, 3),
            lay(BUSH, 1, 4),
        ],
        description: "Une charge de gobelins cavaliers.",
        populate: stage => {
            put(stage, GOBLIN_RIDER, 2, 1)
            put(stage, GOBLIN_RIDER, 4, 1)
            put(stage, HUNTER, 3, 0)
            if(stage.level >= 2) put(stage, GOBLIN_RIDER, 3, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [3, 7], name: "Le taureau et les assassins",
        hazards: [
            lay(TREE, 1, 3),
            lay(TREE, 3, 4),
            lay(TREE, 5, 3),
        ],
        description: "Un taureau qui charge en tête, deux assassins elfes dans son sillage.",
        populate: stage => {
            put(stage, BULL, 3, 1)
            put(stage, ELF_ASSASSIN, 1, 1)
            put(stage, ELF_ASSASSIN, 5, 1)
            put(stage, ELF_ARCHER, 2, 0)
            put(stage, HUNTER, 4, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [6, 9], name: "Battue",
        hazards: [
            lay(TREE, 2, 3),
            lay(TREE, 4, 3),
            lay(BUSH, 3, 3),
            lay(BUSH, 0.5, 4),
        ],
        description: "Toute une battue : chasseurs et archers elfes en arc, un taureau au milieu.",
        populate: stage => {
            put(stage, BULL, 3, 1)
            put(stage, HUNTER, 1, 0)
            put(stage, HUNTER, 5, 0)
            put(stage, ELF_ARCHER, 2, 0)
            put(stage, ELF_ARCHER, 4, 0)
            put(stage, GOBLIN_RIDER, 2, 1)
            put(stage, GOBLIN_RIDER, 4, 1)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Troupeau de taureaux",
        hazards: [
            lay(ROCK_BLOCK, 2, 3),
            lay(ROCK_BLOCK, 4, 3),
            lay(BUSH, 3, 4),
        ],
        description: "Trois taureaux de front, des chasseurs pour viser le plus robuste.",
        populate: stage => {
            for(const column of [1, 3, 5]) put(stage, BULL, column, 1)
            put(stage, HUNTER, 2, 0)
            put(stage, HUNTER, 4, 0)
            if(stage.level >= 2) put(stage, ELF_ARCHER, 3, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Meute d'assassins",
        hazards: [
            lay(TREE, 1, 3),
            lay(TREE, 5, 3),
            lay(BUSH, 3, 3),
        ],
        description: "Des assassins elfes partout, des cavaliers pour les couvrir.",
        populate: stage => {
            for(const column of [1, 3, 5]) put(stage, ELF_ASSASSIN, column, 1)
            put(stage, GOBLIN_RIDER, 2, 0)
            put(stage, GOBLIN_RIDER, 4, 0)
            put(stage, ELF_ARCHER, 3, 0)
        },
    }),
    designed({
        category: BOSS, layers: [11, 11], name: "Le troll et ses chasseurs",
        hazards: [
            lay(TREE, 1, 3),
            lay(TREE, 5, 3),
            lay(BUSH, 2.5, 4),
            lay(BUSH, 3.5, 4),
        ],
        description: "Le troll au fond, deux taureaux de chaque côté, des chasseurs aux ailes.",
        populate: stage => {
            put(stage, TROLL, 3, 0)
            put(stage, BULL, 2, 1)
            put(stage, BULL, 4, 1)
            put(stage, HUNTER, 0, 1)
            put(stage, HUNTER, 6, 1)
            put(stage, ELF_ARCHER, 1, 0)
            put(stage, ELF_ARCHER, 5, 0)
        },
    }),
]
