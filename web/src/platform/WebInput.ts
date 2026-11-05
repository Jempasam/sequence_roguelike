import { GAMEPAD_BUTTONS } from "@game/core"
import type { GamepadAxis, GamepadButton, GamepadState, InputPort, RawInputEvent } from "@game/core"

/** The buttons of the standard Gamepad API layout, by index. */
const STANDARD_BUTTONS: Readonly<Record<GamepadButton, number>> = {
    south: 0, east: 1, west: 2, north: 3, l1: 4, r1: 5, select: 8, start: 9, l3: 10, r3: 11,
    up: 12, down: 13, left: 14, right: 15,
}

/** The triggers of the standard Gamepad API layout, which it gives as analog buttons. */
const STANDARD_L2 = 6
const STANDARD_R2 = 7

/** How many pixels of `WheelEvent.deltaY` make one notch, when the browser counts in pixels. */
const PIXELS_PER_NOTCH = 100

/** How many lines of `WheelEvent.deltaY` make one notch, when the browser counts in lines. */
const LINES_PER_NOTCH = 3

/** The mouse buttons that navigate the history, back and forward, which the game takes for itself. */
const HISTORY_BUTTONS = [3, 4]

/** The mouse button of each bit of `PointerEvent.buttons`, which orders them otherwise. */
const BUTTON_OF_BIT = [0, 2, 1, 3, 4]

/**
 * The names of the keys that type no character, shown as they are on every layout. The keys that type one
 * are named by the layout map when the browser has it, by their QWERTY character otherwise.
 */
const KEY_NAMES: Readonly<Record<string, string>> = {
    Space: "Space", Enter: "Enter", Escape: "Escape", Tab: "Tab", Backspace: "Backspace",
    ShiftLeft: "Shift", ShiftRight: "Right Shift", ControlLeft: "Ctrl", ControlRight: "Right Ctrl",
    AltLeft: "Alt", AltRight: "Alt Gr", MetaLeft: "Meta", MetaRight: "Right Meta", CapsLock: "Caps Lock",
    ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
    Insert: "Insert", Delete: "Delete", Home: "Home", End: "End", PageUp: "Page Up", PageDown: "Page Down",
    NumpadEnter: "Keypad Enter",
}

/**
 * Reads the keyboard and the mouse on the page, and the gamepads of the standard layout.
 *
 * @remarks
 * The page keeps the keys from the browser, Tab leaving the canvas, Space scrolling, the history buttons of
 * the mouse going back: the adapter does not know the bindings, so it takes every key but those pressed with
 * Ctrl, Alt or Meta and the function keys, which stay the browser's. Some shortcuts, `Ctrl+W` among them,
 * cannot be taken at all, so they are never bound by default.
 */
export class WebInput implements InputPort {


