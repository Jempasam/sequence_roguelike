import { controller, keyboard } from "@kmamal/sdl"
import type { Sdl } from "@kmamal/sdl"
import { GAMEPAD_BUTTONS } from "@game/core"
import type { GamepadAxis, GamepadButton, GamepadState, InputPort, RawInputEvent } from "@game/core"

/** The button of an SDL controller at each place of the standard layout. SDL is already in that layout. */
const CONTROLLER_BUTTONS: Readonly<Record<GamepadButton, keyof Sdl.Controller.ControllerInstance["buttons"]>> = {
    south: "a", east: "b", west: "x", north: "y", l1: "leftShoulder", r1: "rightShoulder",
    select: "back", start: "start", l3: "leftStick", r3: "rightStick",
    up: "dpadUp", down: "dpadDown", left: "dpadLeft", right: "dpadRight",
}

/**
 * The `KeyboardEvent.code` of the SDL scancodes whose name is not the code itself, so a binding names the
 * same physical key on the web and on desktop. The letters, digits and function keys follow a rule, in
 * {@link codeOf}.
 */
const CODE_OF_SCANCODE: Readonly<Record<string, string>> = {
    RETURN: "Enter", ESCAPE: "Escape", BACKSPACE: "Backspace", TAB: "Tab", SPACE: "Space",
    MINUS: "Minus", EQUALS: "Equal", LEFTBRACKET: "BracketLeft", RIGHTBRACKET: "BracketRight",
    BACKSLASH: "Backslash", NONUSHASH: "Backslash", SEMICOLON: "Semicolon", APOSTROPHE: "Quote",
    GRAVE: "Backquote", COMMA: "Comma", PERIOD: "Period", SLASH: "Slash", CAPSLOCK: "CapsLock",
    PRINTSCREEN: "PrintScreen", SCROLLLOCK: "ScrollLock", PAUSE: "Pause", INSERT: "Insert", HOME: "Home",
    PAGEUP: "PageUp", DELETE: "Delete", END: "End", PAGEDOWN: "PageDown",
    RIGHT: "ArrowRight", LEFT: "ArrowLeft", DOWN: "ArrowDown", UP: "ArrowUp",
    NUMLOCKCLEAR: "NumLock", KP_DIVIDE: "NumpadDivide", KP_MULTIPLY: "NumpadMultiply",
    KP_MINUS: "NumpadSubtract", KP_PLUS: "NumpadAdd", KP_ENTER: "NumpadEnter", KP_PERIOD: "NumpadDecimal",
    KP_EQUALS: "NumpadEqual", KP_COMMA: "NumpadComma", NONUSBACKSLASH: "IntlBackslash",
    APPLICATION: "ContextMenu",
    LCTRL: "ControlLeft", LSHIFT: "ShiftLeft", LALT: "AltLeft", LGUI: "MetaLeft",
    RCTRL: "ControlRight", RSHIFT: "ShiftRight", RALT: "AltRight", RGUI: "MetaRight",
}

/**
 * Reads the keyboard, the mouse and the controllers of SDL.
 *
 * @remarks
 * SDL measures the mouse in points, which are not pixels on a high density display, so the positions are
 * scaled to the physical pixels of the window, those core draws in.
 */
export class SdlInput implements InputPort {


