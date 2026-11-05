import type { JsonValue, Member } from "@game/server/protocol"

import type { NetPort } from "../../platform"
import type { ChannelKind } from "./Connection"
import type { NetError } from "./NetError"
import { Room } from "./Room"
import type { JoinOptions, Peer, RoomOptions } from "./Room"

/**
 * A member of a room where everyone is equal: a mesh room, with one WebRTC connection to every other
 * member, and what each says about itself known to all. No one has authority over the others: the owner
 * only admits newcomers, and when it leaves, the oldest member takes over.
 *
 * @remarks
 * A mesh of N members opens N(N-1)/2 connections, so the room is capped by its capacity.
 */
export class PTPSymSocket {


    /**
     * Create a mesh room and enter it, alone at first.
     *
     * @param url - The address of the signaling server.
     * @throws {@link NetError} When the server cannot be reached.
     */
    public static async create(net: NetPort, url: string, options: RoomOptions): Promise<PTPSymSocket> {
        return new PTPSymSocket(await Room.create(net, url, "mesh", options))
    }

    /**
     * Enter a mesh room by its code. The connections to the members open afterwards, each told by
     * {@link PTPSymSocket.onPeer}.
     *
     * @param url - The address of the signaling server.
     * @throws {@link NetError} When the room is not found, full, or refuses, or the server cannot be reached.
     */
    public static async join(
        net: NetPort,
        url: string,
        code: string,
        options: JoinOptions = {},
    ): Promise<PTPSymSocket> {
        const room = await Room.join(net, url, code, options)
        if(room.shape !== "mesh"){
            room.close()
            throw new Error(`The room ${code} is a ${room.shape}, where a symmetric socket joins a mesh.`)
        }
        return new PTPSymSocket(room)
    }


    constructor(
        public readonly room: Room,
    ){}


    /** The code other members join with. */
    public get code(): string { return this.room.code }

    /** This member, as the others know it. */
    public get self(): Member { return this.room.self }

    /** The other members, whether their connection is open yet or not. */
    public get peers(): readonly Peer[] { return this.room.peers }

    /** Be told of each member whose connection opens, until the returned handle is disposed. */
    public onPeer(handler: (peer: Peer) => void): { dispose(): void } {
        return this.room.onPeer(handler)
    }

    /** Be told of each member that leaves, or whose connection is lost. */
    public onLeave(handler: (member: Member) => void): { dispose(): void } {
        return this.room.onLeave(handler)
    }

    /** Be told of each member that changes what it says about itself. */
    public onChange(handler: (member: Member) => void): { dispose(): void } {
        return this.room.onChange(handler)
    }

    public onClose(handler: (reason: NetError) => void): { dispose(): void } {
        return this.room.onClose(handler)
    }

    /** Change what this member says about itself, which every other member is told. */
    public setData(data: JsonValue): void {
        this.room.setData(data)
    }

    /** Send a message to every member whose connection is open. */
    public broadcast(message: string, channel?: ChannelKind): void {
        for(const { connection } of this.room.peers) if(connection.state === "open") connection.send(message, channel)
    }

    /** Leave the room, closing every connection of it. */
    public close(): void {
        this.room.close()
    }
}
