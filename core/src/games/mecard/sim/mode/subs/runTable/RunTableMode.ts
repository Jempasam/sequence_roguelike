import type { GameMode } from "../../GameMode"
import { ChoiceSetting } from "../../Setting"
import type { SettingValues } from "../../Setting"

import { RunTableManager } from "./RunTableManager"
import { RunTableOwner } from "./RunTableOwner"
import type { ClientRuns } from "./TableOwner"
import { PLAYERS, seatModeOf } from "./tableSeats"

export * from "./RunTableManager"
export * from "./RunTableOwner"
export * from "./TableOwner"

/** The ways the places of a run are given to the clients. */
const PLACES = ["fixées", "aléatoires"] as const

/** What each client sets for itself when everyone chooses: the side it plays on. */
const SIDES = ["allié", "ennemi"] as const

/**
 * The run played by a table: what the clients are given to play is a setting, the heroes of the party of the
 * host, the enemies it fights, or what each client chooses for itself.
 */
export function runTableMode(clientRuns: ClientRuns): GameMode {
    const rulesOf = (values: SettingValues) => {
        const players = PLAYERS.find(each => each === values.joueurs) ?? PLAYERS[0]
        return {
            seatMode: seatModeOf(players), isRandom: values.places === "aléatoires", isSided: players === "au choix",
        }
    }
    return {
        id: "run",
        title: "Run",
        description: "Les clients jouent avec la partie de l'hôte : ses héros, ses ennemis, ou le camp qu'ils choisissent.",
        settings: [new ChoiceSetting("joueurs", "Joueurs", PLAYERS), new ChoiceSetting("places", "Places", PLACES)],
        // Read only when everyone chooses.
        participantSettings: [new ChoiceSetting("camp", "Camp", SIDES)],
        manager: () => new RunTableManager(),
        owner: values => new RunTableOwner(rulesOf(values), clientRuns),
    }
}
