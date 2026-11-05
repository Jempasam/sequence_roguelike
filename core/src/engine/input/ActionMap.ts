import { bindingMatches, deviceKindOf, isAxisBinding, isBinding, STICK_DEADZONE } from "./Binding"
import type { AxisBinding, Binding } from "./Binding"
import { isDeviceUse, isPress, isRelease } from "./InputEvent"
import type { Device, DeviceKind, InputEvent, PadControl, Side } from "./InputEvent"
import type { InputFrame } from "./InputFrame"
import { FrameOccurrence, Repeat } from "./Repeat"
import type { ActionOccurrence } from "./Repeat"

/**
 * The actions of a table and their bindings: each button is held or not, each axis is a 2D vector. Plain
 * data, so the bindings the player chose are saved as they are.
 *
 * @remarks
 * Several bindings may serve one action: a button is held when one of them is, an axis takes the longest of
 * its sources.
 */
export interface ActionBindings<B extends string, A extends string> {
    readonly buttons: Readonly<Record<B, readonly Binding[]>>
    readonly axes: Readonly<Record<A, readonly AxisBinding[]>>
}

/** How a table is set up beyond its bindings. */
export interface ActionMapOptions {
    /**
     * The devices the table reads, the others touching neither its events nor its state. Every device when
     * none, the case of a single player.
     */
    readonly devices?: readonly Device[]|null
}

/** A 2D vector of length 1 at most, `x` growing to the right and `y` downward. */
export interface AxisValue {
    readonly x: number
    readonly y: number
}

/**
 * The state of the actions of a table since its sample before, for one tick of the simulation. Valid until
 * the next sample of the same table, which reuses it.
 */
export interface ActionSample<B extends string, A extends string> {
    /** Is the button held now? */
    held(action: B): boolean

    /** Was the button pressed since the sample before, even when released since? */
    pressed(action: B): boolean

    /** Was the button released since the sample before? */
    released(action: B): boolean

    /** The value of the axis now. */
    axis(action: A): AxisValue
}

/**
 * Turns the input into actions named by the game, through bindings the player can change.
 *
 * @remarks
 * The game keeps one table per purpose (`ui`, `gameplay`), and one per local player in split screen, each
 * reading its own devices. A table only sees the presses nobody consumed before it reads the frame: the UI
 * reads first, so a click on the HUD or a `z` typed in a text field never reaches the character. Three
 * rules keep an action from staying held forever: a lost focus releases everything, disabling a table
 * releases its actions, and a release is never hidden from the table that held the action.
 *
 * ```ts
 * const gameplay = new ActionMap({
 *     buttons: { attack: [key("KeyJ"), mouse(0), pad("west")], dodge: [key("Space"), pad("south")] },
 *     axes: { move: [keys("KeyW", "KeyS", "KeyA", "KeyD"), stick("left")] },
 * })
 * ```
 */
export class ActionMap<B extends string, A extends string> {


    /**
     * @param bindings - The actions of the table and their bindings by default.
     * @param options - The devices the table reads.
     * @throws {@link Error} When a name is both a button and an axis, or a binding is malformed.
     */
    constructor(bindings: ActionBindings<B, A>, options: ActionMapOptions = {}){
        this.#devices = options.devices ?? null
        this.#install(bindings)
    }


