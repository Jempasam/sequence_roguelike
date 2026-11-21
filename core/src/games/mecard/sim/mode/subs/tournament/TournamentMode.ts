import type { GameMode } from "../../GameMode"
import type { HandleChannel } from "../../HandleChannel"
import { RangeSetting } from "../../Setting"
import type { Setting, SettingValues } from "../../Setting"

import { TournamentManager } from "./TournamentManager"
import type { TeamPhase } from "./TournamentManager"
import { TournamentOwner } from "./TournamentOwner"
import type { TeamPhaseClient, TournamentBench } from "./TournamentOwner"

export * from "./TournamentManager"
export * from "./TournamentOwner"

/** A kind of tournament: what tells it from the others is the phase of the teams, and what it asks to set. */
export interface TournamentKind {
    readonly id: string
    readonly title: string
    readonly description: string
    readonly settings: readonly Setting[]

    /** How many games a player wins to win its match. */
    games(values: SettingValues): number

    /** Where the teams come from, none for the same team for everyone. */
    phase?(values: SettingValues): TeamPhase

    /** What a client does for that phase. */
    client?(values: SettingValues, bench: TournamentBench): TeamPhaseClient
}

/** The mode of a kind of tournament. */
export function tournamentKind(bench: TournamentBench, kind: TournamentKind): GameMode {
    return {
        id: kind.id,
        title: kind.title,
        description: kind.description,
        settings: kind.settings,
        manager: values => new TournamentManager(kind.games(values), kind.phase?.(values) ?? null),
        owner: (values, manager: HandleChannel) => new TournamentOwner(
            bench, manager, kind.client?.(values, bench) ?? null,
        ),
    }
}

/** The mode of the tournaments by elimination. */
export function tournamentMode(bench: TournamentBench): GameMode {
    return tournamentKind(bench, {
        id: "tournoi",
        title: "Tournoi",
        description:
            "Un tournoi à élimination directe : des duels deux à deux, les vainqueurs se retrouvent, les éliminés regardent.",
        settings: [new RangeSetting("manches", "Manches à gagner par match", 1, 3, 1, 1)],
        games: values => Number(values.manches),
    })
}