    constructor(window: Sdl.Video.Window){
        this.#window = window
        for(const [name, scancode] of Object.entries(keyboard.SCANCODE)){
            const code = codeOf(name)
            if(!code) continue
            this.#codes.set(scancode, code)
            this.#scancodes.set(code, scancode)
        }
        window.on("keyDown", event => {
            const code = this.#codes.get(event.scancode)
            if(code) this.#events.push({ type: event.repeat ? "key-repeat" : "key-down", code })
        })
        window.on("keyUp", event => {
            const code = this.#codes.get(event.scancode)
            if(code) this.#events.push({ type: "key-up", code })
        })
        window.on("textInput", event => this.#events.push({ type: "text", text: event.text }))
        window.on("mouseMove", event => this.#events.push({ type: "pointer-move", ...this.#pixelsOf(event) }))
        // SDL numbers the mouse buttons from 1, in the order of the web otherwise.
        window.on("mouseButtonDown", event => {
            this.#events.push({ type: "pointer-down", button: event.button - 1, ...this.#pixelsOf(event) })
        })
        window.on("mouseButtonUp", event => {
            this.#events.push({ type: "pointer-up", button: event.button - 1, ...this.#pixelsOf(event) })
        })
        window.on("mouseWheel", event => {
            // SDL turns dy upward, the web toward the user, and "flipped" tells the OS reversed both.
            const sign = event.flipped ? -1 : 1
            this.#events.push({ type: "wheel", dx: event.dx * sign, dy: -event.dy * sign })
        })
        window.on("blur", () => this.#events.push({ type: "focus-lost" }))
        for(const device of controller.devices) this.#open(device)
        controller.on("deviceAdd", event => this.#open(event.device))
        // SDL closes the instance of a removed device by itself.
        controller.on("deviceRemove", event => this.#controllers.delete(event.device.id))
    }


    public poll(): readonly RawInputEvent[] {
        // Swapped, so the events arriving while these are read land in the other array.
        const events = this.#events
        this.#events = this.#read
        this.#read = events
        this.#events.length = 0
        return events
    }

    public gamepads(): readonly GamepadState[] {
        this.#gamepads.length = 0
        for(const [id, instance] of this.#controllers){
            if(instance.closed) continue
            this.#gamepads.push(this.#stateOf(id, instance))
        }
        return this.#gamepads
    }

    public keyLabel(code: string): string|null {
        const scancode = this.#scancodes.get(code)
        if(scancode === undefined) return null
        const key = keyboard.getKey(scancode)
        if(!key) return null
        return key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1)
    }


    readonly #window: Sdl.Video.Window
    #events: RawInputEvent[] = []
    #read: RawInputEvent[] = []
    readonly #gamepads: GamepadState[] = []

    /** The code of each scancode with an equivalent on the web, and back. */
    readonly #codes = new Map<number, string>()
    readonly #scancodes = new Map<string, number>()

    /** The open controllers, by the identifier of their device. */
    readonly #controllers = new Map<number, Sdl.Controller.ControllerInstance>()

    /** The state of each controller, by identifier, reused from frame to frame. */
    readonly #states = new Map<number, MutableGamepadState>()

    #pixelsOf(event: { readonly x: number, readonly y: number }): { x: number, y: number } {
        const scale = this.#window.pixelWidth / this.#window.width
        return { x: event.x * scale, y: event.y * scale }
    }

    #open(device: Sdl.Controller.Device): void {
        if(this.#controllers.has(device.id)) return
        try {
            this.#controllers.set(device.id, controller.openDevice(device))
        } catch(error){
            console.warn(`The controller ${device.name} could not be opened, it is left out.`, error)
        }
    }

    #stateOf(id: number, instance: Sdl.Controller.ControllerInstance): MutableGamepadState {
        let state = this.#states.get(id)
        if(!state){
            state = emptyState(id)
            this.#states.set(id, state)
        }
        for(const button of GAMEPAD_BUTTONS){
            state.buttons[button] = instance.buttons[CONTROLLER_BUTTONS[button]]
        }
        const { axes } = instance
        state.axes.leftX = axes.leftStickX
        state.axes.leftY = axes.leftStickY
        state.axes.rightX = axes.rightStickX
        state.axes.rightY = axes.rightStickY
        // Normalized from -1 to 1 like the sticks, though a trigger at rest is never below 0.
        state.axes.l2 = Math.max(0, axes.leftTrigger)
        state.axes.r2 = Math.max(0, axes.rightTrigger)
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

/**
 * The `KeyboardEvent.code` of the key an SDL scancode names, none for the keys the web has no code for or
 * the game has no use of, such as the media keys, which are then not reported at all.
 */
function codeOf(scancodeName: string): string|null {
    if(/^[A-Z]$/.test(scancodeName)) return `Key${scancodeName}`
    if(/^\d$/.test(scancodeName)) return `Digit${scancodeName}`
    if(/^F\d{1,2}$/.test(scancodeName)) return scancodeName
    if(/^KP_\d$/.test(scancodeName)) return `Numpad${scancodeName.slice(3)}`
    return CODE_OF_SCANCODE[scancodeName] ?? null
}
