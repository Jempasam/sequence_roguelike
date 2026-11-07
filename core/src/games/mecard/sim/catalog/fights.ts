import { CAVE_TRANSITION } from "../halt/transitions"
import type { FightType } from "../run/PlaceType"

/** An ordinary fight. */
export const BATTLE: FightType = {
    id: "battle",
    name: "Combat",
    description: "Des monstres. Une récompense et de l'or si tu gagnes.",
    code: "C",
    icon: null,
    transition: CAVE_TRANSITION,
    gold: 15,
}

/** A harder fight, paying better. */
export const ELITE: FightType = {
    id: "elite",
    name: "Élite",
    description: "Des monstres plus nombreux. Une meilleure récompense, plus d'or.",
    code: "É",
    icon: null,
    transition: CAVE_TRANSITION,
    gold: 35,
}

/** The fight against the guardian of a floor. */
export const BOSS: FightType = {
    id: "boss",
    name: "Boss",
    description: "Le gardien de l'étage. Le vaincre ouvre ses sorties.",
    code: "B",
    icon: null,
    transition: CAVE_TRANSITION,
    gold: 80,
}

/** The sorts of fight. */
export const FIGHTS: readonly FightType[] = [BATTLE, ELITE, BOSS]
