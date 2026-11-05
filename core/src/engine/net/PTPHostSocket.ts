import type { Member } from "@game/server/protocol"

import type { NetPort } from "../../platform"
import type { ChannelKind } from "./Connection"
import type { NetError } from "./NetError"
import { Room } from "./Room"
import type { Peer, RoomOptions } from "./Room"

/**
 * The host of a game, which players connect to: a star room it owns, with one WebRTC connection to each
 * client it lets in. The clients never link to each other, so everything between them goes through the
 * host, which keeps the authority.
 *
 * @remarks
 * The room closes when the host leaves, and every client with it.
 */
export class PTPHostSocket {


    /**
     * Open a room on a signaling server and wait for clients.
     *
     * @param url - The address of the signaling server.
     * @throws {@link NetError} When the server cannot be reached.
     */
    public static async open(net: NetPort, url: string, options: RoomOptions): Promise<PTPHostSocket> {
        return new PTPHostSocket(await Room.create(net, url, "star", options))
    }


    constructor(
        /** The room the host owns. */
        public readonly room: Room,
    ){}


    /** The code clients join with. */
    public get code(): string { return this.room.code }

    /** The clients let in, whether their connection is open yet or not. */
    public get clients(): readonly Peer[] { return this.room.peers }

    /** Be told of each client whose connection opens, until the returned handle is disposed. */
    public onClient(handler: (client: Peer) => void): { dispose(): void } {
        return this.room.onPeer(handler)
    }

    /** Be told of each client that leaves, or whose connection is lost. */
    public onLeave(handler: (client: Member) => void): { dispose(): void } {
        return this.room.onLeave(handler)
    }

    /** Be told once the room closes, with why. */
    public onClose(handler: (reason: NetError) => void): { dispose(): void } {
        return this.room.onClose(handler)
    }

    /** Send a message to every client whose connection is open. */
    public broadcast(message: string, channel?: ChannelKind): void {
        for(const { connection } of this.room.peers) if(connection.state === "open") connection.send(message, channel)
    }

    /** Close the room, and every connection to a client. */
    public close(): void {
        this.room.close()
    }
}
