import { BULL, FROST_GIANT, HUNTER, ICE_MAGE, OGRE_CRUSHER, WEREWOLF } from "../../catalog/monsters"
import { HOLE, ROCK_BLOCK, TREE, WALL } from "../../catalog/hazards"
import { AGGRESSION, BATTLE, BOSS, ELITE } from "../../fight/fights"
import { BEAST_WARRIOR_KIT, SHAMAN_KIT } from "../../catalog/kits"
import { designed, designedKits, lay, put } from "./designed"

/** The fights of the tundra: cold, wolves, a frost giant at the end. */
export const TUNDRA_FIGHTS = [
    designedKits({
        category: AGGRESSION, layers: [4, 9], name: "Tribu des glaces",
        hazards: [lay(ROCK_BLOCK, 2, 3), lay(ROCK_BLOCK, 4, 3)],
        description: "Un guerrier-bête et un chaman protègent leur territoire.",
        kits: [BEAST_WARRIOR_KIT, SHAMAN_KIT],
    }),
    designed({
        category: BATTLE, layers: [0, 4], name: "Loups affamés",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(ROCK_BLOCK, 5, 3),
            lay(TREE, 3, 4),
        ],
        description: "Deux loups-garous qui bondissent, un chasseur qui les guide.",
        populate: stage => {
            put(stage, WEREWOLF, 2, 1)
            put(stage, WEREWOLF, 4, 1)
            put(stage, HUNTER, 3, 0)
            if(stage.level >= 2) put(stage, ICE_MAGE, 5, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 5], name: "Mages du givre",
        hazards: [
            lay(ROCK_BLOCK, 2, 3),
            lay(WALL, 4.5, 3),
        ],
        description: "Deux mages de glace sur une corniche, un chasseur qui les protège.",
        populate: stage => {
            put(stage, ICE_MAGE, 2, 0)
            put(stage, ICE_MAGE, 4, 0)
            put(stage, HUNTER, 3, 1)
            if(stage.level >= 2) put(stage, WEREWOLF, 1, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [3, 7], name: "Le taureau des neiges",
        hazards: [
            lay(TREE, 1, 3),
            lay(TREE, 5, 3),
            lay(ROCK_BLOCK, 3, 3),
        ],
        description: "Un taureau lancé sur la glace, des loups sur ses flancs, des mages derrière.",
        populate: stage => {
            put(stage, BULL, 3, 1)
            put(stage, WEREWOLF, 1, 1)
            put(stage, WEREWOLF, 5, 1)
            put(stage, ICE_MAGE, 2, 0)
            put(stage, ICE_MAGE, 4, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [6, 9], name: "Tempête de neige",
        hazards: [
            lay(WALL, 1.5, 3),
            lay(WALL, 4.5, 4),
        ],
        description: "Une meute de loups, des taureaux, des mages de glace qui font tomber la neige.",
        populate: stage => {
            put(stage, BULL, 2, 1)
            put(stage, BULL, 4, 1)
            put(stage, WEREWOLF, 1, 1)
            put(stage, WEREWOLF, 5, 1)
            put(stage, ICE_MAGE, 2, 0)
            put(stage, ICE_MAGE, 4, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "L'ogre des glaces",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(HOLE, 3, 3),
            lay(ROCK_BLOCK, 5, 3),
        ],
        description: "Un ogre écraseur au centre, des loups qui flairent le sang, des mages de glace.",
        populate: stage => {
            put(stage, OGRE_CRUSHER, 3, 0)
            put(stage, WEREWOLF, 2, 1)
            put(stage, WEREWOLF, 4, 1)
            put(stage, ICE_MAGE, 1, 0)
            put(stage, ICE_MAGE, 5, 0)
            put(stage, HUNTER, 6, 1)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Deux ogres",
        hazards: [
            lay(ROCK_BLOCK, 2, 3),
            lay(ROCK_BLOCK, 4, 3),
            lay(HOLE, 3, 4),
        ],
        description: "Deux ogres écraseurs aux deux bouts, un taureau entre eux.",
        populate: stage => {
            put(stage, OGRE_CRUSHER, 1, 0)
            put(stage, OGRE_CRUSHER, 5, 0)
            put(stage, BULL, 3, 1)
            put(stage, ICE_MAGE, 3, 0)
        },
    }),
    designed({
        category: BOSS, layers: [11, 11], name: "Le géant de givre et sa meute",
        hazards: [
            lay(TREE, 1, 3),
            lay(TREE, 5, 3),
            lay(HOLE, 3, 3),
        ],
        description: "Le géant de givre au centre, des loups-garous à ses pieds, des mages de glace à ses côtés.",
        populate: stage => {
            put(stage, FROST_GIANT, 3, 0)
            put(stage, WEREWOLF, 2, 1)
            put(stage, WEREWOLF, 4, 1)
            put(stage, ICE_MAGE, 1, 0)
            put(stage, ICE_MAGE, 5, 0)
            put(stage, BULL, 0, 1)
        },
    }),
]
