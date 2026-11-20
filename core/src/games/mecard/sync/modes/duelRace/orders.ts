import type { SyncLink } from "../../../../../platform"

import { signal } from "../../faults"
import { KICK_TOPIC, RESEND_TOPIC, RESUME_TOPIC } from "./topics"

/** What hears the hub send the party to the duels: the order is an event, and tells nothing else. */
export class KickReceiver {


    /** Told of each order heard. */
    public readonly kicked = signal<void>()

    constructor(link: SyncLink){
        this.#listening = KICK_TOPIC.link(link).listen(() => this.kicked.notify())
    }


    /** Stop listening. */
    public dispose(): void {
        this.#listening.dispose()
    }


    readonly #listening: { dispose(): void }
}

/** What hears the hub let the party go on: the duels are over. */
export class ResumeReceiver {


    /** Told of each order heard. */
    public readonly resumed = signal<void>()

    constructor(link: SyncLink){
        this.#listening = RESUME_TOPIC.link(link).listen(() => this.resumed.notify())
    }


    /** Stop listening. */
    public dispose(): void {
        this.#listening.dispose()
    }


    readonly #listening: { dispose(): void }
}

/** What hears the hub ask where the player stands, after its connection came back. */
export class ResendReceiver {


    /** Told of each request heard. */
    public readonly asked = signal<void>()

    constructor(link: SyncLink){
        this.#listening = RESEND_TOPIC.link(link).listen(() => this.asked.notify())
    }


    /** Stop listening. */
    public dispose(): void {
        this.#listening.dispose()
    }


    readonly #listening: { dispose(): void }
}
