import { GAMEPAD_BUTTONS } from "@game/core"
import type { GamepadAxis, GamepadButton, GamepadState, InputPort, RawInputEvent } from "@game/core"

/**
 * An input port the test drives: the events it queues come out at the next poll, and the gamepads it
 * plugs in stay in the state it sets until unplugged.
 */
export class FakeInput implements InputPort {


    /** The name of each key, as a layout would give it. */
    public readonly labels = new Map<string, string>()

    public poll(): readonly RawInputEvent[] {
        const events = this.#queued
        this.#queued = []
        return events
    }

    public gamepads(): readonly GamepadState[] {
        return [...this.#pads.values()]
    }

    public keyLabel(code: string): string|null {
        return this.labels.get(code) ?? null
    }

    /** Queue events for the next poll. */
    public send(...events: RawInputEvent[]): this {
        this.#queued.push(...events)
        return this
    }

    public keyDown(code: string): this { return this.send({ type: "key-down", code }) }

    public keyUp(code: string): this { return this.send({ type: "key-up", code }) }

    public mouseDown(button: number): this { return this.send({ type: "pointer-down", button, x: 0, y: 0 }) }

    public mouseUp(button: number): this { return this.send({ type: "pointer-up", button, x: 0, y: 0 }) }

    /** Plug in a gamepad, or change the state of one plugged in, with everything else at rest. */
    public setPad(
        id: number,
        held: readonly GamepadButton[] = [],
        axes: Partial<Record<GamepadAxis, number>> = {},
    ): this {
        const buttons = {} as Record<GamepadButton, boolean>
        for(const button of GAMEPAD_BUTTONS) buttons[button] = held.includes(button)
        const rest = { leftX: 0, leftY: 0, rightX: 0, rightY: 0, l2: 0, r2: 0 }
        this.#pads.set(id, { id, buttons, axes: { ...rest, ...axes } })
        return this
    }

    public unplug(id: number): this {
        this.#pads.delete(id)
        return this
    }


    #queued: RawInputEvent[] = []
    readonly #pads = new Map<number, GamepadState>()
}
