import type { GameMode } from "../../GameMode"
import { RangeSetting } from "../../Setting"
import type { SettingValues } from "../../Setting"
import type { RaceTableBench } from "../duelRace/DuelRaceOwner"

import { MonsterBuilderManager } from "./MonsterBuilderManager"
import type { BuilderRules } from "./MonsterBuilderManager"
import { heroRules, MonsterBuilderOwner, necroRules } from "./MonsterBuilderOwner"

export * from "./DuelConversion"
export * from "./MonsterBuilderManager"
export * from "./MonsterBuilderOwner"
export * from "./NecroSetup"

/** How long a player has to give its team for a duel, in milliseconds. */
const TEAM_TIMEOUT_MS = 10_000

/** What the settings say, as the rules of the manager. */
function rulesOf(values: SettingValues): BuilderRules {
    return {
        heroes: Number(values.heros),
        lives: Number(values.vies),
        floors: Number(values.etages),
        teamTimeoutMs: TEAM_TIMEOUT_MS,
    }
}

/**
 * The monster builder: some players are heroes and go through the floors, every fight a duel; the others are
 * necromancers, who raise monsters and order their decks on a map of their own, and fight the heroes that
 * reach the halts of the duels.
 */
export function monsterBuilderMode(bench: RaceTableBench): GameMode {
    return {
        id: "constructeur-monstres",
        title: "Constructeur de monstres",
        description: "Des héros traversent les étages, chaque combat est un duel contre un nécromancien : les autres joueurs, qui bâtissent leurs monstres pour les arrêter.",
        settings: [
            new RangeSetting("heros", "Héros", 1, 7, 1, 1),
            new RangeSetting("vies", "Vies des héros", 1, 10, 1, 3),
            new RangeSetting("etages", "Étages à franchir", 1, 12, 1, 3),
        ],
        manager: values => new MonsterBuilderManager(rulesOf(values)),
        owner: (values, manager) => {
            const rules = rulesOf(values)
            return new MonsterBuilderOwner(heroRules(rules), necroRules(rules), bench, manager)
        },
    }
}
