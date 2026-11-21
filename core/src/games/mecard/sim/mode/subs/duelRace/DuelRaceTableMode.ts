import { Rng } from "../../../base/Rng"
import type { FloorType } from "../../../floor/Floor"
import { upgradeFloorType } from "../../../floor/subs/UpgradeFloor"
import type { GameMode } from "../../GameMode"
import { RangeSetting } from "../../Setting"
import type { Setting, SettingValues } from "../../Setting"

import { DuelRaceManager } from "./DuelRaceManager"
import { DuelRaceOwner } from "./DuelRaceOwner"
import type { RaceTableBench } from "./DuelRaceOwner"
import { duelRules } from "./DuelRules"
import type { DuelRules } from "./DuelRules"
import { shrinking } from "./Matching"

export * from "./DuelRaceManager"
export * from "./DuelRaceOwner"

/** What a race of duels takes from its settings. */
interface Course {
    /** The rules of the race, the same on every client. */
    rules(values: SettingValues, rng: Rng): DuelRules

    /** The floor the players start on, none for the usual one. */
    floor(values: SettingValues): FloorType|null
}

/** How many players a camp holds at most: the setting of both races. */
const TEAM = new RangeSetting("equipe", "Équipe", 1, 4, 1, 2)

/**
 * A race of duels of a course: what differs among its kinds is where the players start, and where the duels
 * lie.
 */
function raceMode(
    id: string, title: string, description: string, settings: readonly Setting[], course: Course, bench: RaceTableBench,
): GameMode {
    return {
        id,
        title,
        description,
        settings,
        manager: values => new DuelRaceManager(course.rules(values, new Rng(Date.now()))),
        owner: (values, manager) => new DuelRaceOwner(
            course.rules(values, new Rng(Date.now())), course.floor(values), bench, manager,
        ),
    }
}

/** The race of duels on the usual floors, a row of the duels every so many rows. */
export function duelRaceTable(bench: RaceTableBench): GameMode {
    const settings = [
        new RangeSetting("vies", "Vies", 1, 10, 1, 6),
        new RangeSetting("arrivee", "Arrivée (s)", 30, 300, 30, 90),
        TEAM,
        new RangeSetting("frequence", "Duel tous les (rangs)", 2, 8, 1, 4),
    ]
    const course: Course = {
        rules: (values, rng) => duelRules(rng, {
            lives: Number(values.vies),
            arrivalMs: Number(values.arrivee) * 1000,
            teamSize: shrinking(Number(values.equipe)),
            duelEvery: Number(values.frequence),
        }),
        floor: () => null,
    }
    const description = "Course sur les étages : survivre aux duels qui jalonnent la route et arriver avant le temps."
    return raceMode("course-duels", "Course de duels", description, settings, course, bench)
}

/** The versus: the players upgrade on a map of their own, then meet in one row of duels. */
export function versusTable(bench: RaceTableBench): GameMode {
    const settings = [
        new RangeSetting("equipe", "Équipe", 1, 4, 1, 1),
        new RangeSetting("hauteur", "Hauteur de la carte", 2, 8, 1, 4),
    ]
    const course: Course = {
        rules: (values, rng) => duelRules(rng, {
            lives: 1,
            teamSize: shrinking(Number(values.equipe)),
            // No row of the duels in the middle of the map: the one at its end.
            duelEvery: 1_000,
            closing: true,
            // The map is the one floor of the workshop.
            floors: 1,
        }),
        floor: values => upgradeFloorType(Number(values.hauteur)),
    }
    const description = "Chacun améliore son équipe sur sa carte, puis tous s'affrontent dans une rangée de duels finale."
    return raceMode("versus", "Versus", description, settings, course, bench)
}
