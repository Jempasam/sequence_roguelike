/**
 * @packageDocumentation
 * The usables of Dungeon of the Mecard, one file for each. A usable takes its numbers as
 * parameters: its file exports its class and the usable of the catalog made with them. A mechanism
 * shared by several is an abstract class, each saying only what differs: {@link RoundElixir} for what lasts
 * the round, {@link ThrownFlask} for what is thrown at the nearest enemy.
 */

export * from "./AbstractUsable"
export * from "./elixir/HasteElixir"
export * from "./elixir/RoundElixir"
export * from "./elixir/StrengthElixir"
export * from "./flask/FireFlask"
export * from "./flask/GlueFlask"
export * from "./flask/ThrownFlask"
export * from "./hand/CardBottle"
export * from "./hand/Energizer"
export * from "./hand/Mixer"
export * from "./hand/PlantBag"
export * from "./HealingPotion"
export * from "./HeartFlask"
