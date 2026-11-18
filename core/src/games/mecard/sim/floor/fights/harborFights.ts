import { Vector2 } from "../../base/Vector2"
import {
    BRUTE, GARRISON_GOBLIN, GOBLIN_WRESTLER, HARPOON_PIRATE, KRAKEN_CAPTAIN, SNIPER, TOXIC_TOAD,
} from "../../catalog/monsters"
import { EXPLOSIVE_BARREL, PILLAR, PIRATE_CANNON, PIRATE_SHIP } from "../../catalog/hazards"
import { AGGRESSION, BATTLE, BOSS, ELITE } from "../../fight/fights"
import { FISHER_KIT, GUNNER_KIT } from "../../catalog/kits"
import { designed, designedKits, lay, put } from "./designed"

/** The fights of the harbor: pirates and docks, a kraken captain at the end. */
export const HARBOR_FIGHTS = [
    designedKits({
        category: AGGRESSION, layers: [4, 9], name: "Fusiliers du quai",
        hazards: [lay(PILLAR, 2, 3), lay(PILLAR, 4, 3)],
        description: "Un pêcheur et un fusilier t'accueillent à leur manière.",
        kits: [FISHER_KIT, GUNNER_KIT],
    }),
    designed({
        category: BATTLE, layers: [0, 4], name: "Pirates du quai",
        hazards: [
            lay(EXPLOSIVE_BARREL, 1, 3),
            lay(EXPLOSIVE_BARREL, 5, 3),
            lay(PILLAR, 3, 4),
        ],
        description: "Deux pirates au harpon qui lassoent, un crapaud toxique caché dans les caisses.",
        populate: stage => {
            put(stage, HARPOON_PIRATE, 2, 1)
            put(stage, HARPOON_PIRATE, 4, 1)
            put(stage, TOXIC_TOAD, 3, 0)
            if(stage.level >= 2) put(stage, GOBLIN_WRESTLER, 3, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 5], name: "Bagarre de taverne",
        hazards: [
            lay(EXPLOSIVE_BARREL, 2, 3),
            lay(EXPLOSIVE_BARREL, 4, 4),
            lay(PIRATE_CANNON, 0, 3, Vector2.RIGHT),
        ],
        description: "Un catcheur qui s'attrape tout le monde, un pirate et un crapaud qui regardent.",
        populate: stage => {
            put(stage, GOBLIN_WRESTLER, 3, 1)
            put(stage, HARPOON_PIRATE, 2, 0)
            put(stage, TOXIC_TOAD, 4, 0)
            if(stage.level >= 2) put(stage, HARPOON_PIRATE, 5, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [3, 7], name: "Garde des entrepôts",
        hazards: [
            lay(EXPLOSIVE_BARREL, 1, 3),
            lay(EXPLOSIVE_BARREL, 5, 3),
            lay(PILLAR, 3, 3),
        ],
        description: "Des brutes qui gardent les caisses, un gobelin de garnison et un pirate en soutien.",
        populate: stage => {
            put(stage, BRUTE, 2, 1)
            put(stage, BRUTE, 4, 1)
            put(stage, GARRISON_GOBLIN, 3, 0)
            put(stage, HARPOON_PIRATE, 1, 0)
            put(stage, HARPOON_PIRATE, 5, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [6, 9], name: "Abordage",
        hazards: [
            lay(PIRATE_SHIP, 0, 3, Vector2.RIGHT),
            lay(EXPLOSIVE_BARREL, 5, 4),
        ],
        description: "Une vague de pirates, de catcheurs et de brutes, un sniper dans la mâture.",
        populate: stage => {
            put(stage, GOBLIN_WRESTLER, 2, 1)
            put(stage, BRUTE, 3, 1)
            put(stage, GOBLIN_WRESTLER, 4, 1)
            put(stage, HARPOON_PIRATE, 1, 0)
            put(stage, HARPOON_PIRATE, 5, 0)
            put(stage, SNIPER, 3, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "L'équipage au complet",
        hazards: [
            lay(PIRATE_CANNON, 0, 3, Vector2.RIGHT),
            lay(EXPLOSIVE_BARREL, 5, 4),
            lay(EXPLOSIVE_BARREL, 1, 4),
        ],
        description: "Quatre pirates au harpon, des brutes pour tenir le pont.",
        populate: stage => {
            for(const column of [1, 2, 4, 5]) put(stage, HARPOON_PIRATE, column, 0)
            put(stage, BRUTE, 2, 1)
            put(stage, BRUTE, 4, 1)
            put(stage, SNIPER, 3, 0)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Les dockers",
        hazards: [
            lay(EXPLOSIVE_BARREL, 2, 3),
            lay(EXPLOSIVE_BARREL, 4, 3),
            lay(PILLAR, 3, 4),
        ],
        description: "Trois catcheurs, des crapauds toxiques dans les flaques, un sniper sur la grue.",
        populate: stage => {
            for(const column of [1, 3, 5]) put(stage, GOBLIN_WRESTLER, column, 1)
            put(stage, TOXIC_TOAD, 2, 0)
            put(stage, TOXIC_TOAD, 4, 0)
            put(stage, SNIPER, 3, 0)
        },
    }),
    designed({
        category: BOSS, layers: [11, 11], name: "Le capitaine Kraken et son équipage",
        hazards: [
            lay(PIRATE_SHIP, 0, 3, Vector2.RIGHT),
            lay(PIRATE_CANNON, 6, 2, Vector2.LEFT),
            lay(EXPLOSIVE_BARREL, 3, 4),
        ],
        description: "Le capitaine Kraken à la barre, des brutes à ses côtés, des pirates au harpon.",
        populate: stage => {
            put(stage, KRAKEN_CAPTAIN, 3, 0)
            put(stage, BRUTE, 2, 1)
            put(stage, BRUTE, 4, 1)
            put(stage, HARPOON_PIRATE, 1, 0)
            put(stage, HARPOON_PIRATE, 5, 0)
            put(stage, SNIPER, 3, 1)
        },
    }),
]
