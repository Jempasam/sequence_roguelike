import type { Cancel, SyncPeer, SyncRoom, TimerPort } from "../../../platform"
import { Fault } from "../../../engine/net/Fault"
import { SyncTopic } from "./SyncChannel"
import { PeerGoneFault, signal, TimeoutFault, UnreadableFault } from "./faults"
import type { Removable } from "../../../lifetime"

/** A question or an answer is its number, a line break, then its text, which may hold line breaks itself. */
function write(number: number, text: string): string {
    return `${number}\n${text}`
}

/** A question or an answer as received. */
interface Numbered {
    readonly number: number
    readonly text: string
}

/** A question or an answer as received, or why it cannot be read. */
function read(topic: string, text: string): Numbered|UnreadableFault {
    const cut = text.indexOf("\n")
    const number = cut < 0 ? Number.NaN : Number(text.slice(0, cut))
    if(!Number.isInteger(number)) return new UnreadableFault(topic, text, "it has no number before its first line break.")
    return { number, text: text.slice(cut + 1) }
}

/** The topic the questions of a topic go by, and the one the answers come back by. */
function topicsOf(topic: SyncTopic): { readonly ask: SyncTopic, readonly answer: SyncTopic } {
    return { ask: new SyncTopic(`${topic.name}:ask`), answer: new SyncTopic(`${topic.name}:answer`) }
}

/** A question waiting for its answer. */
interface Pending {
    readonly peer: string
    readonly request: string
    readonly resolve: (answer: string|Fault) => void
    readonly wait: Cancel
}

/**
 * What asks a client something and waits for its answer: the host asks, each client answers through an
 * {@link Answerer} on the same topic. Each question has a number, so an answer is told from the one before.
 *
 * @remarks
 * A question never rejects: it settles with the answer, or with a {@link Fault} when the client does not
 * answer in time ({@link TimeoutFault}), leaves before it does ({@link PeerGoneFault}), or answers what
 * cannot be read ({@link UnreadableFault}). A question asked while the connection of the client is lost is
 * lost with it, and ends by the timeout.
 */
export class Asker {


    /** Told of each question that ended by a fault, as well as by its promise. */
    public readonly faulted = signal<Fault>()

    constructor(
        topic: SyncTopic,

        /** The clients, whose leaving ends what they were asked. */
        room: SyncRoom,

        private readonly timer: TimerPort,
    ){
        this.#topics = topicsOf(topic)
        this.#handles = [
            room.onJoin(peer => this.#hear(peer)),
            room.onLeave(peer => this.#left(peer)),
        ]
    }


    /**
     * Ask a client something.
     *
     * @param timeoutMs - How long to wait for the answer.
     * @returns The answer, or why there is none. It never rejects.
     */
    public ask(peer: SyncPeer, text: string, timeoutMs: number): Promise<string|Fault> {
        const number = this.#next++
        return new Promise(resolve => {
            const settle = (answer: string|Fault): void => {
                if(!this.#pending.delete(number)) return
                pending.wait.cancel()
                if(answer instanceof Fault) this.faulted.notify(answer)
                resolve(answer)
            }
            const wait = this.timer.after(timeoutMs, () => settle(new TimeoutFault(peer.id, text)))
            const pending: Pending = { peer: peer.id, request: text, resolve: settle, wait }
            this.#pending.set(number, pending)
            this.#ensureHeard(peer)
            this.#topics.ask.link(peer).send(write(number, text))
        })
    }

    /** Stop listening: what is asked still waits for its timeout. */
    public dispose(): void {
        for(const handle of this.#handles) handle.remove()
        for(const handle of this.#hearing.values()) handle.remove()
        this.#hearing.clear()
    }


    readonly #topics: { readonly ask: SyncTopic, readonly answer: SyncTopic }
    readonly #handles: readonly Removable[]
    readonly #pending = new Map<number, Pending>()
    readonly #hearing = new Map<string, Removable>()
    #next = 1

    /** Listen to the answers of a client, once. */
    #ensureHeard(peer: SyncPeer): void {
        if(this.#hearing.has(peer.id)) return
        const listening = this.#topics.answer.source(peer).listen(text => this.#answered(peer.id, text))
        this.#hearing.set(peer.id, listening)
    }

    #hear(peer: SyncPeer): void {
        this.#ensureHeard(peer)
    }

    #answered(peer: string, text: string): void {
        const answer = read(this.#topics.answer.name, text)
        if(answer instanceof Fault){
            this.faulted.notify(answer)
            return
        }
        const pending = this.#pending.get(answer.number)
        // An answer to a question gone by, or put by another client, is no answer.
        if(pending?.peer === peer) pending.resolve(answer.text)
    }

    #left(peer: SyncPeer): void {
        this.#hearing.get(peer.id)?.remove()
        this.#hearing.delete(peer.id)
        for(const pending of [...this.#pending.values()]){
            if(pending.peer === peer.id) pending.resolve(new PeerGoneFault(peer.id))
        }
    }
}

/**
 * What answers the questions of an {@link Asker}: a client gives what it answers for each question it hears.
 */
export class Answerer {


    /** Told of a question that could not be read: it is left unanswered, and the asker's timeout ends it. */
    public readonly faulted = signal<Fault>()

    constructor(
        topic: SyncTopic,

        /** The way to the host. */
        link: SyncPeerLink,

        /** What the client answers to a question. */
        private readonly answer: (question: string) => string,
    ){
        const topics = topicsOf(topic)
        this.#answers = topics.answer.link(link)
        this.#listening = topics.ask.source(link).listen(text => this.#asked(topics.ask.name, text))
    }


    /** Stop answering. */
    public dispose(): void {
        this.#listening.remove()
    }


    readonly #answers: SyncPeerLink
    readonly #listening: Removable

    #asked(topic: string, text: string): void {
        const question = read(topic, text)
        if(question instanceof Fault){
            this.faulted.notify(question)
            return
        }
        this.#answers.send(write(question.number, this.answer(question.text)))
    }
}

/** The way between a client and the host. */
type SyncPeerLink = Pick<SyncPeer, "send"|"listen">
