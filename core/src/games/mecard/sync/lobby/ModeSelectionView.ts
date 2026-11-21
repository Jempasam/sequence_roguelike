import type { Fault } from "../../../../engine/net/Fault"

import { signal, UnreadableFault } from "../faults"
import { LOBBY_MODE_TOPIC } from "../SyncChannel"
import type { SyncSource } from "../SyncChannel"

import { readModeState } from "./LobbyMessage"
import type { ModeState } from "./LobbyMessage"
import type { Removable } from "../../../../lifetime"

/** The mode of the lobby as a client sees it: what the host says, changed by nothing here. */
export class ModeSelectionView {


    /** Told each time the host tells how it stands. */
    public readonly changed = signal<void>()

    /** Told of what came and could not be read. */
    public readonly faulted = signal<Fault>()

    constructor(source: SyncSource){
        this.#handle = LOBBY_MODE_TOPIC.source(source).listen(text => this.#heard(text))
    }


    /** Where the lobby stands, none until the host has told. */
    public get state(): ModeState|null { return this.#state }

    /** What it stood at just before, none when the host told only once. */
    public get previous(): ModeState|null { return this.#previous }

    /** Stop listening. */
    public dispose(): void {
        this.#handle.remove()
    }


    readonly #handle: Removable
    #state: ModeState|null = null
    #previous: ModeState|null = null

    #heard(text: string): void {
        const read = readModeState(text)
        if(read instanceof UnreadableFault){
            this.faulted.notify(read)
            return
        }
        this.#previous = this.#state
        this.#state = read
        this.changed.notify()
    }
}
