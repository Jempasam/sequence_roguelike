import { Fault } from "../../../../engine/net/Fault"

import { RelayedSource } from "../Relay"
import type { SyncSource } from "../SyncChannel"
import { forward, signal } from "../faults"
import { PROGRESS_TOPIC } from "../modes/duelRace/topics"
import type { ProgressView } from "../modes/players/HubPort"
import { readProgressMessage } from "./ProgressMessage"
import type { Progress } from "./ProgressMessage"

/**
 * What hears where the other players stand, from what a {@link Relay} copies: a state for each, the last
 * heard. A message that cannot be read is left out, and the state comes again with the next one.
 *
 * @remarks
 * It makes its own {@link RelayedSource}, so the first messages a channel gives a client connecting, which
 * come while it listens, are not missed.
 */
export class ProgressReceiver implements ProgressView {


    /** Told of each progress heard, with the id of the player. */
    public readonly progressed = signal<{ readonly id: string, readonly progress: Progress }>()

    /** Told of a message that could not be read: it is left out. */
    public readonly faulted = signal<Fault>()

    constructor(source: SyncSource){
        this.#source = new RelayedSource(PROGRESS_TOPIC, source, (from, message) => this.#told(from, message))
        this.#forwarding = forward(this.#source, this, false)
    }


    /** Where a player stands, as last heard, none for one not heard of. */
    public progressOf(id: string): Progress|null {
        return this.#progresses.get(id) ?? null
    }

    /** The players heard of. */
    public get players(): readonly string[] {
        return [...this.#progresses.keys()]
    }

    /** Stop listening. */
    public dispose(): void {
        this.#forwarding.dispose()
        this.#source.dispose()
    }


    readonly #source: RelayedSource
    readonly #forwarding: { dispose(): void }
    readonly #progresses = new Map<string, Progress>()

    #told(id: string, text: string): void {
        const progress = readProgressMessage(text)
        if(progress instanceof Fault){
            this.faulted.notify(progress)
            return
        }
        this.#progresses.set(id, progress)
        this.progressed.notify({ id, progress })
    }
}
