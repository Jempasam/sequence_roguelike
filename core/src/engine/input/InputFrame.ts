import type { GamepadState } from "../../platform"
import type { Device, InputEvent, InputEventType, PadControl, Side } from "./InputEvent"

/**
 * The input of one frame: its events in order, the state of each device, and the device used last.
 *
 * @remarks
 * The state is the raw one: a key is held from its press to its release, whoever consumed the press. The
 * action tables, not the frame, apply the rules of consumption.
 */
export interface InputFrame {
    /** The events of the frame, in order: those of the port, then those deduced from the gamepads. */
    readonly events: readonly InputEvent[]

    /** The time of the frame, in seconds since the input system began. */
    readonly time: number

    /** The device that was used last, none before the first use. */
    readonly lastDevice: Device|null

    /** The position of the pointer, in physical pixels from the top left of the drawing surface. */
    readonly pointerX: number
    readonly pointerY: number

    /** The state of each connected gamepad, as read at the start of the frame. */
    readonly gamepads: readonly GamepadState[]

    /** Is the key at a physical position held? */
    isKeyHeld(code: string): boolean

    /** Is a mouse button held? */
    isMouseHeld(button: number): boolean

    /** Is a control of a gamepad held? False for a gamepad that is not connected. */
    isPadHeld(id: number, control: PadControl): boolean

    /** Mark an event as handled, so the action tables read after this point do not see it. */
    consume(event: InputEvent): void
}

/** An event of the frame, reused from frame to frame. */
class FrameEvent implements InputEvent {


    public type: InputEventType = "focus-lost"
    public device: Device

    public x = 0
    public y = 0
    public dx = 0
    public dy = 0
    public button = -1
    public code = ""
    public text = ""
    public control: PadControl|null = null
    public side: Side|null = null
    public consumed = false

    constructor(device: Device){
        this.device = device
    }


    public consume(): void {
        this.consumed = true
    }

    /** Make it a fresh event of a type, every field back to its default. */
    public reset(type: InputEventType, device: Device): this {
        this.type = type
        this.device = device
        this.x = 0
        this.y = 0
        this.dx = 0
        this.dy = 0
        this.button = -1
        this.code = ""
        this.text = ""
        this.control = null
        this.side = null
        this.consumed = false
        return this
    }
}

/** What the frame knows of one connected gamepad. */
export interface PadTrack {
    readonly device: Device

    /** The state the port gave for it at the start of the frame. */
    state: GamepadState

    /** The controls held, as deduced from that state. */
    readonly held: Set<PadControl>

    /** Is each stick out of its dead zone? */
    readonly sticksOut: Record<Side, boolean>

    /** The frame it was last seen in, so the gamepads missing from the port are found. */
    seenAt: number
}

/**
 * The {@link InputFrame} the input system builds. Only the system holds it under this type: everyone else
 * reads it as an {@link InputFrame}.
 */
export class MutableInputFrame implements InputFrame {


    public time = 0
    public lastDevice: Device|null = null
    public pointerX = 0
    public pointerY = 0
    public gamepads: readonly GamepadState[] = []

    /** The keys held, by physical position. */
    public readonly keys = new Set<string>()

    /** The mouse buttons held. */
    public readonly mouseButtons = new Set<number>()

    /** What is known of each connected gamepad, by identifier. */
    public readonly pads = new Map<number, PadTrack>()


    public get events(): readonly InputEvent[] { return this.#events }

    public isKeyHeld(code: string): boolean {
        return this.keys.has(code)
    }

    public isMouseHeld(button: number): boolean {
        return this.mouseButtons.has(button)
    }

    public isPadHeld(id: number, control: PadControl): boolean {
        return this.pads.get(id)?.held.has(control) ?? false
    }

    public consume(event: InputEvent): void {
        event.consume()
    }

    /** Begin the next frame, with no event yet. */
    public begin(dt: number): void {
        this.time += dt
        this.#events.length = 0
    }

    /** Add an event to the frame, every field but its type and device to fill. */
    public add(type: InputEventType, device: Device): FrameEvent {
        const index = this.#events.length
        // The pool only grows, so after the busiest frame so far, adding allocates nothing.
        if(index === this.#pool.length) this.#pool.push(new FrameEvent(device))
        const event = this.#pool[index].reset(type, device)
        this.#events.push(event)
        return event
    }


    /** The events of the frame, all taken from the pool. */
    readonly #events: FrameEvent[] = []

    /** Every event object made so far. */
    readonly #pool: FrameEvent[] = []
}
