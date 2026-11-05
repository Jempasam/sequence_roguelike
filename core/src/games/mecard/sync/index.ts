/**
 * @packageDocumentation
 * A run played on a main client and watched by viewers, with no other coupling than the observers of what is
 * played. A {@link BattleBroadcaster} sends the battle at the start and at the end of each preparation, a
 * {@link BattleReceiver} loads it and plays the rounds itself, from the chains committed. A
 * {@link TravelBroadcaster} sends each move of the journey and the run as it stands when a halt or a fight
 * is left, a {@link TravelReceiver} moves the party and loads the run. They talk through a {@link SyncSender}
 * and a {@link SyncSource}, whatever carries them: {@link LocalSync} within the program, a network elsewhere,
 * each on its {@link SyncTopic} when they share one.
 */

export * from "./BattleBroadcaster"
export * from "./BattleReceiver"
export * from "./SyncChannel"
export * from "./SyncMessage"
export * from "./TravelBroadcaster"
export * from "./TravelMessage"
export * from "./TravelReceiver"
