import type { SyncPeer } from "../../../../platform"
import type { SyncTopic } from "../SyncChannel"

/** How the connection of a participant stands: lost, it may come back. */
export type Connection = "connected"|"lost"

/** What a participant is to the game: it plays, it only watches, or it left the game. */
export type Presence = "player"|"spectator"|"left"

/**
 * Someone in a game, as the host keeps it: what is proper to its id, whatever the mode makes of it. It stays
 * the same object through a lost connection, and through a leaving and a coming back to the same game.
 *
 * @remarks
 * The run, the team and the plans of a player are its own and live on its client. What the mode ties to it for a
 * while, a seat, is only written here: the mode decides it, and may tie it to another participant afterwards.
 */
export class Participant {


    constructor(
        /** The id of its session, `host` for the host; it stays through a lost connection. */
        public readonly id: string,

        /** The way to tell it things, none for the host that plays on the host itself. */
        public readonly peer: SyncPeer|null,
    ){
        this.name = id
    }


    /** The name it goes by, its id until it is told. */
    public name: string

    public connection: Connection = "connected"
    public presence: Presence = "spectator"

    /** What the mode tied to it, as the mode names it: none for a mode with nothing to give. */
    public seat: string|null = null

    /** Does it play? */
    public get isPlayer(): boolean { return this.presence === "player" }

    /** Tell it something on a topic of its own: nothing is sent to the host, which plays on the spot. */
    public tell(topic: SyncTopic, text: string): void {
        if(this.peer) topic.link(this.peer).send(text)
    }

    /** Hear what it says on a topic. The host says nothing this way. */
    public listen(topic: SyncTopic, handler: (text: string) => void): { dispose(): void } {
        return this.peer ? topic.link(this.peer).listen(handler) : { dispose: () => {} }
    }
}
