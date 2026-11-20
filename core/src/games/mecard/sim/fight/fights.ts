import { rgba } from "../base/Rgba"
import { visual } from "../base/Visual"
import { GREAT_COLOR } from "../halt/subs/halt_common"

import type { FightCategory } from "./FightCategory"
import { fightType } from "./FightType"

/** An ordinary fight. */
export const BATTLE: FightCategory = {
    id: "battle",
    name: "Combat",
    description: "Des monstres. Une halte de récompense si tu gagnes.",
    icon: visual("halts/fight", { letter: "C" }),
    transition: visual("cave"),
}

/** A harder fight. */
export const ELITE: FightCategory = {
    id: "elite",
    name: "Élite",
    description: "Des monstres plus nombreux. Une meilleure récompense.",
    icon: visual("halts/fight", { letter: "É" }),
    glow: GREAT_COLOR,
    transition: visual("cave", { coloration: [0.8, 0.1, 0.15] }),
}

/** A fight against adventurers, who fight with the cards of a kit and are played by the best AI. */
export const AGGRESSION: FightCategory = {
    id: "aggression",
    name: "Agression",
    description: "Des aventuriers t'attaquent, joués par la meilleure IA. Une halte de récompense si tu gagnes.",
    icon: visual("halts/fight", { letter: "A" }),
    glow: rgba(1, 0.6, 0.15),
    transition: visual("cave", { coloration: [0.9, 0.5, 0.1] }),
}

/**
 * A fight against adventurers as {@link AGGRESSION} is, but whose chains the party does not see: only their hands,
 * until the round plays. Every fight of that one is also fought this way.
 */
export const AMBUSH: FightCategory = {
    id: "ambush",
    name: "Embuscade",
    description: "Des aventuriers t'attaquent, joués par la meilleure IA : tu vois leur main, mais pas leur chaîne. Une halte de récompense si tu gagnes.",
    icon: AGGRESSION.icon,
    glow: rgba(1, 0.15, 0.15),
    transition: visual("cave", { coloration: [0.9, 0.15, 0.15] }),
}

/** The fight against the guardian of a floor. */
export const BOSS: FightCategory = {
    id: "boss",
    name: "Boss",
    description: "Le gardien de l'étage. Le vaincre ouvre ses sorties.",
    icon: visual("halts/deadly-fight", { letter: "B" }),
    glow: rgba(1, 0.15, 0.15),
    transition: visual("great-door"),
}

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
    description: "Aucun monstre.",
    icon: BATTLE.icon,
    category: BATTLE,
    populate: () => {},
})
