import { Fault } from "../../../../engine/net/Fault"

import type { Relay } from "../Relay"
import { signal } from "../faults"
import type { ProgressView } from "../../sim/mode/subs/duelRace/players/HubPort"
import { readProgressMessage } from "./ProgressMessage"
import type { Progress } from "./ProgressMessage"

/**
 * What the hub keeps of where each player stands: the last progress each said, from what its {@link Relay}
 * copies, whoever said it, a client or a player that plays on the hub itself.
 *
 * @remarks
 * It is what a player on the hub reads the others with, as a {@link ProgressView}, and what the hub reads the
 * arrivals from. A message that cannot be read is left out, and the state comes again with the next one.
 */
export class ProgressBook implements ProgressView {


    /** Told of each progress heard, with the id of the player. */
    public readonly progressed = signal<{ readonly id: string, readonly progress: Progress }>()

    /** Told of a message that could not be read: it is left out. */
    public readonly faulted = signal<Fault>()

    constructor(relay: Relay){
        this.#observer = relay.relayed.add(({ from, message }) => this.#told(from, message))
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
        this.#observer.remove()
    }


    readonly #observer: { remove(): void }
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
