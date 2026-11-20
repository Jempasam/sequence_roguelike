import { SyncTopic } from "../../SyncChannel"

/** What each player tells the hub of where it stands on its journey, which the hub tells everyone. */
export const PROGRESS_TOPIC = new SyncTopic("progress")

/** The hub telling everyone the lives each player has left. */
export const LIVES_TOPIC = new SyncTopic("lives")

/** The hub telling a player that it is late: it is sent to the halt of the duels. */
export const KICK_TOPIC = new SyncTopic("kick")

/** The hub telling a player that the duels are over: it may go on with its journey. */
export const RESUME_TOPIC = new SyncTopic("resume")

/** The hub telling everyone that the race is over, and who won it, none when nobody did. */
export const RACE_END_TOPIC = new SyncTopic("race-end")
