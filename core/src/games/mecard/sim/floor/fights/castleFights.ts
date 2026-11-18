import {
    DARK_LORD, GARRISON_GOBLIN, IRON_KNIGHT, MIND_CONTROLLER, SHIELD_GUARD, SNIPER, THORN_TANK,
} from "../../catalog/monsters"
import { PILLAR, WALL } from "../../catalog/hazards"
import { AGGRESSION, BATTLE, BOSS, ELITE } from "../../fight/fights"
import { KNIGHT_KIT, DUELIST_KIT } from "../../catalog/kits"
import { designed, designedKits, lay, put } from "./designed"

/** The fights of the castle: guards and knights, a dark lord at the end. */
export const CASTLE_FIGHTS = [
    designedKits({
        category: AGGRESSION, layers: [4, 9], name: "Duel de chevaliers",
        hazards: [lay(PILLAR, 2, 3), lay(PILLAR, 4, 3)],
        description: "Un chevalier et un duelliste te défient.",
        kits: [KNIGHT_KIT, DUELIST_KIT],
    }),
    designed({
        category: BATTLE, layers: [0, 4], name: "Gardes du pont-levis",
        hazards: [
            lay(WALL, 1.5, 3),
            lay(PILLAR, 5, 3),
        ],
        description: "Deux gardes au bouclier qui barrent le passage, un gobelin de garnison qui pose une tourelle.",
        populate: stage => {
            put(stage, SHIELD_GUARD, 2, 1)
            put(stage, SHIELD_GUARD, 4, 1)
            put(stage, GARRISON_GOBLIN, 3, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 5], name: "Le sniper des remparts",
        hazards: [
            lay(PILLAR, 1, 3),
            lay(WALL, 4.5, 3),
        ],
        description: "Un sniper sur le rempart, un garde et deux gobelins de garnison pour le couvrir.",
        populate: stage => {
            put(stage, SNIPER, 3, 0)
            put(stage, SHIELD_GUARD, 3, 1)
            put(stage, GARRISON_GOBLIN, 1, 1)
            put(stage, GARRISON_GOBLIN, 5, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [3, 7], name: "Ronde des chevaliers",
        hazards: [
            lay(PILLAR, 1, 3),
            lay(PILLAR, 3, 3),
            lay(PILLAR, 5, 3),
        ],
        description: "Deux chevaliers de fer en tête, un tank épineux et un sniper derrière.",
        populate: stage => {
            put(stage, IRON_KNIGHT, 2, 1)
            put(stage, IRON_KNIGHT, 4, 1)
            put(stage, THORN_TANK, 3, 0)
            put(stage, SNIPER, 1, 0)
            put(stage, GARRISON_GOBLIN, 5, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [6, 9], name: "Salle du trône",
        hazards: [
            lay(WALL, 1.5, 3),
            lay(WALL, 4.5, 3),
            lay(PILLAR, 3, 4),
        ],
        description: "Chevaliers et gardes en haie, un contrôleur mental qui retourne les alliés, deux snipers.",
        populate: stage => {
            put(stage, IRON_KNIGHT, 1, 1)
            put(stage, SHIELD_GUARD, 3, 1)
            put(stage, IRON_KNIGHT, 5, 1)
            put(stage, MIND_CONTROLLER, 3, 0)
            put(stage, SNIPER, 1, 0)
            put(stage, SNIPER, 5, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Les chevaliers du seigneur",
        hazards: [
            lay(PILLAR, 1, 4),
            lay(PILLAR, 5, 4),
            lay(WALL, 3, 3),
        ],
        description: "Trois chevaliers de fer, un tank épineux qui provoque, un contrôleur mental.",
        populate: stage => {
            for(const column of [1, 3, 5]) put(stage, IRON_KNIGHT, column, 1)
            put(stage, THORN_TANK, 3, 0)
            put(stage, MIND_CONTROLLER, 2, 0)
            put(stage, SNIPER, 4, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Muraille de boucliers",
        hazards: [
            lay(WALL, 1.5, 3),
            lay(WALL, 4.5, 3),
        ],
        description: "Une muraille de gardes au bouclier, des snipers qui tirent par-dessus.",
        populate: stage => {
            for(const column of [1, 2, 3, 4, 5]) put(stage, SHIELD_GUARD, column, 1)
            put(stage, SNIPER, 2, 0)
            put(stage, SNIPER, 4, 0)
        },
    }),
    designed({
        category: BOSS, layers: [11, 11], name: "Le seigneur noir et sa garde",
        hazards: [
            lay(PILLAR, 1, 3),
            lay(PILLAR, 5, 3),
            lay(WALL, 3, 4),
            lay(PILLAR, 3, 2),
        ],
        description: "Le seigneur noir au centre, des chevaliers qui lui font un rempart, un contrôleur mental.",
        populate: stage => {
            put(stage, DARK_LORD, 3, 0)
            put(stage, IRON_KNIGHT, 2, 1)
            put(stage, IRON_KNIGHT, 4, 1)
            put(stage, MIND_CONTROLLER, 1, 0)
            put(stage, SNIPER, 5, 0)
            put(stage, SHIELD_GUARD, 3, 1)
        },
    }),
]
