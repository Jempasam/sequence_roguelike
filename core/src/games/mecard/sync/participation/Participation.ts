import type { Fault } from "../../../../engine/net/Fault"
import type { SyncPeer, SyncRoom } from "../../../../platform"

import { signal, UnreadableFault } from "../faults"
import type { SettingValues } from "../lobby/Setting"
import { PARTICIPATE_TOPIC, PARTICIPATION_TOPIC } from "../SyncChannel"

import { readParticipateMessage, writeParticipationMessage } from "./ParticipationMessage"
import type { ParticipationMessage } from "./ParticipationMessage"

/** Someone who takes part in a game: a client far away, or the host itself, which has no peer. */
export interface Arrival {
    /** The id of its session, `host` for the host: it stays the same through a lost connection. */
    readonly id: string

    /** The way to tell it things, none for the host. */
    readonly peer: SyncPeer|null

    /** What it set for itself when it said it joins, as it said it: the mode checks it. */
    readonly options?: SettingValues
}

/** What a mode makes of someone who comes, or comes back, while its game is played. */
export type Admission =
    | { readonly kind: "seat", readonly seat: string }
    | { readonly kind: "spectate" }
    | { readonly kind: "refuse", readonly fault: Fault }

/** The admissions a mode gives. */
export const Admissions = {
    /** It plays, holding this seat as the mode names it. */
    seat: (seat: string): Admission => ({ kind: "seat", seat }),

    /** It only watches. */
    spectate: (): Admission => ({ kind: "spectate" }),

    /** It is told why it does not play, and watches. */
    refuse: (fault: Fault): Admission => ({ kind: "refuse", fault }),
} as const

/**
 * What a mode decides of the people of its game. Each mode brings its own, so what a seat is, and what becomes
 * of one that is left, is the mode's: units of a battle, the team of a duel, a place on a journey.
 *
 * @remarks
 * Every event is asked of every mode: none may be left out, and one that needs nothing does nothing.
 */
export interface ParticipationPolicy {
    /** Someone says it takes part, at any moment of the game: what does it hold? */
    admit(who: Arrival): Admission

    /** A player lost its connection, which may come back. */
    onLost(who: Arrival): void

    /** A player whose connection was lost is back. */
    onBack(who: Arrival): void

    /** A player left the game by itself, and may come back to it. */
    onQuit(who: Arrival): void

    /** A player is gone for good: its session is over. */
    onGone(who: Arrival): void
}

/** What the host knows of someone who takes part. */
interface Taking {
    readonly who: Arrival
    role: ParticipationMessage["role"]
    seat: string|null
    isLost: boolean
}

/**
 * Who takes part in a game, as the host keeps it: a client says it joins, the mode says what it holds, and the
 * host tells it, as a state, so a client that joins again or whose connection comes back is told how it stands.
 *
 * @remarks
 * It knows nothing of what a game is: a seat is a name the mode gives. It turns what the room says (lost, back,
 * leave) and what a client says (join, quit) into one vocabulary the mode answers through its
 * {@link ParticipationPolicy}, and it tells the observers of the same. Saying the same thing twice changes
 * nothing, and a client of another game is not heard.
 *
 * The host takes part as any other, with {@link Participation.addLocal}.
 */
export class Participation {


    /** Told of each client that takes part, the host's own included, with the part it was given. */
    public readonly joined = signal<Arrival>()

    /** Told of each player whose connection is lost. */
    public readonly lost = signal<Arrival>()

    /** Told of each player whose connection came back. */
    public readonly back = signal<Arrival>()

    /** Told of each player that left the game by itself. */
    public readonly quit = signal<Arrival>()

    /** Told of each player gone for good. */
    public readonly gone = signal<Arrival>()

    /** Told of what was dealt with: a message left out, someone the mode told it does not play. */
    public readonly faulted = signal<Fault>()

