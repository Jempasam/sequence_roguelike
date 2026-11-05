import type { Member } from "@game/server/protocol"

import type { NetPort } from "../../platform"
import type { ChannelKind, Connection, ConnectionState } from "./Connection"
import { NetError } from "./NetError"
import { Room } from "./Room"
import type { JoinOptions, Peer } from "./Room"

/**
 * A client of a game hosted by another player: a member of the host's star room, with a single WebRTC
 * connection, to the host. It is that connection, and closing it leaves the room.
 */
export class PTPClientSocket implements Connection {


    /**
     * Join a host by the code of its room, and wait until the connection to it is open.
     *
     * @param url - The address of the signaling server.
     * @throws {@link NetError} When the room is not found, full, or refuses, or the host cannot be reached.
     */
    public static async join(
        net: NetPort,
        url: string,
        code: string,
        options: JoinOptions = {},
    ): Promise<PTPClientSocket> {
        const room = await Room.join(net, url, code, options)
        if(room.shape !== "star"){
            room.close()
            throw new Error(`The room ${code} is a ${room.shape}, where a client socket joins a star.`)
        }
        const [host] = room.peers
        if(!host || room.peers.length !== 1){
            room.close()
            const count = room.peers.length
            throw new NetError("protocol", `The room ${code} told of ${count} members, where a host is one.`)
        }
        const socket = new PTPClientSocket(room, host)
        try {
            await socket.opened
        } catch(error){
            room.close()
            throw error
        }
        return socket
    }


    constructor(
        /** The room of the host. */
        public readonly room: Room,

        peer: Peer,
    ){
        this.#peer = peer
        // The host leaving closes the room, and losing the room closes the connection: either way, both end.
        room.onClose(() => peer.connection.close())
        peer.connection.onClose(() => room.close())
    }


    /** The code of the room of the host. */
    public get code(): string { return this.room.code }

    /** The host, as it tells of itself. */
    public get host(): Member { return this.room.peer(this.#peer.member.id)?.member ?? this.#peer.member }

    public get state(): ConnectionState { return this.#peer.connection.state }
    public get opened(): Promise<void> { return this.#peer.connection.opened }

    public send(message: string, channel?: ChannelKind): void {
        this.#peer.connection.send(message, channel)
    }

    public listen(handler: (message: string, channel: ChannelKind) => void): { dispose(): void } {
        return this.#peer.connection.listen(handler)
    }

    public onClose(handler: (reason: NetError) => void): { dispose(): void } {
        return this.#peer.connection.onClose(handler)
    }

    /** Leave the room of the host. Doing it twice changes nothing. */
    public close(): void {
        this.room.close()
    }


    readonly #peer: Peer
}
