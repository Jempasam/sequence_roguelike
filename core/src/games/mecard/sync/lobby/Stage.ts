import type { SyncLink, SyncPeer, SyncRoom } from "../../../../platform"
import type { SyncSender, SyncSource } from "../SyncChannel"

import type { LobbyRoom } from "./LobbyRoom"
import { GameSession } from "../session/GameSession"
import { LobbySender } from "./LobbySender"

/** What a stage keeps to drop with it: the handles of what its game listens to. */
class Handles {


    /** Keep a handle, dropped with the stage or when its owner disposes it first. */
    public track(handle: { dispose(): void }): { dispose(): void } {
        const tracked = {
            dispose: () => {
                this.#handles.delete(tracked)
                handle.dispose()
            },
        }
        this.#handles.add(tracked)
        return tracked
    }

    /** Dispose every handle kept. */
    public disposeAll(): void {
        for(const handle of [...this.#handles]) handle.dispose()
        this.#handles.clear()
    }


    readonly #handles = new Set<{ dispose(): void }>()
}

/**
 * Where a game played from a lobby talks, on the main client: the clients of the lobby and the way to tell them
 * things, both made for this game alone. Disposed with the game, they leave the lobby as it was, so the
 * players come back to it with no connection to open again.
 *
 * @remarks
 * The room of the lobby lives as long as the lobby, so it knows the clients that connected before the game.
 * What the game adds to it is dropped with the stage.
 */
export class HostStage {


    /** The clients of the lobby, told of those already there. */
    public readonly room: SyncRoom

    /** Where the game tells its clients, greeting those already there. */
    public readonly sender: LobbySender

    constructor(
        private readonly lobby: LobbyRoom,
        sender: SyncSender,

        /** The number of the game, which what its clients say is told apart by. */
        public readonly game: number = 0,
    ){
        this.room = {
            onJoin: handler => this.#handles.track(lobby.onJoin(handler)),
            onLost: handler => this.#handles.track(lobby.onLost(handler)),
            onBack: handler => this.#handles.track(lobby.onBack(handler)),
            onLeave: handler => this.#handles.track(lobby.onLeave(handler)),
        }
        this.sender = new LobbySender(sender, lobby)
    }


    /** The clients of the lobby that can be reached now, whether the game made them members or not yet. */
    public get reachable(): readonly SyncPeer[] {
        return this.lobby.reachable
    }

    /**
     * The people of the game, which the bricks of its mode follow as a room of the players alone. It is made when
     * the mode asks for it, for it answers the clients that say they take part: a mode that has its own people
     * must not have two answer.
     */
    public get session(): GameSession {
        this.#session ??= new GameSession(this.lobby, this.game)
        return this.#session
    }

    /** Give each client of the lobby what a client connecting is given, once the game is there to give it. */
    public greetAll(): void {
        this.sender.greetAll()
    }

    /** Stop everything the game asked of the lobby. */
    public dispose(): void {
        this.#session?.dispose()
        this.sender.dispose()
        this.#handles.disposeAll()
    }


    readonly #handles = new Handles()
    #session: GameSession|null = null
}

/**
 * Where a game played from a lobby talks, on a client: the way to the main client and what it tells, of which
 * what the game still listens to is dropped with the game.
 */
export class GuestStage {


    /** The way to the main client, none for a client that only watches. */
    public readonly link: SyncLink|null

    /** What the main client tells. */
    public readonly source: SyncSource

    constructor(
        link: SyncLink|null,
        source: SyncSource,

        /** The id the main client knows this client by, none while it is not told. */
        public readonly id: string|null = null,

        /** The number of the game the host tells, which what is said is told apart by. */
        public readonly game: number = 0,
    ){
        this.link = link === null ? null : {
            send: message => link.send(message),
            listen: handler => this.#handles.track(link.listen(handler)),
        }
        this.source = { listen: handler => this.#handles.track(source.listen(handler)) }
    }


    /** Stop listening to everything the game still does. */
    public dispose(): void {
        this.#handles.disposeAll()
    }


    readonly #handles = new Handles()
}
