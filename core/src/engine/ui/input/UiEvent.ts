import type { UiAction } from "./UiAction"

/**
 * The type of an event a component receives, with the fields it fills:
 * - `pointer-move`, `pointer-down`, `pointer-up`: `x`, `y`, and `button` for a press or a release.
 * - `wheel`: `dx`, `dy`, in notches, `dy` growing toward the user, with `x`, `y`.
 * - `key-down`, `key-up`: `code`, the physical position of the key.
 * - `key-repeat`: `code`, a key held that the OS repeated, for the text fields.
 * - `text`: `text`, the characters typed, as the keyboard layout makes them.
 * - `action`: `action`, from the `ui` table.
 */
export type UiEventType =
    | "pointer-move" | "pointer-down" | "pointer-up" | "wheel"
    | "key-down" | "key-up" | "key-repeat" | "text"
    | "action"

/**
 * An event of the interface, routed to a component, then to its containers until one consumes it.
 *
 * @remarks
 * Consuming it consumes what it came from in the input frame, so the gameplay never sees it: a click on a
 * button never reaches the world.
 */
export interface UiEvent {
    readonly type: UiEventType

    /** The position of the pointer, in virtual pixels, in the coordinates of the component receiving it. */
    readonly x: number
    readonly y: number

    /** The position of the pointer, in virtual pixels of the texture, whatever component receives it. */
    readonly absoluteX: number
    readonly absoluteY: number

    /** The mouse button, -1 for an event that is not about one. */
    readonly button: number

    readonly dx: number
    readonly dy: number
    readonly code: string
    readonly text: string
    readonly action: UiAction|null

    /** Is a shift key held? */
    readonly shift: boolean

    /** Is a control key held, or the command key? */
    readonly control: boolean

    /** Has a component already handled it? */
    readonly consumed: boolean

    /** Mark it as handled, so it climbs no further and the gameplay does not see it. */
    consume(): void
}

/** An event the root routes, reused from one event to the next. */
export class RoutedEvent implements UiEvent {


    public type: UiEventType = "pointer-move"
    public x = 0
    public y = 0
    public button = -1
    public dx = 0
    public dy = 0
    public code = ""
    public text = ""
    public action: UiAction|null = null
    public shift = false
    public control = false
    public consumed = false

    /** What it came from, consumed with it. */
    public source: { consume(): void }|null = null

    /** The position of the pointer, in coordinates of the texture, from which `x` and `y` are computed. */
    public absoluteX = 0
    public absoluteY = 0


    public consume(): void {
        this.consumed = true
        this.source?.consume()
    }

    /** Make it a fresh event of a type, every field back to its default. */
    public reset(type: UiEventType, source: { consume(): void }|null): this {
        this.type = type
        this.source = source
        this.x = 0
        this.y = 0
        this.absoluteX = 0
        this.absoluteY = 0
        this.button = -1
        this.dx = 0
        this.dy = 0
        this.code = ""
        this.text = ""
        this.action = null
        this.consumed = false
        return this
    }
}
