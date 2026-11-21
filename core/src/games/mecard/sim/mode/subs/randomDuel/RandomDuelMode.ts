import type { GameMode } from "../../GameMode"
import type { DuelBench } from "../duel/DuelClient"

import { RandomDuelManager } from "./RandomDuelManager"
import { RandomDuelOwner } from "./RandomDuelOwner"

export type { DuelBench } from "../duel/DuelClient"
export { RANDOM_DUEL_LOOK_MS, RANDOM_DUEL_PAUSE_MS, teamUnits } from "./RandomDuelManager"

/** The mode of the random duels. */
export function randomDuelMode(bench: DuelBench): GameMode {
    return {
        id: "duel-aleatoire",
        title: "Duel aléatoire",
        description: "Un duel rapide, chacun avec une équipe tirée au hasard.",
        settings: [],
        manager: () => new RandomDuelManager(),
        owner: () => new RandomDuelOwner(bench),
    }
}
