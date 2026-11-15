import { rgba } from "../base/Rgba"
import { visual } from "../base/Visual"
import { GREAT_COLOR } from "../halt/subs/halt_common"

import type { FightType } from "./FightType"
import { StandardFight } from "./StandardFight"

/** An ordinary fight. */
export const BATTLE: FightType = {
    id: "battle",
    name: "Combat",
    description: "Des monstres. Une halte de récompense si tu gagnes.",
    icon: visual("halts/fight", { letter: "C" }),
    transition: visual("cave"),
    createFight: (run, place) => new StandardFight(BATTLE, run, place.monsters),
}

/** A harder fight. */
export const ELITE: FightType = {
    id: "elite",
    name: "Élite",
    description: "Des monstres plus nombreux. Une meilleure récompense.",
    icon: visual("halts/fight", { letter: "É" }),
    glow: GREAT_COLOR,
    transition: visual("cave", { coloration: [0.8, 0.1, 0.15] }),
    createFight: (run, place) => new StandardFight(ELITE, run, place.monsters),
}

/** The fight against the guardian of a floor. */
export const BOSS: FightType = {
    id: "boss",
    name: "Boss",
    description: "Le gardien de l'étage. Le vaincre ouvre ses sorties.",
    icon: visual("halts/deadly-fight", { letter: "B" }),
    glow: rgba(1, 0.15, 0.15),
    transition: visual("great-door"),
    createFight: (run, place) => new StandardFight(BOSS, run, place.monsters),
}

/** The sorts of fight. */
export const ALL_FIGHTS: readonly FightType[] = [BATTLE, ELITE, BOSS]

/**
 * The sort of fight with an id.
 *
 * @throws {@link Error} When there is none.
 */
export function fightById(id: string): FightType {
    const type = ALL_FIGHTS.find(each => each.id === id)
    if(!type) throw new Error(`The catalog has no fight "${id}".`)
    return type
}
