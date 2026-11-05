import type { GamepadState, InputPort, RawInputEvent } from "../../platform"
import { bindingOf, isControlHeld, isStickOut, PAD_CONTROLS } from "./Binding"
import type { Binding } from "./Binding"
import { gamepad, isDeviceUse, isPress, KEYBOARD, MOUSE } from "./InputEvent"
import type { Side } from "./InputEvent"
import { MutableInputFrame } from "./InputFrame"
import type { InputFrame, PadTrack } from "./InputFrame"

/** The key that cancels a capture, and so cannot be captured. */
const CANCEL_CAPTURE_CODE = "Escape"

/** Both sticks of a gamepad. */
const SIDES: readonly Side[] = ["left", "right"]

/**
 * Reads the input port once per frame and makes an {@link InputFrame} of it, for the UI and then the action
 * tables.
 *
 * @remarks
 * Built by the game and handed to whoever needs it, never a singleton: a host and a client can run in the
 * same process. The gamepads come as a state, so the presses and releases are deduced here, by comparing
 * the state with the one of the frame before.
 */
export class InputSystem {


    constructor(
        /** The raw input of the window. */
        public readonly port: InputPort,
    ){}


    /** The frame being handled, the empty one before the first {@link InputSystem.beginFrame}. */
    public get frame(): InputFrame { return this.#frame }

    /**
     * Read the port and build the frame that follows: the events in order, then the presses and releases of
     * the gamepads, then the frame handed to a pending capture.
     *
     * @param dt - The time since the frame before, in seconds.
     */
    public beginFrame(dt: number): InputFrame {
        this.#frameCount++
        this.#frame.begin(dt)
        this.#frame.gamepads = this.port.gamepads()
        for(const raw of this.port.poll()) this.#read(raw)
        this.#readGamepads()
        this.#updateLastDevice()
        this.#settleCapture()
        return this.#frame
    }

    /**
     * Take the next press, of any device, for a new binding. It is consumed before the UI sees it, so the
     * screen that asked does not take `enter` as `accept`.
     *
     * @returns The binding of the press, none when `escape` cancelled it or {@link InputSystem.cancelCapture}
     * was called.
     * @throws {@link Error} When a capture is already pending.
     */
    public capture(): Promise<Binding|null> {
        if(this.#capture) throw new Error("A capture is already pending. Wait for it or call cancelCapture().")
        return new Promise(resolve => { this.#capture = resolve })
    }

    /** Give up the pending capture, which settles with none. Doing it with none pending does nothing. */
    public cancelCapture(): void {
        this.#endCapture(null)
    }

    /** The name of a key in the current keyboard layout, none if unknown. */
    public keyLabel(code: string): string|null {
        return this.port.keyLabel(code)
    }


    readonly #frame = new MutableInputFrame()
    #frameCount = 0

    /** Settles the pending capture, none when there is none. */
    #capture: ((binding: Binding|null) => void)|null = null


    //// The keyboard, the mouse and the window ////


    #read(raw: RawInputEvent): void {
        const frame = this.#frame
        switch(raw.type){
            case "pointer-move":
                frame.pointerX = raw.x
                frame.pointerY = raw.y
                this.#addPointer("pointer-move", -1)
                break
            case "pointer-down":
                frame.pointerX = raw.x
                frame.pointerY = raw.y
                if(frame.mouseButtons.has(raw.button)) break
                frame.mouseButtons.add(raw.button)
                this.#addPointer("pointer-down", raw.button)
                break
            case "pointer-up":
                frame.pointerX = raw.x
                frame.pointerY = raw.y
                // The button may have been released already, by a focus-lost.
                if(!frame.mouseButtons.delete(raw.button)) break
                this.#addPointer("pointer-up", raw.button)
                break
            case "wheel": {
                const event = frame.add("wheel", MOUSE)
                event.dx = raw.dx
                event.dy = raw.dy
                break
            }
            case "key-down":
                if(frame.keys.has(raw.code)) break
                frame.keys.add(raw.code)
                frame.add("key-down", KEYBOARD).code = raw.code
                break
            case "key-up":
                // The key may have been released already, by a focus-lost.
                if(!frame.keys.delete(raw.code)) break
                frame.add("key-up", KEYBOARD).code = raw.code
                break
            case "key-repeat":
                // A key released by a focus-lost no longer repeats, whatever the OS still sends.
                if(frame.keys.has(raw.code)) frame.add("key-repeat", KEYBOARD).code = raw.code
                break
            case "text":
                frame.add("text", KEYBOARD).text = raw.text
                break
            case "focus-lost":
                this.#releaseKeyboardAndMouse()
                frame.add("focus-lost", KEYBOARD)
                break
            default:
                throw new Error(`Unknown raw input event ${JSON.stringify(raw)}.`)
        }
    }

    #addPointer(type: "pointer-move"|"pointer-down"|"pointer-up", button: number): void {
        const event = this.#frame.add(type, MOUSE)
        event.button = button
        event.x = this.#frame.pointerX
        event.y = this.#frame.pointerY
    }

    /**
     * Release every key and mouse button held, since their releases may go to another window and never come.
     * The gamepads are left alone: they are read as a state, so one of them cannot stay held by mistake.
     */
    #releaseKeyboardAndMouse(): void {
        const frame = this.#frame
        for(const code of frame.keys) frame.add("key-up", KEYBOARD).code = code
        frame.keys.clear()
        for(const button of frame.mouseButtons) this.#addPointer("pointer-up", button)
        frame.mouseButtons.clear()
    }


    //// The gamepads ////


    #readGamepads(): void {
        const frame = this.#frame
        for(const state of frame.gamepads){
            const track = frame.pads.get(state.id) ?? this.#connect(state)
            track.state = state
            track.seenAt = this.#frameCount
            this.#compare(track)
        }
        for(const [id, track] of frame.pads){
            if(track.seenAt === this.#frameCount) continue
            this.#disconnect(track)
            frame.pads.delete(id)
        }
    }

    #connect(state: GamepadState): PadTrack {
        const track: PadTrack = {
            device: gamepad(state.id),
            state,
            held: new Set(),
            sticksOut: { left: false, right: false },
            seenAt: this.#frameCount,
        }
        this.#frame.pads.set(state.id, track)
        this.#frame.add("pad-connected", track.device)
        return track
    }

