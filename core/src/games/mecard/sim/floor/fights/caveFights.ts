import { ARCHER, BRUTE, GOBLIN, GOBLIN_HEALER, GOLEM, SLIME } from "../../catalog/monsters"
import { HOLE, PUDDLE_ZONE, ROCK_BLOCK } from "../../catalog/hazards"
import { AGGRESSION, BATTLE, BOSS, ELITE } from "../../fight/fights"
import { BRAWLER_KIT, ARCHER_KIT } from "../../catalog/kits"
import { designed, designedKits, lay, put } from "./designed"

/** The fights of the cave: gobelins and their friends, a golem at the end. */
export const CAVE_FIGHTS = [
    designedKits({
        category: AGGRESSION, layers: [4, 9], name: "Brigands de la caverne",
        hazards: [lay(ROCK_BLOCK, 2, 3), lay(ROCK_BLOCK, 4, 3)],
        description: "Un cogneur et un archer te barrent la route.",
        kits: [BRAWLER_KIT, ARCHER_KIT],
    }),
    designed({
        category: BATTLE, layers: [0, 4], name: "Infirmerie gobeline",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(ROCK_BLOCK, 5, 3),
        ],
        description: "Un gobelin soigneur qui panse les siens, deux gobelins devant, un archer.",
        populate: stage => {
            put(stage, GOBLIN_HEALER, 3, 0)
            put(stage, GOBLIN, 2, 1)
            put(stage, GOBLIN, 4, 1)
            put(stage, ARCHER, 1, 0)
        },
    }),
    designed({
        category: ELITE, layers: [3, 6], name: "Hôpital de campagne",
        hazards: [
            lay(ROCK_BLOCK, 3, 3),
            lay(PUDDLE_ZONE, 1, 3),
        ],
        description: "Deux soigneurs gobelins qui remettent debout deux brutes.",
        populate: stage => {
            put(stage, BRUTE, 2, 1)
            put(stage, BRUTE, 4, 1)
            put(stage, GOBLIN_HEALER, 2, 0)
            put(stage, GOBLIN_HEALER, 4, 0)
            put(stage, ARCHER, 3, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 4], name: "Patrouille de gobelins",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(ROCK_BLOCK, 5, 3),
        ],
        description: "Deux gobelins devant, un archer qui les couvre.",
        populate: stage => {
            put(stage, GOBLIN, 2, 1)
            put(stage, GOBLIN, 4, 1)
            put(stage, ARCHER, 3, 0)
            if(stage.level >= 2) put(stage, GOBLIN, 3, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 5], name: "Slimes en goguette",
        hazards: [
            lay(PUDDLE_ZONE, 2, 3),
            lay(PUDDLE_ZONE, 4, 4),
            lay(ROCK_BLOCK, 5, 2),
        ],
        description: "Des slimes qui se divisent, et un gobelin derrière eux.",
        populate: stage => {
            put(stage, SLIME, 2, 1)
            put(stage, SLIME, 4, 1)
            put(stage, GOBLIN, 3, 0)
            if(stage.level >= 2) put(stage, ARCHER, 5, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [3, 7], name: "Embuscade de la brute",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(ROCK_BLOCK, 3, 4),
            lay(ROCK_BLOCK, 5, 3),
        ],
        description: "Une brute au centre, flanquée de gobelins, des archers derrière.",
        populate: stage => {
            put(stage, BRUTE, 3, 1)
            put(stage, GOBLIN, 1, 1)
            put(stage, GOBLIN, 5, 1)
            put(stage, ARCHER, 2, 0)
            put(stage, ARCHER, 4, 0)
            if(stage.level >= 3) put(stage, SLIME, 3, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [6, 9], name: "Nid de gobelins",
        hazards: [
            lay(HOLE, 2, 3),
            lay(HOLE, 4, 3),
            lay(ROCK_BLOCK, 3, 4),
        ],
        description: "Une horde de gobelins en deux rangs, menée par une brute.",
        populate: stage => {
            for(const column of [1, 2, 4, 5]) put(stage, GOBLIN, column, 1)
            put(stage, BRUTE, 3, 0)
            put(stage, ARCHER, 1, 0)
            put(stage, ARCHER, 5, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Garde de la brute",
        hazards: [
            lay(ROCK_BLOCK, 2, 3),
            lay(ROCK_BLOCK, 4, 3),
            lay(HOLE, 3, 4),
        ],
        description: "Deux brutes au front, deux archers et un slime derrière.",
        populate: stage => {
            put(stage, BRUTE, 2, 1)
            put(stage, BRUTE, 4, 1)
            put(stage, ARCHER, 1, 0)
            put(stage, ARCHER, 5, 0)
            put(stage, SLIME, 3, 0)
            if(stage.level >= 2) put(stage, GOBLIN, 3, 1)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Marée de slimes",
        hazards: [
            lay(PUDDLE_ZONE, 1, 3),
            lay(PUDDLE_ZONE, 3, 3),
            lay(PUDDLE_ZONE, 5, 3),
        ],
        description: "Quatre slimes qui n'ont pas fini de se diviser, et une brute pour les protéger.",
        populate: stage => {
            for(const column of [1, 2, 4, 5]) put(stage, SLIME, column, 1)
            put(stage, BRUTE, 3, 0)
            put(stage, GOBLIN, 2, 0)
            put(stage, GOBLIN, 4, 0)
        },
    }),
    designed({
        category: BOSS, layers: [11, 11], name: "Le golem runique et sa cour",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(ROCK_BLOCK, 5, 3),
            lay(HOLE, 3, 3),
        ],
        description: "Le golem au centre, deux brutes qui lui font un rempart, des archers à ses côtés.",
        populate: stage => {
            put(stage, GOLEM, 3, 0)
            put(stage, BRUTE, 2, 1)
            put(stage, BRUTE, 4, 1)
            put(stage, ARCHER, 1, 0)
            put(stage, ARCHER, 5, 0)
            if(stage.level >= 2) put(stage, GOBLIN, 3, 1)
        },
    }),
]