    /**
     * Does the table read the input? Disabling it releases all its actions. Enabling it again, a button
     * already held does not count until it is released, so the button that closes a menu does not strike
     * too. The axes apply at once: holding the stick while a menu closes walks, which is expected.
     */
    public get enabled(): boolean { return this.#enabled }

    public set enabled(enabled: boolean){
        if(enabled === this.#enabled) return
        this.#enabled = enabled
        if(!enabled) this.#releaseAll()
    }

    /**
     * The devices the table reads, none for every device. Changing them releases all its actions, as
     * disabling the table does, so a player given another gamepad starts from nothing held.
     */
    public get devices(): readonly Device[]|null { return this.#devices }

    public set devices(devices: readonly Device[]|null){
        this.#devices = devices
        this.#releaseAll()
    }

    /** The device of the table used last, none before the first use. */
    public get lastDevice(): Device|null { return this.#lastDevice }

    /** The presses and repetitions of the frame read last, in order. */
    public get occurrences(): readonly ActionOccurrence<B>[] { return this.#occurrences }

    /**
     * Read the events of a frame that nobody consumed so far. Called once per frame, after the UI and the
     * tables that read before this one, even while the table is disabled, so it keeps track of the presses
     * others consumed.
     */
    public update(frame: InputFrame): void {
        this.#occurrences.length = 0
        for(const event of frame.events){
            if(!this.#accepts(event.device.kind, event.device.id)) continue
            if(isDeviceUse(event)) this.#lastDevice = event.device
            if(isPress(event)) this.#press(event, frame.time)
            else if(isRelease(event)) this.#release(event)
        }
        this.#repeat(frame.time)
        this.#readAxes(frame)
    }

    /** Is a button held now? */
    public held(action: B): boolean {
        return this.#buttonOf(action).held
    }

    /** The value of an axis now. */
    public axis(action: A): AxisValue {
        return this.#axisOf(action).value
    }

    /**
     * Take the state of the actions since the sample before, then start the next one. Once per tick of the
     * simulation: a press and its release between two ticks are both seen by the next one, and of two
     * ticks in the same frame, only the first sees the press.
     */
    public sample(): ActionSample<B, A> {
        for(const state of this.#buttons.values()){
            const sampled = this.#sample.buttonOf(state.action)
            sampled.held = state.held
            sampled.pressed = state.pressed
            sampled.released = state.released
            state.pressed = false
            state.released = false
        }
        for(const state of this.#axes.values()){
            setVector(this.#sample.axisOf(state.action), state.value.x, state.value.y)
        }
        return this.#sample
    }

    /** The bindings of every action, as plain data to save. */
    public bindings(): ActionBindings<B, A> {
        const buttons = {} as Record<B, Binding[]>
        for(const state of this.#buttons.values()) buttons[state.action] = [...state.bindings]
        const axes = {} as Record<A, AxisBinding[]>
        for(const state of this.#axes.values()) axes[state.action] = [...state.bindings]
        return { buttons, axes }
    }

    /**
     * Replace the bindings of every action. Everything is released, and a button held meanwhile only counts
     * once pressed again.
     *
     * @throws {@link Error} When the actions are not those of the table, or a binding is malformed.
     */
    public setBindings(bindings: ActionBindings<B, A>): void {
        this.#checkSameActions(bindings)
        this.#releaseAll()
        this.#install(bindings)
    }

    /**
     * The binding of an action to show for a device, for the icons of buttons: the first one that device
     * kind reads, or the first one at all for no device. None when no binding fits.
     */
    public bindingFor(action: B|A, device: Device|null): Binding|AxisBinding|null {
        const list = this.#buttons.get(action)?.bindings ?? this.#axes.get(action)?.bindings ?? []
        for(const binding of list){
            if(!device || deviceKindOf(binding) === device.kind) return binding
        }
        return null
    }


    // Keyed by plain strings, so a name of either kind looks up both maps.
    #buttons = new Map<string, ButtonState<B>>()
    #axes = new Map<string, AxisState<A>>()
    readonly #sample = new TableSample<B, A>()
    readonly #repeats = new Repeat<B>()
    #devices: readonly Device[]|null
    #enabled = true
    #lastDevice: Device|null = null

    /** The presses the table accepted and that are still held. */
    readonly #own = new InputSet()

    /** The presses someone consumed and that are still held, which count for nothing until released. */
    readonly #blocked = new InputSet()

    readonly #occurrences: FrameOccurrence<B>[] = []
    readonly #occurrencePool: FrameOccurrence<B>[] = []


    //// The bindings ////


    #install(bindings: ActionBindings<B, A>): void {
        const buttons = new Map<string, ButtonState<B>>()
        for(const action in bindings.buttons){
            const list = checkedList(action, bindings.buttons[action], isBinding)
            buttons.set(action, { action, bindings: list, held: false, pressed: false, released: false })
        }
        const axes = new Map<string, AxisState<A>>()
        for(const action in bindings.axes){
            if(buttons.has(action)) throw new Error(`"${action}" is both a button and an axis. Rename one.`)
            const list = checkedList(action, bindings.axes[action], isAxisBinding)
            axes.set(action, { action, bindings: list, value: { x: 0, y: 0 } })
        }
        this.#buttons = buttons
        this.#axes = axes
        this.#sample.clear()
    }

    #checkSameActions(bindings: ActionBindings<B, A>): void {
        const given = [...Object.keys(bindings.buttons), ...Object.keys(bindings.axes)].sort()
        const expected = [...this.#buttons.keys(), ...this.#axes.keys()].sort()
        if(given.join() === expected.join()) return
        throw new Error(`The bindings give the actions ${given.join(", ")}, the table has ${expected.join(", ")}.`)
    }

    #buttonOf(action: B): ButtonState<B> {
        const state = this.#buttons.get(action)
        if(!state) throw new Error(`The table has no button "${action}".`)
        return state
    }

    #axisOf(action: A): AxisState<A> {
        const state = this.#axes.get(action)
        if(!state) throw new Error(`The table has no axis "${action}".`)
        return state
    }


    //// The buttons ////


    #accepts(kind: DeviceKind, id: number): boolean {
        if(!this.#devices) return true
        for(const device of this.#devices) if(device.kind === kind && device.id === id) return true
        return false
    }

    #press(event: InputEvent, time: number): void {
        if(event.consumed){
            this.#blocked.add(event)
            return
        }
        if(!this.#enabled) return
        this.#own.add(event)
        for(const state of this.#buttons.values()){
            if(state.held || !matchesAny(state.bindings, event)) continue
            state.held = true
            state.pressed = true
            this.#repeats.start(state.action, time)
            this.#occur(state.action, event)
        }
    }

    /** Release what an event releases, consumed or not, since the table may hold an action through it. */
    #release(event: InputEvent): void {
        this.#blocked.delete(event)
        if(!this.#own.delete(event)) return
        for(const state of this.#buttons.values()){
            if(!state.held || !matchesAny(state.bindings, event) || this.#isStillHeld(state)) continue
            state.held = false
            state.released = true
            this.#repeats.stop(state.action)
        }
    }

    /** Does another binding of the button still hold it? */
    #isStillHeld(state: ButtonState<B>): boolean {
        for(const binding of state.bindings) if(this.#own.holds(binding)) return true
        return false
    }

    #releaseAll(): void {
        this.#own.clear()
        this.#repeats.clear()
        for(const state of this.#buttons.values()){
            if(!state.held) continue
            state.held = false
            state.released = true
        }
        for(const state of this.#axes.values()) setVector(state.value, 0, 0)
    }

    #repeat(time: number): void {
        for(const state of this.#buttons.values()){
            if(state.held && this.#repeats.isDue(state.action, time)) this.#occur(state.action, null)
        }
    }

    #occur(action: B, event: InputEvent|null): void {
        const index = this.#occurrences.length
        // The pool only grows, so after the busiest frame so far, an occurrence allocates nothing.
        const pool = this.#occurrencePool
        if(index === pool.length) pool.push(new FrameOccurrence(action, event))
        this.#occurrences.push(pool[index].reset(action, event))
    }


    //// The axes ////


    /** The value of the source of an axis being read, so reading it allocates nothing. */
    readonly #source = { x: 0, y: 0 }

    #readAxes(frame: InputFrame): void {
        for(const state of this.#axes.values()){
            setVector(state.value, 0, 0)
            if(!this.#enabled) continue
            for(const binding of state.bindings){
                if(binding.kind === "stick") this.#readStick(frame, binding.side)
                else this.#readButtons(frame, binding)
                const longer = lengthSquared(this.#source) > lengthSquared(state.value)
                if(longer) setVector(state.value, this.#source.x, this.#source.y)
            }
        }
    }

    /**
     * Read a stick into the source: the longest of the gamepads of the table, rescaled to start from 0 at
     * the edge of the dead zone, so a slight push gives a slight move instead of a jump.
     */
    #readStick(frame: InputFrame, side: Side): void {
        setVector(this.#source, 0, 0)
        let longest = STICK_DEADZONE
        for(const state of frame.gamepads){
            if(!this.#accepts("gamepad", state.id)) continue
            const x = side === "left" ? state.axes.leftX : state.axes.rightX
            const y = side === "left" ? state.axes.leftY : state.axes.rightY
            const length = Math.hypot(x, y)
            if(length <= longest) continue
            longest = length
            const scale = (Math.min(length, 1) - STICK_DEADZONE) / (1 - STICK_DEADZONE) / length
            setVector(this.#source, x * scale, y * scale)
        }
    }

    /** Read four bindings into the source, a diagonal of length 1 like the rest, so it is not faster. */
    #readButtons(frame: InputFrame, binding: Extract<AxisBinding, { kind: "buttons" }>): void {
        const x = this.#heldValue(frame, binding.right) - this.#heldValue(frame, binding.left)
        const y = this.#heldValue(frame, binding.down) - this.#heldValue(frame, binding.up)
        const scale = x !== 0 && y !== 0 ? Math.SQRT1_2 : 1
        setVector(this.#source, x * scale, y * scale)
    }

    /**
     * 1 when a binding is held on a device of the table, 0 otherwise. A press someone consumed does not
     * count, but one held when the table was enabled does: the axes apply at once.
     */
    #heldValue(frame: InputFrame, binding: Binding): number {
        switch(binding.kind){
            case "key": {
                const held = this.#accepts("keyboard", 0) && frame.isKeyHeld(binding.code)
                return held && !this.#blocked.holds(binding) ? 1 : 0
            }
            case "mouse": {
                const held = this.#accepts("mouse", 0) && frame.isMouseHeld(binding.button)
                return held && !this.#blocked.holds(binding) ? 1 : 0
            }
            case "pad":
                for(const state of frame.gamepads){
                    const held = this.#accepts("gamepad", state.id) && frame.isPadHeld(state.id, binding.control)
                    if(held && !this.#blocked.holdsPad(state.id, binding.control)) return 1
                }
                return 0
            default:
                throw new Error(`Unknown binding kind in ${JSON.stringify(binding)}.`)
        }
    }
}

/** The state of a button of a table. */
interface ButtonState<B extends string> {
    readonly action: B
    readonly bindings: readonly Binding[]
    held: boolean

    /** Was it pressed since the sample before? */
    pressed: boolean

    /** Was it released since the sample before? */
    released: boolean
}

/** The state of an axis of a table. */
interface AxisState<A extends string> {
    readonly action: A
    readonly bindings: readonly AxisBinding[]
    readonly value: { x: number, y: number }
}

/** What a sample holds of a button. */
interface SampledButton {
    held: boolean
    pressed: boolean
    released: boolean
}

/**
 * The sample a table hands out, reused from one sample to the next, so sampling allocates nothing once
 * every action was sampled.
 */
class TableSample<B extends string, A extends string> implements ActionSample<B, A> {


    public held(action: B): boolean { return this.#sampledButton(action).held }

    public pressed(action: B): boolean { return this.#sampledButton(action).pressed }

    public released(action: B): boolean { return this.#sampledButton(action).released }

    public axis(action: A): AxisValue {
        const value = this.#axes.get(action)
        if(!value) throw new Error(`The sample has no axis "${action}". Call sample() on the table first.`)
        return value
    }

    /** The entry of a button, to fill. */
    public buttonOf(action: B): SampledButton {
        let sampled = this.#buttons.get(action)
        if(!sampled){
            sampled = { held: false, pressed: false, released: false }
            this.#buttons.set(action, sampled)
        }
        return sampled
    }

    /** The entry of an axis, to fill. */
    public axisOf(action: A): { x: number, y: number } {
        let value = this.#axes.get(action)
        if(!value){
            value = { x: 0, y: 0 }
            this.#axes.set(action, value)
        }
        return value
    }

    /** Forget every entry, for bindings that changed their actions. */
    public clear(): void {
        this.#buttons.clear()
        this.#axes.clear()
    }


    readonly #buttons = new Map<string, SampledButton>()
    readonly #axes = new Map<string, { x: number, y: number }>()

    #sampledButton(action: B): SampledButton {
        const sampled = this.#buttons.get(action)
        if(!sampled) throw new Error(`The sample has no button "${action}". Call sample() on the table first.`)
        return sampled
    }
}

/**
 * Inputs held, of every device: keys by position, mouse buttons, and the controls of each gamepad.
 */
class InputSet {


    /** Add what a press event presses. */
    public add(event: InputEvent): void {
        switch(event.type){
            case "key-down":
                this.#keys.add(event.code)
                break
            case "pointer-down":
                this.#mouseButtons.add(event.button)
                break
            case "pad-down":
                if(event.control) this.#padOf(event.device.id).add(event.control)
                break
            default:
                throw new Error(`A ${event.type} event presses nothing.`)
        }
    }

    /** Remove what a release event releases. Does the set hold it? */
    public delete(event: InputEvent): boolean {
        switch(event.type){
            case "key-up": return this.#keys.delete(event.code)
            case "pointer-up": return this.#mouseButtons.delete(event.button)
            case "pad-up": return event.control ? this.#padOf(event.device.id).delete(event.control) : false
            default: throw new Error(`A ${event.type} event releases nothing.`)
        }
    }

    /** Does the set hold a binding, on any of its gamepads for a gamepad control? */
    public holds(binding: Binding): boolean {
        switch(binding.kind){
            case "key": return this.#keys.has(binding.code)
            case "mouse": return this.#mouseButtons.has(binding.button)
            case "pad":
                for(const controls of this.#pads.values()) if(controls.has(binding.control)) return true
                return false
            default: throw new Error(`Unknown binding kind in ${JSON.stringify(binding)}.`)
        }
    }

    /** Does the set hold a control of one gamepad? */
    public holdsPad(id: number, control: PadControl): boolean {
        return this.#pads.get(id)?.has(control) ?? false
    }

    public clear(): void {
        this.#keys.clear()
        this.#mouseButtons.clear()
        this.#pads.clear()
    }


    readonly #keys = new Set<string>()
    readonly #mouseButtons = new Set<number>()
    readonly #pads = new Map<number, Set<PadControl>>()

    #padOf(id: number): Set<PadControl> {
        let controls = this.#pads.get(id)
        if(!controls){
            controls = new Set()
            this.#pads.set(id, controls)
        }
        return controls
    }
}

/** Is an event about the input of one of the bindings? */
function matchesAny(bindings: readonly Binding[], event: InputEvent): boolean {
    for(const binding of bindings) if(bindingMatches(binding, event)) return true
    return false
}

/** The bindings of an action, copied, once each is checked. */
function checkedList<T>(
    action: string,
    list: readonly unknown[],
    isValid: (value: unknown) => value is T,
): T[] {
    if(!Array.isArray(list)) throw new Error(`The bindings of "${action}" are not a list.`)
    for(const binding of list){
        if(!isValid(binding)) throw new Error(`The binding ${JSON.stringify(binding)} of "${action}" is malformed.`)
    }
    return [...list]
}

function setVector(vector: { x: number, y: number }, x: number, y: number): void {
    vector.x = x
    vector.y = y
}

function lengthSquared(vector: AxisValue): number {
    return vector.x * vector.x + vector.y * vector.y
}
