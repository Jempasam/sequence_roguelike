import { signal } from "../../faults"
import type { LobbyMode, ModeRun } from "../LobbyMode"
import { ChoiceSetting, RangeSetting } from "../Setting"

/**
 * A mode that plays nothing: it only holds the lobby locked until it is stopped, so the lobby can be tried,
 * from its settings to its start, with no game to play.
 */
export const TEST_MODE: LobbyMode = {
    id: "test",
    title: "Test",
    settings: [
        new ChoiceSetting("ambiance", "Ambiance", ["calme", "agitée"]),
        new RangeSetting("joueurs", "Joueurs", 1, 8, 1, 4),
    ],
    host: () => idle(),
    guest: () => idle(),
}

function idle(): ModeRun {
    return { ended: signal(), dispose: () => {} }
}
