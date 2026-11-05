import type { GamepadState } from "../../platform"
import type { DeviceKind, Direction, InputEvent, PadControl, Side } from "./InputEvent"

/**
 * How far a trigger is pulled, or a stick pushed in a direction, before it counts as held, from 0 to 1.
 */
export const AXIS_PRESS_THRESHOLD = 0.5

/**
 * The radius of the dead zone of a stick, from 0 to 1. Inside it, the stick reads as centered, since a stick
 * at rest is never exactly at 0.
 */
export const STICK_DEADZONE = 0.2

/**
 * One physical input that is held or not: a key by its physical position, a mouse button, or a control of
 * a gamepad. Plain data, so it is saved as it is.
 *
 * @remarks
 * A gamepad binding names no gamepad: `pad("west")` is the west button of any gamepad of the table, so the
 * same bindings serve every player.
 */
export type Binding =
    | { readonly kind: "key", readonly code: string }
    | { readonly kind: "mouse", readonly button: number }
    | { readonly kind: "pad", readonly control: PadControl }

/**
 * One source of a 2D axis: four bindings, one per direction, or a stick. Plain data, like {@link Binding}.
 */
export type AxisBinding =
    | {
        readonly kind: "buttons",
        readonly up: Binding,
        readonly down: Binding,
        readonly left: Binding,
        readonly right: Binding,
    }
    | { readonly kind: "stick", readonly side: Side }

/** The key at a physical position, named as `KeyboardEvent.code` does: `"KeyW"`, `"ArrowUp"`, `"Space"`. */
export function key(code: string): Binding {
    return { kind: "key", code }
}

/** A mouse button: 0 left, 1 middle, 2 right, 3 back, 4 forward. */
export function mouse(button: number): Binding {
    return { kind: "mouse", button }
}

/** A control of a gamepad of the table: a button, a trigger, or a stick pushed in a direction. */
export function pad(control: PadControl): Binding {
    return { kind: "pad", control }
}

/** An axis driven by four bindings, one per direction. */
export function buttons(up: Binding, down: Binding, left: Binding, right: Binding): AxisBinding {
    return { kind: "buttons", up, down, left, right }
}

/** An axis driven by four keys, by physical position, in the order up, down, left, right. */
export function keys(up: string, down: string, left: string, right: string): AxisBinding {
    return buttons(key(up), key(down), key(left), key(right))
}

/** An axis driven by a stick. */
export function stick(side: Side): AxisBinding {
    return { kind: "stick", side }
}

/** The kind of device a binding reads. */
export function deviceKindOf(binding: Binding|AxisBinding): DeviceKind {
    switch(binding.kind){
        case "key": return "keyboard"
        case "mouse": return "mouse"
        case "pad": return "gamepad"
        case "stick": return "gamepad"
        case "buttons": return deviceKindOf(binding.up)
        default: throw new Error(`Unknown binding kind in ${JSON.stringify(binding)}.`)
    }
}

/** Is a press or a release event about the input of a binding? */
export function bindingMatches(binding: Binding, event: InputEvent): boolean {
    switch(binding.kind){
        case "key": return event.code === binding.code && (event.type === "key-down" || event.type === "key-up")
        case "mouse":
            return event.button === binding.button && (event.type === "pointer-down" || event.type === "pointer-up")
        case "pad": return event.control === binding.control
        default: return false
    }
}

/** The binding of what a press event pressed, none for an event that is not a press. */
export function bindingOf(event: InputEvent): Binding|null {
    switch(event.type){
        case "key-down": return key(event.code)
        case "pointer-down": return mouse(event.button)
        case "pad-down": return event.control ? pad(event.control) : null
        default: return null
    }
}

/** Are two bindings the same input? */
export function sameBinding(a: Binding, b: Binding): boolean {
    switch(a.kind){
        case "key": return b.kind === "key" && a.code === b.code
        case "mouse": return b.kind === "mouse" && a.button === b.button
        case "pad": return b.kind === "pad" && a.control === b.control
        default: return false
    }
}

/** Every control of a gamepad, buttons, triggers and stick directions. */
export const PAD_CONTROLS: readonly PadControl[] = [
    "south", "east", "west", "north", "l1", "r1", "l2", "r2", "select", "start", "l3", "r3",
    "up", "down", "left", "right",
    "leftStickUp", "leftStickDown", "leftStickLeft", "leftStickRight",
    "rightStickUp", "rightStickDown", "rightStickLeft", "rightStickRight",
]

/** Is a value a well formed {@link Binding}, as read back from a save? */
export function isBinding(value: unknown): value is Binding {
    if(typeof value !== "object" || value === null || !("kind" in value)) return false
    switch(value.kind){
        case "key": return "code" in value && typeof value.code === "string"
        case "mouse": return "button" in value && Number.isInteger(value.button)
        case "pad": return "control" in value && PAD_CONTROLS.some(control => control === value.control)
        default: return false
    }
}

/** Is a value a well formed {@link AxisBinding}, as read back from a save? */
export function isAxisBinding(value: unknown): value is AxisBinding {
    if(typeof value !== "object" || value === null || !("kind" in value)) return false
    switch(value.kind){
        case "stick": return "side" in value && (value.side === "left" || value.side === "right")
        case "buttons":
            return "up" in value && isBinding(value.up) && "down" in value && isBinding(value.down)
                && "left" in value && isBinding(value.left) && "right" in value && isBinding(value.right)
        default: return false
    }
}

/** Is a control held in a state of a gamepad? */
export function isControlHeld(state: GamepadState, control: PadControl): boolean {
    switch(control){
        case "l2": return state.axes.l2 > AXIS_PRESS_THRESHOLD
        case "r2": return state.axes.r2 > AXIS_PRESS_THRESHOLD
        case "leftStickUp": return isPushed(state.axes.leftY, "up")
        case "leftStickDown": return isPushed(state.axes.leftY, "down")
        case "leftStickLeft": return isPushed(state.axes.leftX, "left")
        case "leftStickRight": return isPushed(state.axes.leftX, "right")
        case "rightStickUp": return isPushed(state.axes.rightY, "up")
        case "rightStickDown": return isPushed(state.axes.rightY, "down")
        case "rightStickLeft": return isPushed(state.axes.rightX, "left")
        case "rightStickRight": return isPushed(state.axes.rightX, "right")
        default: return state.buttons[control]
    }
}

/** Is a stick out of its dead zone? */
export function isStickOut(state: GamepadState, side: Side): boolean {
    const { axes } = state
    const length = side === "left" ? Math.hypot(axes.leftX, axes.leftY) : Math.hypot(axes.rightX, axes.rightY)
    return length > STICK_DEADZONE
}

/** Is one axis of a stick pushed past the threshold in a direction? */
function isPushed(value: number, direction: Direction): boolean {
    const toward = direction === "up" || direction === "left" ? -value : value
    return toward > AXIS_PRESS_THRESHOLD
}
