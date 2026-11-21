import { SyncTopic } from "../../../../sync/SyncChannel"

/** The hub telling a player which duel it fights, and with whom. */
export const DUEL_FIGHT_TOPIC = new SyncTopic("duel-fight")

/** The hub telling a player, a spectator, which duel it watches. */
export const DUEL_WATCH_TOPIC = new SyncTopic("duel-watch")

/** The battle of the duel of a number, as its broadcaster tells it. */
export function duelBattleTopic(number: number): SyncTopic {
    return new SyncTopic(`duel:battle:${number}`)
}

/** The plans the players of the duel of a number give the hub. */
export function duelPlanTopic(number: number): SyncTopic {
    return new SyncTopic(`duel:plan:${number}`)
}
