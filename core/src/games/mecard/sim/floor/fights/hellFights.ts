import { Vector2 } from "../../base/Vector2"
import { BERSERKER, BRUTE, DEVIL, ELF_ASSASSIN, FIRE_MAGE, IMP } from "../../catalog/monsters"
import { FLAMETHROWER_TURRET, GEYSER, HOLE, PILLAR } from "../../catalog/hazards"
import { AGGRESSION, BATTLE, BOSS, ELITE } from "../../fight/fights"
import { DEMONIST_KIT, PRIEST_KIT } from "../../catalog/kits"
import { designed, designedKits, lay, put } from "./designed"

/** The fights of hell: fire and rage, the devil at the end. */
export const HELL_FIGHTS = [
    designedKits({
        category: AGGRESSION, layers: [4, 9], name: "Exorcistes égarés",
        hazards: [lay(PILLAR, 2, 3), lay(PILLAR, 4, 3)],
        description: "Un démoniste et un prêtre se disputent ton âme.",
        kits: [DEMONIST_KIT, PRIEST_KIT],
    }),
    designed({
        category: BATTLE, layers: [0, 4], name: "Diablotins farceurs",
        hazards: [
            lay(GEYSER, 3, 3),
            lay(PILLAR, 1, 3),
        ],
        description: "Trois diablotins qui sautent partout, un mage de feu derrière.",
        populate: stage => {
            put(stage, IMP, 2, 1)
            put(stage, IMP, 3, 1)
            put(stage, IMP, 4, 1)
            put(stage, FIRE_MAGE, 3, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 5], name: "Rage au front",
        hazards: [
            lay(GEYSER, 1, 3),
            lay(GEYSER, 5, 3),
        ],
        description: "Un berserker et une brute au front, un diablotin pour la poursuite.",
        populate: stage => {
            put(stage, BERSERKER, 2, 1)
            put(stage, BRUTE, 4, 1)
            put(stage, IMP, 3, 0)
            if(stage.level >= 2) put(stage, FIRE_MAGE, 5, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [3, 7], name: "Cercle de feu",
        hazards: [
            lay(HOLE, 2, 3),
            lay(HOLE, 4, 3),
            lay(GEYSER, 3, 4),
        ],
        description: "Des mages de feu en cercle, des assassins pour ceux qui s'approchent.",
        populate: stage => {
            put(stage, FIRE_MAGE, 1, 0)
            put(stage, FIRE_MAGE, 3, 0)
            put(stage, FIRE_MAGE, 5, 0)
            put(stage, ELF_ASSASSIN, 2, 1)
            put(stage, ELF_ASSASSIN, 4, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [6, 9], name: "Légion infernale",
        hazards: [
            lay(FLAMETHROWER_TURRET, 0, 3, Vector2.RIGHT),
            lay(HOLE, 3, 3),
            lay(PILLAR, 5, 4),
        ],
        description: "Brutes et berserkers en première ligne, mages et diablotins derrière.",
        populate: stage => {
            put(stage, BRUTE, 2, 1)
            put(stage, BRUTE, 4, 1)
            put(stage, BERSERKER, 3, 1)
            put(stage, FIRE_MAGE, 1, 0)
            put(stage, FIRE_MAGE, 5, 0)
            put(stage, IMP, 3, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Garde du brasier",
        hazards: [
            lay(GEYSER, 2, 3),
            lay(GEYSER, 4, 3),
            lay(HOLE, 3, 4),
        ],
        description: "Trois berserkers déchaînés, des mages de feu qui attisent le brasier.",
        populate: stage => {
            for(const column of [1, 3, 5]) put(stage, BERSERKER, column, 1)
            put(stage, FIRE_MAGE, 2, 0)
            put(stage, FIRE_MAGE, 4, 0)
            put(stage, IMP, 0, 0)
            put(stage, IMP, 6, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Nuée de diablotins",
        hazards: [
            lay(HOLE, 1, 3),
            lay(HOLE, 5, 3),
            lay(PILLAR, 3, 3),
        ],
        description: "Six diablotins, deux brutes pour les protéger.",
        populate: stage => {
            for(const column of [0, 1, 2, 4, 5, 6]) put(stage, IMP, column, 1)
            put(stage, BRUTE, 2, 0)
            put(stage, BRUTE, 4, 0)
        },
    }),
    designed({
        category: BOSS, layers: [11, 11], name: "Le diable et sa cour",
        hazards: [
            lay(GEYSER, 3, 3),
            lay(FLAMETHROWER_TURRET, 6, 3, Vector2.LEFT),
            lay(PILLAR, 1, 3),
        ],
        description: "Le diable au centre, des brutes pour garder le trône, des mages de feu à ses côtés.",
        populate: stage => {
            put(stage, DEVIL, 3, 0)
            put(stage, BRUTE, 2, 1)
            put(stage, BRUTE, 4, 1)
            put(stage, FIRE_MAGE, 1, 0)
            put(stage, FIRE_MAGE, 5, 0)
            put(stage, IMP, 3, 1)
        },
    }),
]
