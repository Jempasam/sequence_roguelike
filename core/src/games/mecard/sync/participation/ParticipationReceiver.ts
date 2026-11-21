import { Fault } from "../../../../engine/net/Fault"
import type { Cancel, TimerPort } from "../../../../platform"

import { signal, UnreadableFault } from "../faults"
import type { SettingValues } from "../../sim/mode/Setting"
import { PARTICIPATE_TOPIC, PARTICIPATION_TOPIC } from "../SyncChannel"
import type { SyncLink } from "../SyncChannel"

import { readParticipationMessage, writeParticipateMessage } from "./ParticipationMessage"
import type { ParticipationMessage } from "./ParticipationMessage"

/** How long a client waits for the host to tell it its part before it says it joins again, in ms. */
export const JOIN_RETRY_MS = 2_000

/** How many times a client says it joins before it gives up. */
export const JOIN_TRIES = 5

/** The host never told a client what it takes part in: it is not there, or it does not play this game. */
export class NotAdmittedFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "L'hôte n'a pas répondu à la demande de rejoindre la partie."
    }
}

/**
 * The part a client takes in a game, as it hears it: it says it joins, and says it again until the host tells
 * what it holds, so a host not there yet, or a message lost, costs nothing. What it is told again, because the
 * connection came back, changes nothing unless it is new.
 *
 * @remarks
 * It never decides its role: the host does, for it is the one that knows what is left to take.
 */
export class ParticipationReceiver {


    /** Told each time the part it holds changes, the first time included. */
    public readonly changed = signal<ParticipationMessage>()

    /** Told of a message that could not be read: it is left out. */
    public readonly faulted = signal<Fault>()

    /** Told once, when the host never answered. */
    public readonly ended = signal<Fault>()

    constructor(
        private readonly link: SyncLink,

        /** The number of the game: what the host says of another one is not heard. */
        private readonly game: number,

        /** What the waits are counted by, none for a client that says it joins once and never again. */
        private readonly timer: TimerPort|null,
        private readonly retryMs: number = JOIN_RETRY_MS,
        private readonly maxTries: number = JOIN_TRIES,
    ){
        this.#listening = PARTICIPATION_TOPIC.link(link).listen(text => this.#heard(text))
    }


    /** The part it holds, none until the host told. */
    public get state(): ParticipationMessage|null { return this.#state }

    /**
     * Say it joins. It is a call of its own, so what listens to the answer is added first: a host may answer
     * at once. Saying it while it waits for the answer changes nothing.
     */
    public join(options?: SettingValues): void {
        if(this.#retry || this.#state) return
        this.#options = options
        this.#tries = 0
        this.#ask()
    }

    /** Say it leaves the game, and is not waiting for any answer. */
    public quit(): void {
        this.#retry?.cancel()
        this.#retry = null
        this.#state = null
        PARTICIPATE_TOPIC.link(this.link).send(writeParticipateMessage({ kind: "quit", game: this.game }))
    }

    /** Stop listening, and stop asking. */
    public dispose(): void {
        this.#retry?.cancel()
        this.#retry = null
        this.#listening.dispose()
    }


    readonly #listening: { dispose(): void }
    #state: ParticipationMessage|null = null
    #retry: Cancel|null = null
    #tries = 0
    #options: SettingValues|undefined = undefined

    #ask(): void {
        this.#tries++
        PARTICIPATE_TOPIC.link(this.link).send(
            writeParticipateMessage({ kind: "join", game: this.game, options: this.#options }),
        )
        // Heard at once, by a host that answers at once: nothing to wait for.
        if(this.#state || !this.timer) return
        this.#retry = this.timer.after(this.retryMs, () => {
            this.#retry = null
            if(this.#state) return
            if(this.#tries < this.maxTries) this.#ask()
            else this.ended.notify(new NotAdmittedFault())
        })
    }

    #heard(text: string): void {
        const message = readParticipationMessage(text)
        if(message instanceof UnreadableFault){
            this.faulted.notify(message)
            return
        }
        if(message.game !== this.game) return
        this.#retry?.cancel()
        this.#retry = null
        const known = this.#state
        this.#state = message
        if(known && known.role === message.role && known.seat === message.seat) return
        this.changed.notify(message)
    }
}
