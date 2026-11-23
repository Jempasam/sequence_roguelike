import { ADVENTURER, FLOOR, MONSTER } from "../base/keywords"
import { rgba } from "../base/Rgba"
import { visual } from "../base/Visual"
import { GREAT_COLOR } from "../halt/subs/halt_common"

import { fightCategory } from "./FightCategory"
import type { FightCategory } from "./FightCategory"
import { fightType } from "./FightType"

/** An ordinary fight. */
export const BATTLE = fightCategory({
    id: "battle",
    name: "Combat",
    description: ["Des ", MONSTER.as("monstres"), "."],
    icon: visual("halts/fight", { letter: "C" }),
    transition: visual("cave"),
})

/** A harder fight. */
export const ELITE = fightCategory({
    id: "elite",
    name: "Élite",
    description: ["Des ", MONSTER.as("monstres"), " plus nombreux qu'en ", BATTLE, "."],
    icon: visual("halts/fight", { letter: "É" }),
    glow: GREAT_COLOR,
    transition: visual("cave", { coloration: [0.8, 0.1, 0.15] }),
})

/** A fight against adventurers, who fight with the cards of a kit and are played by the best AI. */
export const AGGRESSION = fightCategory({
    id: "aggression",
    name: "Agression",
    description: ["Des ", ADVENTURER.as("aventuriers"), " t'attaquent, joués par la meilleure IA."],
    icon: visual("halts/fight", { letter: "A" }),
    glow: rgba(1, 0.6, 0.15),
    transition: visual("cave", { coloration: [0.9, 0.5, 0.1] }),
})

/**
 * A fight against adventurers as {@link AGGRESSION} is, but whose chains the party does not see: only their hands,
 * until the round plays. Every fight of that one is also fought this way.
 */
export const AMBUSH = fightCategory({
    id: "ambush",
    name: "Embuscade",
    description: ["Comme une ", AGGRESSION, " : tu vois la main des ", ADVENTURER.as("aventuriers"), ", mais pas leur chaîne."],
    icon: AGGRESSION.icon,
    glow: rgba(1, 0.15, 0.15),
    transition: visual("cave", { coloration: [0.9, 0.15, 0.15] }),
})

/** The fight against the guardian of a floor. */
export const BOSS = fightCategory({
    id: "boss",
    name: "Boss",
    description: ["Le gardien de l'", FLOOR, ". Le vaincre ouvre ses sorties."],
    icon: visual("halts/deadly-fight", { letter: "B" }),
    glow: rgba(1, 0.15, 0.15),
    transition: visual("great-door"),
})

/** The sorts of fight. */
export const ALL_FIGHT_CATEGORIES: readonly FightCategory[] = [BATTLE, ELITE, AGGRESSION, AMBUSH, BOSS]

/**
 * The sort of fight with an id.
 *
 * @throws {@link Error} When there is none.
 */
export function fightCategoryById(id: string): FightCategory {
    const type = ALL_FIGHT_CATEGORIES.find(each => each.id === id)
    if(!type) throw new Error(`The catalog has no fight "${id}".`)
    return type
}

/** A fight with no monster, to stand in where a battle is to be made and no place holds a fight. */
export const EMPTY_FIGHT = fightType({
    id: "empty",
    name: "Combat vide",
    description: ["Aucun ", MONSTER, "."],
    icon: BATTLE.icon,
    category: BATTLE,
    populate: () => {},
})
