import { Fault } from "../../../../engine/net/Fault"

import { signal } from "../faults"
import { LOBBY_MODE_TOPIC } from "../SyncChannel"
import type { SyncSender } from "../SyncChannel"

import type { LobbyMode } from "./LobbyMode"
import { writeModeState } from "./LobbyMessage"
import type { ModeState } from "./LobbyMessage"
import { checkValues, initialValues, InvalidSettingFault } from "../../sim/mode/Setting"
import type { SettingValue, SettingValues } from "../../sim/mode/Setting"

/** The mode of the lobby was asked to change while a game is played. */
export class LockedFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "The mode cannot be changed while a game is being played."
    }
}

/** A mode was asked for that the lobby does not offer. */
export class UnknownModeFault extends Fault {


    constructor(
        public readonly mode: string,
        public readonly who: string|null = null,
    ){
        super()
    }


    public describe(): string {
        return `The mode ${this.mode} is not offered.`
    }
}

/**
 * The mode a lobby is set on, as the host keeps it: it alone changes it, and tells everyone as a state, so
 * whoever connects, or comes back, is told how it stands. While a game is played nothing changes.
 */
export class ModeSelection {


    /** Told each time the mode, a setting, or whether a game is played changes. */
    public readonly changed = signal<void>()

    constructor(
        sender: SyncSender,

        /** The modes offered, the first of which the lobby is set on at first. */
        public readonly modes: readonly LobbyMode[],
    ){
        if(modes.length === 0) throw new Error("A lobby offers at least one mode.")
        this.#mode = modes[0]
        this.#values = initialValues(this.#mode.settings)
        this.#sender = LOBBY_MODE_TOPIC.sender(sender)
        this.#handle = this.#sender.onPeer(() => writeModeState(this.state))
    }


    /** The mode the lobby is set on. */
    public get mode(): LobbyMode { return this.#mode }

    /** What each setting of the mode is worth. */
    public get values(): SettingValues { return this.#values }

    /** Is a game being played? */
    public get playing(): boolean { return this.#playing }

    /** What everyone is told. */
    public get state(): ModeState {
        return { mode: this.#mode.id, values: this.#values, playing: this.#playing, game: this.#game }
    }

    /** The number the next game will have. */
    public get nextGame(): number { return this.#game + 1 }

    /** Set the lobby on another mode, its settings back to what they are worth at first. */
    public select(id: string): Fault|null {
        if(this.#playing) return new LockedFault()
        const mode = this.modes.find(each => each.id === id)
        if(!mode) return new UnknownModeFault(id)
        this.#mode = mode
        this.#values = initialValues(mode.settings)
        this.#tell()
        return null
    }

    /** Give a setting of the mode a value. */
    public set(setting: string, value: SettingValue): Fault|null {
        if(this.#playing) return new LockedFault()
        const known = this.#mode.settings.find(each => each.id === setting)
        if(!known) return new InvalidSettingFault(setting, "no such setting")
        const fault = known.check(value)
        if(fault) return fault
        this.#values = { ...this.#values, [setting]: value }
        this.#tell()
        return null
    }

    /** Lock the mode for a game, and tell everyone. It says why not when the values do not fit. */
    public begin(): Fault|null {
        if(this.#playing) return new LockedFault()
        const fault = checkValues(this.#mode.settings, this.#values)
        if(fault) return fault
        this.#playing = true
        this.#game++
        this.#tell()
        return null
    }

    /** Unlock the mode once the game is over, and tell everyone. */
    public end(): void {
        if(!this.#playing) return
        this.#playing = false
        this.#tell()
    }

    /** Stop telling the mode to those that connect. */
    public dispose(): void {
        this.#handle.dispose()
    }


    readonly #sender: SyncSender
    readonly #handle: { dispose(): void }
    #mode: LobbyMode
    #values: SettingValues
    #playing = false
    #game = 0

    #tell(): void {
        this.#sender.send(writeModeState(this.state))
        this.changed.notify()
    }
}
