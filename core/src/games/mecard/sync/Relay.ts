import type { SyncPeer, SyncRoom } from "../../../platform"
import type { Fault } from "../../../engine/net/Fault"
import type { SyncSender, SyncSource, SyncTopic } from "./SyncChannel"
import { signal, UnreadableFault } from "./faults"
import type { Removable } from "../../../lifetime"

/** What a relay tells a client that connects of what the others said before. */
export interface RelayMemory {
    /**
     * What a client connecting is told of a peer, as the relay heard it last, none to tell it nothing.
     *
     * @param from - The id of the peer.
     * @param message - What the peer said last, as the relay sent it.
     */
    initial(from: string, message: string): string|null
}

/** A client connecting is given the last thing each peer said: its state, not what came before. */
export const LAST_STATE: RelayMemory = { initial: (_from, message) => message }

/** Nothing is told again: what a peer says is an event, and what is missed is missed. */
export const NOTHING: RelayMemory = { initial: () => null }

/** What listens to a peer, and what it said last, as the relay sent it. */
interface Listened {
    readonly handles: Removable[]
    last: string|null
}

/** What a peer said, from whom, as one text: the id of the sender, a line break, then the message. */
function envelope(from: string, message: string): string {
    return `${from}\n${message}`
}

/**
 * What the host does so the clients of a star room hear each other: it copies what each peer says on a
 * topic to everyone, with the id of the sender. It is also a peer: {@link Relay.send} speaks as the host.
 *
 * @remarks
 * It checks nothing, and anyone can say anything as itself: it is never what a rule that needs the authority
 * of the host goes through (plans, seats, orders). It is for what shows others what a peer does, a
 * progress, a state, an emote.
 *
 * What a peer that leaves said is forgotten, and it is no longer listened to. One whose connection is only
 * lost keeps what it said, for it may come back.
 */
export class Relay {


    /** Told of each message relayed, whoever said it. */
    public readonly relayed = signal<{ readonly from: string, readonly message: string }>()

    constructor(
        topic: SyncTopic,

        /** The clients, each listened to on the topic. */
        room: SyncRoom,

        /** Where what is copied goes: every client. */
        sender: SyncSender,

        private readonly memory: RelayMemory,

        /** The id the host speaks by. */
        private readonly self = "host",
    ){
        this.#sender = topic.sender(sender)
        this.#topic = topic
        this.#handles = [
            room.onJoin(peer => this.#listen(peer)),
            room.onLeave(peer => this.#forget(peer)),
            // The host is a peer too: a client connecting is told what it said last.
            this.#sender.onPeer(() => {
                return this.#hostLast === null ? null : this.memory.initial(this.self, this.#hostLast)
            }),
        ]
    }


    /** Speak as the host. */
    public send(message: string): void {
        this.sendAs(this.self, message)
    }

    /**
     * Speak as a peer the host stands for: a player that plays on the host itself, with no link to be heard
     * on. What it says is copied as what a peer says, and told of what a client connecting hears.
     */
    public sendAs(from: string, message: string): void {
        this.#copy(from, message)
    }

    /** Stop relaying. */
    public dispose(): void {
        for(const handle of this.#handles) handle.remove()
        for(const peer of [...this.#peers.keys()]) this.#drop(peer)
        for(const entry of this.#stoodFor.values()) for(const handle of entry.handles) handle.remove()
        this.#stoodFor.clear()
    }


    readonly #sender: SyncSender
    readonly #topic: SyncTopic
    readonly #handles: readonly Removable[]

    /** What the host said last, to tell a client connecting. */
    #hostLast: string|null = null

    /** What listens to each peer, and tells a client connecting what it said last. */
    readonly #peers = new Map<string, Listened>()

    /** What tells a client connecting what each player the host stands for said last. */
    readonly #stoodFor = new Map<string, Listened>()

    #listen(peer: SyncPeer): void {
        if(this.#peers.has(peer.id)) return
        const entry: Listened = { handles: [], last: null }
        this.#peers.set(peer.id, entry)
        entry.handles.push(this.#topic.source(peer).listen(message => this.#copy(peer.id, message)))
        entry.handles.push(this.#sender.onPeer(() => {
            return entry.last === null ? null : this.memory.initial(peer.id, entry.last)
        }))
    }

    #copy(from: string, message: string): void {
        const text = envelope(from, message)
        const entry = this.#peers.get(from)
        if(entry) entry.last = text
        else if(from === this.self) this.#hostLast = text
        else this.#standingFor(from).last = text
        this.#sender.send(text)
        this.relayed.notify({ from, message })
    }

    /** What tells a client connecting what a player the host stands for said last. */
    #standingFor(id: string): Listened {
        const known = this.#stoodFor.get(id)
        if(known) return known
        const entry: Listened = { handles: [], last: null }
        entry.handles.push(this.#sender.onPeer(() => {
            return entry.last === null ? null : this.memory.initial(id, entry.last)
        }))
        this.#stoodFor.set(id, entry)
        return entry
    }

    #forget(peer: SyncPeer): void {
        this.#drop(peer.id)
    }

    #drop(id: string): void {
        const entry = this.#peers.get(id)
        if(!entry) return
        for(const handle of entry.handles) handle.remove()
        this.#peers.delete(id)
    }
}

/**
 * What hears what a {@link Relay} copies, as a client: each message comes with the id of the peer that said
 * it, which may be the host, or this client itself.
 */
export class RelayedSource {


    /** Told of each message heard, with the id of who said it. */
    public readonly heard = signal<{ readonly from: string, readonly message: string }>()

    /** Told of a message that could not be read: it has no sender. */
    public readonly faulted = signal<Fault>()

    /**
     * @param first - Told of each message before any listener of {@link RelayedSource.heard} can be added:
     *   a channel gives a client connecting its first messages while it listens, which is at once.
     */
    constructor(
        topic: SyncTopic,
        source: SyncSource,
        first: ((from: string, message: string) => void)|null = null,
    ){
        if(first) this.heard.add(({ from, message }) => first(from, message))
        this.#listening = topic.source(source).listen(text => {
            const cut = text.indexOf("\n")
            if(cut < 0){
                this.faulted.notify(new UnreadableFault(topic.name, text, "it has no sender before its first line break."))
                return
            }
            this.heard.notify({ from: text.slice(0, cut), message: text.slice(cut + 1) })
        })
    }


    /** Stop listening. */
    public dispose(): void {
        this.#listening.remove()
    }


    readonly #listening: Removable
}