    constructor(canvas: HTMLCanvasElement){
        this.#canvas = canvas
        const options = { signal: this.#listening.signal }
        canvas.addEventListener("pointermove", event => this.#pointer(event), options)
        canvas.addEventListener("pointerdown", event => {
            // Captured, so the release outside the canvas still comes here.
            canvas.setPointerCapture(event.pointerId)
            this.#pointer(event)
        }, options)
        canvas.addEventListener("pointerup", event => this.#pointer(event), options)
        canvas.addEventListener("pointercancel", event => this.#pointer(event), options)
        canvas.addEventListener("wheel", event => this.#wheel(event), { ...options, passive: false })
        canvas.addEventListener("contextmenu", event => event.preventDefault(), options)
        // The history buttons navigate on the release of the button, which pointer events do not prevent.
        window.addEventListener("mouseup", event => {
            if(HISTORY_BUTTONS.includes(event.button)) event.preventDefault()
        }, options)
        window.addEventListener("keydown", event => this.#keyDown(event), options)
        window.addEventListener("keyup", event => this.#keyUp(event), options)
        window.addEventListener("blur", () => this.#loseFocus(), options)
        document.addEventListener("visibilitychange", () => {
            if(document.hidden) this.#loseFocus()
        }, options)
        navigator.keyboard?.getLayoutMap().then(
            layout => { this.#layout = layout },
            (error: unknown) => console.warn("The keyboard layout could not be read, keys are named in QWERTY.", error),
        )
    }


    public poll(): readonly RawInputEvent[] {
        // Swapped, so the events of the next frame land in the other array while these are read.
        const events = this.#events
        this.#events = this.#read
        this.#read = events
        this.#events.length = 0
        return events
    }

    public gamepads(): readonly GamepadState[] {
        this.#gamepads.length = 0
        for(const pad of navigator.getGamepads()){
            // The other mappings name their buttons as the gamepad likes, so nothing can be said of them.
            if(!pad || !pad.connected || pad.mapping !== "standard") continue
            this.#gamepads.push(this.#stateOf(pad))
        }
        return this.#gamepads
    }

    public keyLabel(code: string): string|null {
        const named = KEY_NAMES[code]
        if(named) return named
        const typed = this.#layout?.get(code)
        if(typed) return typed.toUpperCase()
        if(/^Key[A-Z]$/.test(code)) return code.slice(3)
        if(/^Digit\d$/.test(code)) return code.slice(5)
        if(/^F\d{1,2}$/.test(code)) return code
        if(/^Numpad\d$/.test(code)) return `Keypad ${code.slice(6)}`
        return null
    }

    /** Stop listening to the page. */
    public dispose(): void {
        this.#listening.abort()
    }


    readonly #canvas: HTMLCanvasElement
    #events: RawInputEvent[] = []
    #read: RawInputEvent[] = []
    readonly #listening = new AbortController()

    /** The mouse buttons held, as the bits of `PointerEvent.buttons`. */
    #buttonBits = 0
    readonly #gamepads: GamepadState[] = []

    /** The state of each gamepad, by index, reused from frame to frame. */
    readonly #states = new Map<number, MutableGamepadState>()

    /** The character of each key in the current layout, none until it arrives or without the API. */
    #layout: ReadonlyMap<string, string>|null = null

    /**
     * Report a pointer event as a move, then as the presses and releases of each mouse button that changed.
     * A second button pressed while one is held comes as a pointermove, not a pointerdown, so the buttons are
     * compared rather than read from the type of the event.
     */
    #pointer(event: PointerEvent): void {
        // In backbuffer pixels, exact even when the canvas box is not a whole number of CSS pixels.
        const box = this.#canvas.getBoundingClientRect()
        const x = (event.clientX - box.left) * this.#canvas.width / box.width
        const y = (event.clientY - box.top) * this.#canvas.height / box.height
        if(event.type === "pointermove") this.#events.push({ type: "pointer-move", x, y })
        if(HISTORY_BUTTONS.includes(event.button)) event.preventDefault()
        const bits = event.type === "pointercancel" ? 0 : event.buttons
        BUTTON_OF_BIT.forEach((button, bit) => {
            const held = (bits & 1 << bit) !== 0
            if(held === ((this.#buttonBits & 1 << bit) !== 0)) return
            this.#events.push({ type: held ? "pointer-down" : "pointer-up", button, x, y })
        })
        this.#buttonBits = bits
    }

    #loseFocus(): void {
        this.#buttonBits = 0
        this.#events.push({ type: "focus-lost" })
    }

    #wheel(event: WheelEvent): void {
        event.preventDefault()
        const inPixels = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
        const inLines = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        // In pages otherwise, one page making one notch.
        const perNotch = inPixels ? PIXELS_PER_NOTCH : inLines ? LINES_PER_NOTCH : 1
        this.#events.push({ type: "wheel", dx: event.deltaX / perNotch, dy: event.deltaY / perNotch })
    }

    #keyDown(event: KeyboardEvent): void {
        const shortcut = event.ctrlKey || event.altKey || event.metaKey || /^F\d{1,2}$/.test(event.code)
        if(!shortcut) event.preventDefault()
        this.#events.push({ type: event.repeat ? "key-repeat" : "key-down", code: event.code })
        // The typed character repeats with the OS, as it does in any text field.
        const typesCharacter = [...event.key].length === 1 && !event.ctrlKey && !event.metaKey
        if(typesCharacter) this.#events.push({ type: "text", text: event.key })
    }

    #keyUp(event: KeyboardEvent): void {
        this.#events.push({ type: "key-up", code: event.code })
    }

    #stateOf(pad: Gamepad): MutableGamepadState {
        let state = this.#states.get(pad.index)
        if(!state){
            state = emptyState(pad.index)
            this.#states.set(pad.index, state)
        }
        for(const button of GAMEPAD_BUTTONS){
            state.buttons[button] = pad.buttons[STANDARD_BUTTONS[button]]?.pressed ?? false
        }
        state.axes.leftX = pad.axes[0] ?? 0
        state.axes.leftY = pad.axes[1] ?? 0
        state.axes.rightX = pad.axes[2] ?? 0
        state.axes.rightY = pad.axes[3] ?? 0
        state.axes.l2 = pad.buttons[STANDARD_L2]?.value ?? 0
        state.axes.r2 = pad.buttons[STANDARD_R2]?.value ?? 0
        return state
    }
}

/** A {@link GamepadState} the adapter fills. */
interface MutableGamepadState extends GamepadState {
    readonly buttons: Record<GamepadButton, boolean>
    readonly axes: Record<GamepadAxis, number>
}

function emptyState(id: number): MutableGamepadState {
    const buttons = {} as Record<GamepadButton, boolean>
    for(const button of GAMEPAD_BUTTONS) buttons[button] = false
    return { id, buttons, axes: { leftX: 0, leftY: 0, rightX: 0, rightY: 0, l2: 0, r2: 0 } }
}
