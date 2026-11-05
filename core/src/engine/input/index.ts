/**
 * @packageDocumentation
 * The input of the game, shared by the UI and the gameplay. The {@link InputSystem} reads the port once per
 * frame into an {@link InputFrame}: the events in order, each from its {@link Device}, the state of every
 * device and the one used last. An {@link ActionMap} turns what nobody consumed into actions named by the
 * game, through {@link Binding}s the player can change, sampled once per tick of the simulation, or read
 * as {@link ActionOccurrence}s that repeat while held, to navigate.
 */

export * from "./ActionMap"
export {
    AXIS_PRESS_THRESHOLD, buttons, deviceKindOf, isAxisBinding, isBinding, key, keys, mouse, PAD_CONTROLS,
    pad, sameBinding, stick, STICK_DEADZONE,
} from "./Binding"
export type { AxisBinding, Binding } from "./Binding"
export * from "./InputEvent"
export type { InputFrame } from "./InputFrame"
export * from "./InputSystem"
export { REPEAT_DELAY, REPEAT_INTERVAL } from "./Repeat"
export type { ActionOccurrence } from "./Repeat"
