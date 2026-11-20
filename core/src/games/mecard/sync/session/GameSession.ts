import type { Fault } from "../../../../engine/net/Fault"
import type { SyncRoom } from "../../../../platform"

import { signal } from "../faults"
import { LobbyRoom } from "../lobby/LobbyRoom"
import type { SettingValues } from "../lobby/Setting"
import { Admissions, Participation } from "../participation/Participation"
import type { Admission, Arrival, ParticipationPolicy } from "../participation/Participation"
import { FeedRoom } from "./FeedRoom"
import { Participant } from "./Participant"

/** How a participant left the game: by itself, or for good with its session. */
export type Departure = "quit"|"gone"

/**
 * The people of a game, as the host keeps them: one {@link Participant} for each that asked to take part, whether
 * it plays or watches, and what the mode makes of them, told by one policy.
 *
 * @remarks
 * It is made on a {@link Participation}, which hears what the clients say and what the room says, and turns it
 * into one vocabulary. Its {@link GameSession.room} is a room of the players alone, as the bricks of a mode
 * follow it: a player that is lost, comes back, quits or is gone is told to them as the room tells a client, so no
 * brick ever misses a player that leaves the game and stays in the lobby.
 *
 * It lives as long as the game. The mode brings its policy with {@link GameSession.bind}: what it holds for each
 * participant, a seat, it decides alone.
 */
export class GameSession {


    /** Told of each participant given a part, the host's own included. */
    public readonly joined = signal<Participant>()

    /** Told of each participant whose connection is lost. */
    public readonly lost = signal<Participant>()

    /** Told of each participant whose connection came back. */
    public readonly back = signal<Participant>()

    /** Told of each participant that left the game, and how. */
    public readonly left = signal<{ readonly who: Participant, readonly how: Departure }>()

    /** Told of what was dealt with: a message left out, a client the mode turned away. */
    public readonly faulted = signal<Fault>()

    /** The players alone, as a room: what the bricks of a mode follow. */
    public readonly room: LobbyRoom

    /** What hears the clients and keeps who takes part. */
    public readonly participation: Participation

    constructor(
        lobbyRoom: SyncRoom,

        /** The number of the game: what a client says of another one is not heard. */
        public readonly game: number,
    ){
        this.#feed = new FeedRoom()
        this.room = new LobbyRoom(this.#feed)
        this.participation = new Participation(lobbyRoom, game, {
            admit: who => this.#admit(who),
            onLost: who => this.#lose(who),
            onBack: who => this.#return(who),
            onQuit: who => this.#leave(who, "quit"),
            onGone: who => this.#leave(who, "gone"),
        })
        this.#observers = [this.participation.faulted.add(fault => this.faulted.notify(fault))]
    }


    /** Everyone that took part, players, spectators and those that left, in the order they came. */
    public get participants(): readonly Participant[] {
        return [...this.#participants.values()]
    }

    /** The participants that play now. */
    public get players(): readonly Participant[] {
        return this.participants.filter(each => each.presence === "player")
    }

    /** The participants that only watch. */
    public get spectators(): readonly Participant[] {
        return this.participants.filter(each => each.presence === "spectator")
    }

    /** A participant by its id, none when it never took part. */
    public participant(id: string): Participant|null {
        return this.#participants.get(id) ?? null
    }

    /**
     * Give the session the policy of the mode, which decides what each comes to and what is made of what happens
     * to them. A session with none makes spectators of everyone.
     *
     * @returns What takes it back.
     */
    public bind(policy: ParticipationPolicy): { dispose(): void } {
        this.#policy = policy
        return { dispose: () => { if(this.#policy === policy) this.#policy = null } }
    }

    /**
     * Have the host take part as any other: the mode is asked what it holds.
     *
     * @returns The participant of the host.
     */
    public addLocal(id: string, options?: SettingValues): Participant {
        this.participation.addLocal(id, options)
        return this.#make({ id, peer: null })
    }

    /** Stop. */
    public dispose(): void {
        for(const observer of this.#observers) observer.remove()
        this.participation.dispose()
        this.room.dispose()
        this.#feed.dispose()
        this.#participants.clear()
        this.#policy = null
    }


    readonly #feed: FeedRoom
    readonly #observers: readonly { remove(): void }[]
    readonly #participants = new Map<string, Participant>()
    #policy: ParticipationPolicy|null = null

    #make(who: Arrival): Participant {
        const known = this.#participants.get(who.id)
        if(known) return known
        const made = new Participant(who.id, who.peer)
        this.#participants.set(who.id, made)
        return made
    }

    #admit(who: Arrival): Admission {
        const participant = this.#make(who)
        participant.options = who.options ?? {}
        const admission = this.#policy?.admit(who) ?? Admissions.spectate()
        const wasPlayer = participant.isPlayer
        participant.presence = admission.kind === "seat" ? "player" : "spectator"
        participant.seat = admission.kind === "seat" ? admission.seat : null
        participant.connection = "connected"
        this.joined.notify(participant)
        // The bricks of the mode hear of a player once, when it is given its part.
        if(participant.isPlayer && !wasPlayer && participant.peer) this.#feed.join(participant.peer)
        return admission
    }

    #lose(who: Arrival): void {
        const participant = this.#participants.get(who.id)
        if(!participant) return
        participant.connection = "lost"
        this.#policy?.onLost(who)
        this.lost.notify(participant)
        if(participant.isPlayer && participant.peer) this.#feed.lose(participant.peer)
    }

    #return(who: Arrival): void {
        const participant = this.#participants.get(who.id)
        if(!participant) return
        participant.connection = "connected"
        this.#policy?.onBack(who)
        this.back.notify(participant)
        if(participant.isPlayer && participant.peer) this.#feed.back(participant.peer)
    }

    #leave(who: Arrival, how: Departure): void {
        const participant = this.#participants.get(who.id)
        if(!participant) return
        const wasPlayer = participant.isPlayer
        participant.presence = "left"
        participant.seat = null
        if(how === "quit") this.#policy?.onQuit(who)
        else this.#policy?.onGone(who)
        this.left.notify({ who: participant, how })
        // A player that quits is a player that left, to the bricks of the mode, whatever the room says.
        if(wasPlayer && participant.peer) this.#feed.leave(participant.peer)
    }
}
