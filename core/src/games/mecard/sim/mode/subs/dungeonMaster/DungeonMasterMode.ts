import type { GameMode } from "../../GameMode"
import { RangeSetting } from "../../Setting"

import { DungeonMasterManager } from "./DungeonMasterManager"
import { DungeonMasterOwner } from "./DungeonMasterOwner"
import type { MasterBench } from "./DungeonMasterOwner"

export * from "./DungeonMasterManager"
export * from "./DungeonMasterOwner"

/** The mode of the games of a master against heroes. */
export function dungeonMasterMode(bench: MasterBench): GameMode {
    return {
        id: "maitre-du-donjon",
        title: "Maître du donjon",
        description:
            "Un joueur est le maître : il choisit les monstres de chaque rencontre, avec un budget de menace, contre les autres.",
        settings: [
            new RangeSetting("rencontres", "Rencontres à gagner", 1, 6, 1, 3),
            new RangeSetting("budget", "Menace de la première rencontre", 4, 30, 1, 10),
            new RangeSetting("croissance", "Menace en plus par rencontre", 0, 10, 1, 3),
            new RangeSetting("delai", "Secondes par monstre", 5, 60, 5, 20),
        ],
        manager: values => new DungeonMasterManager({
            encounters: Number(values.rencontres),
            budget: Number(values.budget),
            growth: Number(values.croissance),
            seconds: Number(values.delai),
        }),
        owner: () => new DungeonMasterOwner(bench),
    }
}
