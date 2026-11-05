/**
 * The raw input of the window, normalized by the adapter: the events of the keyboard and the mouse in
 * order, and the state of each gamepad, read when asked.
 *
 * @remarks
 * Gamepads are a state, not events, since the web Gamepad API gives nothing else. Core deduces their
 * presses and releases from one frame to the next, so that is written once, not in each adapter.
 */
export interface InputPort {
    /** The events since the last call, in order, in an array the port reuses. */
    poll(): readonly RawInputEvent[]

    /** The state of each connected gamepad, read now, in the standard layout. */
    gamepads(): readonly GamepadState[]

    /** The name of a key in the current keyboard layout, `"Z"` for `"KeyW"` in AZERTY, none if unknown. */
    keyLabel(code: string): string|null
}

/**
 * An event of the keyboard, the mouse or the window, as the adapter reads it.
 *
 * - `pointer-move`: the pointer is at `x`, `y`, in physical pixels from the top left of the drawing surface.
 * - `pointer-down`, `pointer-up`: a mouse `button` (0 left, 1 middle, 2 right, 3 back, 4 forward) changed,
 *   the pointer being at `x`, `y`.
 * - `wheel`: the wheel turned by `dx`, `dy`, in notches, `dy` growing toward the user.
 * - `key-down`, `key-up`: the key at the physical position `code` (`"KeyW"`, `"ArrowUp"`, the names of
 *   `KeyboardEvent.code`) changed.
 * - `key-repeat`: the OS repeated the key at `code`, held down, as it repeats the characters typed. Only
 *   the text fields read it: an action is pressed once, whatever the OS does.
 * - `text`: characters were typed, as the keyboard layout makes them.
 * - `focus-lost`: the window lost the focus, so the releases that follow may never arrive.
 */
export type RawInputEvent =
    | { readonly type: "pointer-move", readonly x: number, readonly y: number }
    | { readonly type: "pointer-down"|"pointer-up", readonly button: number, readonly x: number, readonly y: number }
    | { readonly type: "wheel", readonly dx: number, readonly dy: number }
    | { readonly type: "key-down"|"key-up"|"key-repeat", readonly code: string }
    | { readonly type: "text", readonly text: string }
    | { readonly type: "focus-lost" }

/**
 * A digital button of a gamepad, named by its place in the standard layout: the four face buttons by
 * compass point, the shoulders, the small buttons in the middle, the stick clicks and the cross.
 */
export type GamepadButton =
    | "south" | "east" | "west" | "north"
    | "l1" | "r1"
    | "select" | "start"
    | "l3" | "r3"
    | "up" | "down" | "left" | "right"

/**
 * An analog value of a gamepad: each stick on two axes, from -1 to 1, `x` growing to the right and `y`
 * downward, and each trigger from 0, released, to 1, pulled all the way.
 */
export type GamepadAxis = "leftX" | "leftY" | "rightX" | "rightY" | "l2" | "r2"

/** Every digital button of the standard layout. */
export const GAMEPAD_BUTTONS: readonly GamepadButton[] = [
    "south", "east", "west", "north", "l1", "r1", "select", "start", "l3", "r3", "up", "down", "left", "right",
]

/** The state of one gamepad, in the standard layout. */
export interface GamepadState {
    /**
     * The identifier of the gamepad, stable while it stays plugged in: its index on the web, the instance
     * id of the controller in SDL. Plugged in again, it may come back with another one.
     */
    readonly id: number

    /** Is each button held? */
    readonly buttons: Readonly<Record<GamepadButton, boolean>>

    /** The value of each axis. */
    readonly axes: Readonly<Record<GamepadAxis, number>>
}