    /** Add the presses and releases since the last state, and the sticks that left their dead zone. */
    #compare(track: PadTrack): void {
        for(const control of PAD_CONTROLS){
            const held = isControlHeld(track.state, control)
            if(held === track.held.has(control)) continue
            if(held) track.held.add(control)
            else track.held.delete(control)
            this.#frame.add(held ? "pad-down" : "pad-up", track.device).control = control
        }
        for(const side of SIDES){
            const out = isStickOut(track.state, side)
            const left = out && !track.sticksOut[side]
            track.sticksOut[side] = out
            if(left) this.#frame.add("pad-stick", track.device).side = side
        }
    }

    /** Release everything the gamepad held, then say it is gone, so no table keeps an action held. */
    #disconnect(track: PadTrack): void {
        for(const control of track.held) this.#frame.add("pad-up", track.device).control = control
        track.held.clear()
        this.#frame.add("pad-disconnected", track.device)
    }


    //// What the frame leads to ////


    #updateLastDevice(): void {
        for(const event of this.#frame.events){
            if(isDeviceUse(event)) this.#frame.lastDevice = event.device
        }
    }

    #settleCapture(): void {
        if(!this.#capture) return
        for(const event of this.#frame.events){
            if(!isPress(event) || event.consumed) continue
            event.consume()
            const cancelled = event.type === "key-down" && event.code === CANCEL_CAPTURE_CODE
            this.#endCapture(cancelled ? null : bindingOf(event))
            return
        }
    }

    #endCapture(binding: Binding|null): void {
        const settle = this.#capture
        this.#capture = null
        settle?.(binding)
    }
}
