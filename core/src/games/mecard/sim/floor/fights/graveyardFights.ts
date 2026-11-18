import {
    GHOST, HAUNTING_GHOST, LICH_KING, SKELETON_REAPER, VENGEFUL_SPIRIT, WEREWOLF,
} from "../../catalog/monsters"
import { BUSH, HOLE, PILLAR, ROCK_BLOCK, WALL } from "../../catalog/hazards"
import { AGGRESSION, BATTLE, BOSS, ELITE } from "../../fight/fights"
import { SPIRITIST_KIT, MARTYR_KIT } from "../../catalog/kits"
import { designed, designedKits, lay, put } from "./designed"

/** The fights of the graveyard: the dead that do not stay down, a lich king at the end. */
export const GRAVEYARD_FIGHTS = [
    designedKits({
        category: AGGRESSION, layers: [4, 9], name: "Veillée funèbre",
        hazards: [lay(PILLAR, 2, 3), lay(PILLAR, 4, 3)],
        description: "Un spirite et un martyr ne veulent pas de visiteurs.",
        kits: [SPIRITIST_KIT, MARTYR_KIT],
    }),
    designed({
        category: BATTLE, layers: [0, 4], name: "Fantômes de la crypte",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(ROCK_BLOCK, 5, 3),
            lay(BUSH, 3, 4),
        ],
        description: "Deux fantômes qui traversent tout, un fantôme hanteur qui les possède.",
        populate: stage => {
            put(stage, GHOST, 2, 1)
            put(stage, GHOST, 4, 1)
            put(stage, HAUNTING_GHOST, 3, 0)
            if(stage.level >= 2) put(stage, SKELETON_REAPER, 3, 1)
        },
    }),
    designed({
        category: BATTLE, layers: [0, 5], name: "Faucheurs des tombes",
        hazards: [
            lay(HOLE, 2, 3),
            lay(ROCK_BLOCK, 4, 3),
            lay(BUSH, 5, 4),
        ],
        description: "Un squelette faucheur au centre, un fantôme hanteur de chaque côté.",
        populate: stage => {
            put(stage, SKELETON_REAPER, 3, 1)
            put(stage, HAUNTING_GHOST, 2, 0)
            put(stage, HAUNTING_GHOST, 4, 0)
            if(stage.level >= 2) put(stage, GHOST, 3, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [3, 7], name: "La chasse du loup-garou",
        hazards: [
            lay(WALL, 2, 3),
            lay(WALL, 5, 3),
        ],
        description: "Un loup-garou qui chasse, des esprits vengeurs qui traquent le plus blessé.",
        populate: stage => {
            put(stage, WEREWOLF, 3, 1)
            put(stage, VENGEFUL_SPIRIT, 1, 1)
            put(stage, VENGEFUL_SPIRIT, 5, 1)
            put(stage, GHOST, 2, 0)
            put(stage, GHOST, 4, 0)
        },
    }),
    designed({
        category: BATTLE, layers: [6, 9], name: "Procession funèbre",
        hazards: [
            lay(ROCK_BLOCK, 1, 3),
            lay(HOLE, 3, 3),
            lay(ROCK_BLOCK, 5, 3),
        ],
        description: "Des faucheurs en tête, des fantômes hanteurs et un esprit vengeur à la suite.",
        populate: stage => {
            put(stage, SKELETON_REAPER, 2, 1)
            put(stage, SKELETON_REAPER, 4, 1)
            put(stage, HAUNTING_GHOST, 1, 0)
            put(stage, HAUNTING_GHOST, 5, 0)
            put(stage, VENGEFUL_SPIRIT, 3, 0)
            put(stage, WEREWOLF, 3, 1)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Cercle des esprits",
        hazards: [
            lay(HOLE, 1, 3),
            lay(HOLE, 5, 3),
            lay(PILLAR, 3, 4),
        ],
        description: "Quatre esprits vengeurs en cercle, un squelette faucheur au centre.",
        populate: stage => {
            for(const column of [1, 2, 4, 5]) put(stage, VENGEFUL_SPIRIT, column, 0)
            put(stage, SKELETON_REAPER, 3, 1)
            put(stage, HAUNTING_GHOST, 2, 1)
            put(stage, HAUNTING_GHOST, 4, 1)
        },
    }),
    designed({
        category: ELITE, layers: [4, 9], name: "Meute des morts",
        hazards: [
            lay(BUSH, 2, 3),
            lay(BUSH, 4, 3),
            lay(ROCK_BLOCK, 3, 4),
        ],
        description: "Deux loups-garous, des faucheurs, des fantômes qui hantent leurs alliés.",
        populate: stage => {
            put(stage, WEREWOLF, 2, 1)
            put(stage, WEREWOLF, 4, 1)
            put(stage, SKELETON_REAPER, 1, 1)
            put(stage, SKELETON_REAPER, 5, 1)
            put(stage, HAUNTING_GHOST, 2, 0)
            put(stage, HAUNTING_GHOST, 4, 0)
        },
    }),
    designed({
        category: BOSS, layers: [11, 11], name: "Le roi liche et son tombeau",
        hazards: [
            lay(HOLE, 3, 3),
            lay(PILLAR, 1, 3),
            lay(PILLAR, 5, 3),
        ],
        description: "Le roi liche au fond, des faucheurs pour garder son tombeau, des esprits autour.",
        populate: stage => {
            put(stage, LICH_KING, 3, 0)
            put(stage, SKELETON_REAPER, 2, 1)
            put(stage, SKELETON_REAPER, 4, 1)
            put(stage, VENGEFUL_SPIRIT, 1, 0)
            put(stage, VENGEFUL_SPIRIT, 5, 0)
            put(stage, HAUNTING_GHOST, 3, 1)
        },
    }),
]