    constructor(
        room: SyncRoom,

        /** The number of the game, so a message of another one is not heard. */
        public readonly game: number,
        private readonly policy: ParticipationPolicy,
    ){
        this.#handles = [
            room.onJoin(peer => this.#listen(peer)),
            room.onLost(peer => this.#lose(peer)),
            room.onBack(peer => this.#return(peer)),
            room.onLeave(peer => this.#leave(peer)),
        ]
    }


    /** Who takes part, in the order they came. */
    public get members(): readonly Arrival[] {
        return [...this.#taking.values()].map(taking => taking.who)
    }

    /** What someone holds, none when it does not take part. */
    public stateOf(id: string): ParticipationMessage|null {
        const taking = this.#taking.get(id)
        return taking ? { game: this.game, role: taking.role, seat: taking.seat } : null
    }

    /** Is a player's connection lost? */
    public isLost(id: string): boolean {
        return this.#taking.get(id)?.isLost ?? false
    }

    /**
     * Have the host take part as any other: the mode is asked what it holds.
     *
     * @returns What it was given.
     */
    public addLocal(id: string, options?: SettingValues): ParticipationMessage {
        return this.#join({ id, peer: null, options })
    }

    /** Have a client far away take part, as its message does: for a client that says it in another way. */
    public join(peer: SyncPeer, options?: SettingValues): ParticipationMessage {
        return this.#join({ id: peer.id, peer, options })
    }

    /** The host leaves the game by itself, as a client does with its message. */
    public quitLocal(id: string): void {
        this.#quit(id)
    }

    /** Stop listening. */
    public dispose(): void {
        for(const handle of this.#handles) handle.dispose()
        for(const handle of this.#listening.values()) handle.dispose()
        this.#listening.clear()
        this.#taking.clear()
    }


    readonly #handles: readonly { dispose(): void }[]
    readonly #taking = new Map<string, Taking>()
    readonly #listening = new Map<string, { dispose(): void }>()

    #listen(peer: SyncPeer): void {
        this.#listening.get(peer.id)?.dispose()
        this.#listening.set(peer.id, PARTICIPATE_TOPIC.link(peer).listen(text => this.#heard(peer, text)))
    }

    #heard(peer: SyncPeer, text: string): void {
        const message = readParticipateMessage(text)
        if(message instanceof UnreadableFault){
            this.faulted.notify(message)
            return
        }
        if(message.game !== this.game) return
        if(message.kind === "join") this.#join({ id: peer.id, peer, options: message.options })
        else this.#quit(peer.id)
    }

    #join(who: Arrival): ParticipationMessage {
        const known = this.#taking.get(who.id)
        // Someone that plays is told again what it holds; someone that only watches asks the mode again, which may
        // have a place for it now.
        if(known?.role === "player"){
            this.#tell(known)
            return { game: this.game, role: known.role, seat: known.seat }
        }
        const admission = this.policy.admit(who)
        const taking: Taking = {
            who,
            role: admission.kind === "seat" ? "player" : "spectator",
            seat: admission.kind === "seat" ? admission.seat : null,
            isLost: known?.isLost ?? false,
        }
        this.#taking.set(who.id, taking)
        if(admission.kind === "refuse") this.faulted.notify(admission.fault)
        this.#tell(taking)
        // Told once for someone that only watches, and again if it comes to play.
        if(!known || taking.role === "player") this.joined.notify(who)
        return { game: this.game, role: taking.role, seat: taking.seat }
    }

    #quit(id: string): void {
        const taking = this.#taking.get(id)
        if(!taking) return
        this.#taking.delete(id)
        this.quit.notify(taking.who)
        this.policy.onQuit(taking.who)
    }

    #lose(peer: SyncPeer): void {
        const taking = this.#taking.get(peer.id)
        if(!taking || taking.isLost) return
        taking.isLost = true
        this.lost.notify(taking.who)
        this.policy.onLost(taking.who)
    }

    #return(peer: SyncPeer): void {
        const taking = this.#taking.get(peer.id)
        if(!taking) return
        taking.isLost = false
        this.#tell(taking)
        this.back.notify(taking.who)
        this.policy.onBack(taking.who)
    }

    #leave(peer: SyncPeer): void {
        this.#listening.get(peer.id)?.dispose()
        this.#listening.delete(peer.id)
        const taking = this.#taking.get(peer.id)
        if(!taking) return
        this.#taking.delete(peer.id)
        this.gone.notify(taking.who)
        this.policy.onGone(taking.who)
    }

    /** Tell a client what it holds: a client far away only, the host knows it already. */
    #tell(taking: Taking): void {
        const { peer } = taking.who
        if(!peer) return
        const message: ParticipationMessage = { game: this.game, role: taking.role, seat: taking.seat }
        PARTICIPATION_TOPIC.link(peer).send(writeParticipationMessage(message))
    }
}
