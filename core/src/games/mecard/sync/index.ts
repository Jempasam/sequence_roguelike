/**
 * @packageDocumentation
 * A run played on a main client and watched by viewers, with no other coupling than the observers of what is
 * played. A {@link BattleBroadcaster} sends the battle at the start and at the end of each preparation, a
 * {@link BattleReceiver} loads it and plays the rounds itself, from the chains committed. A
 * {@link TravelBroadcaster} sends each move of the journey and the journey as it stands when a halt is left,
 * a {@link TravelReceiver} moves the party and loads it. A {@link RunBroadcaster} and a {@link RunReceiver}
 * do the same for the run, around the two others. They talk through a {@link SyncSender}
 * and a {@link SyncSource}, whatever carries them: {@link LocalSync} within the program, a network elsewhere,
 * each on its {@link SyncTopic} when they share one.
 *
 * Viewers may also play. A {@link RunHost} tells each client that came to play what it plays, following its
 * {@link Seats}, and a {@link RunGuest} hears it. A {@link BattleGuest} gives the host the plans of its units
 * once its client is ready, and a {@link BattleHost} commits them and tells when everyone is ready, which
 * only the client showing the battle turns into a round. They talk through a {@link SyncRoom} and a
 * {@link SyncLink}: {@link LocalRoom} within the program, a network elsewhere.
 */

export * from "./battle/BattleBroadcaster"
export * from "./battle/BattleGuest"
export * from "./battle/BattleHost"
export * from "./battle/BattleReceiver"
export * from "./SyncChannel"
export * from "./battle/BattleMessage"
export * from "./battle/PlanMessage"
export * from "./travel/TravelBroadcaster"
export * from "./travel/TravelMessage"
export * from "./travel/TravelReceiver"
export * from "./run/RunBroadcaster"
export * from "./run/RunGuest"
export * from "./run/RunHost"
export * from "./run/RunMessage"
export * from "./run/RunReceiver"
export * from "./run/RunSaver"
export * from "./run/SeatMessage"
export * from "./run/Seats"
