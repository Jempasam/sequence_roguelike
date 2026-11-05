import type { GamepadButton } from "../../platform"

/** The kind of a device. The keyboard and the mouse are apart, since the focus indicator separates them. */
export type DeviceKind = "keyboard" | "mouse" | "gamepad"

/**
 * One device the input comes from. Two devices are the same when their kind and identifier are: see
 * {@link sameDevice}.
 *
 * @remarks
 * Neither the web nor SDL 2 tell which keyboard or which mouse an event comes from, so there is only one of
 * each, with the identifier 0. The keyboard carries an identifier anyway, so a platform that can tell them
 * apart only has to give more of them.
 */
export interface Device {
    readonly kind: DeviceKind

    /** The identifier of the device within its kind: the one of a gamepad, 0 for the keyboard and mouse. */
    readonly id: number
}

/** The keyboard, every keyboard plugged in counting as this one. */
export const KEYBOARD: Device = { kind: "keyboard", id: 0 }

/** The mouse, every mouse plugged in counting as this one. */
export const MOUSE: Device = { kind: "mouse", id: 0 }

/** The gamepad of an identifier, as {@link GamepadState} gives it. */
export function gamepad(id: number): Device {
    return { kind: "gamepad", id }
}

/** Are both the same device? */
export function sameDevice(a: Device, b: Device): boolean {
    return a.kind === b.kind && a.id === b.id
}

/** A side of a gamepad holding a stick and a trigger. */
export type Side = "left" | "right"

/** A direction a stick is pushed toward. */
export type Direction = "up" | "down" | "left" | "right"

/**
 * Something on a gamepad that is held or not: a digital button, a trigger pulled past
 * {@link AXIS_PRESS_THRESHOLD}, or a stick pushed past it in a direction (`"leftStickRight"`).
 */
export type PadControl = GamepadButton | "l2" | "r2" | `${Side}Stick${Capitalize<Direction>}`

/**
 * The type of an event of a frame, with the fields it fills.
 *
 * - `pointer-move`: `x`, `y`, the position of the pointer in physical pixels.
 * - `pointer-down`, `pointer-up`: `button`, with `x`, `y`.
 * - `wheel`: `dx`, `dy`, in notches, `dy` growing toward the user.
 * - `key-down`, `key-up`: `code`, the physical position of the key.
 * - `key-repeat`: `code`, a key held that the OS repeated. It is no press: no action sees it.
 * - `text`: `text`, the characters typed.
 * - `pad-down`, `pad-up`: `control`, what changed on the gamepad.
 * - `pad-stick`: `side`, the stick that just left its dead zone.
 * - `pad-connected`, `pad-disconnected`: nothing more than the device.
 * - `focus-lost`: nothing more. The releases of everything held come just before it.
 */
export type InputEventType =
    | "pointer-move" | "pointer-down" | "pointer-up" | "wheel"
    | "key-down" | "key-up" | "key-repeat" | "text"
    | "pad-down" | "pad-up" | "pad-stick" | "pad-connected" | "pad-disconnected"
    | "focus-lost"

/**
 * An event of a frame, normalized, with the mark of its consumption. The fields its type does not fill are
 * 0, empty or none.
 *
 * @remarks
 * One shape for every type, so the frame reuses the same objects from frame to frame and reading the input
 * allocates nothing. An event lives until the next frame begins.
 */
export interface InputEvent {
    readonly type: InputEventType

    /** The device the event comes from. `focus-lost` comes from the keyboard. */
    readonly device: Device

    readonly x: number
    readonly y: number
    readonly dx: number
    readonly dy: number

    /** The mouse button, -1 for an event that is not about one. */
    readonly button: number

    readonly code: string
    readonly text: string
    readonly control: PadControl|null
    readonly side: Side|null

    /** Has someone already handled it? The action tables do not see a consumed press. */
    readonly consumed: boolean

    /** Mark it as handled. Consuming it twice changes nothing. */
    consume(): void
}

/** Is an event a sign that the player uses its device: a press, a move of the mouse, a stick tilted? */
export function isDeviceUse(event: InputEvent): boolean {
    switch(event.type){
        case "pointer-move":
        case "pointer-down":
        case "wheel":
        case "key-down":
        case "pad-down":
        case "pad-stick":
            return true
        default:
            return false
    }
}

/** Is an event the press of something that can be bound to an action? */
export function isPress(event: InputEvent): boolean {
    return event.type === "key-down" || event.type === "pointer-down" || event.type === "pad-down"
}

/** Is an event the release of something that can be bound to an action? */
export function isRelease(event: InputEvent): boolean {
    return event.type === "key-up" || event.type === "pointer-up" || event.type === "pad-up"
}
