/**
 * @packageDocumentation
 * The modes of a game played by several clients around a hub, each made of the bricks of the sync alone.
 * A {@link Versus} makes the players into camps and has the duels fought once, on a {@link DuelRound}, which
 * every player follows with a {@link DuelView}.
 */

export * from "./DuelMessage"
export * from "./DuelRound"
export * from "./DuelView"
export * from "./Matching"
export * from "./topics"
export * from "./duelRace/ArrivalWatch"
export * from "./duelRace/Contestant"
export * from "./duelRace/DuelLayers"
export * from "./duelRace/DuelOutcome"
export * from "./duelRace/DuelRaceGuest"
export * from "./duelRace/DuelRaceHost"
export * from "./duelRace/DuelRules"
export * from "./duelRace/LatePenalty"
export * from "./duelRace/LifeBook"
export * from "./duelRace/LifeMessage"
export * from "./duelRace/orders"
export * from "./duelRace/RaceEndMessage"
export * from "./duelRace/topics"
export * from "./players/DuelPlayer"
export * from "./players/DuelRacePlayer"
export * from "./players/HubPort"
export * from "./players/HubViews"
export * from "./players/LocalLink"
export * from "./players/Players"
export * from "./players/RemoteHub"
export * from "./players/RemotePlayer"
export * from "./players/VersusPlayer"
export * from "./versus/Versus"
export * from "./versus/VersusGuest"
