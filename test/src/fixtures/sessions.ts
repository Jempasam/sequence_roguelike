import { Listeners, MemoryConnection, writeSession } from "@game/core"
import type { Connection, NetError, SessionInfo, SessionLink, SessionSocket } from "@game/core"
import type { JsonValue, Member } from "@game/server/protocol"

/** Let what waits in microtasks and soon-after callbacks run, as a network would deliver it. */
export function settle(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve))
}

/**
 * The socket of a host as a test plays it: clients arrive and leave by hand, with a connection within the
 * program, so no signaling server is needed to try the sessions.
 */
export class FakeHostSocket implements SessionSocket {


    public readonly code = "CODE22"

    /** How many members arrived: each gets its own id, as a room would give it. */
    public count = 0

    /** Was the room closed by the host? */
    public isClosed = false

    /** Admit a member as a room would, when its owner gave an admission. */
    public readonly arrived = new Listeners<SessionLink>()
    public readonly left = new Listeners<Member>()
    public readonly closed = new Listeners<NetError>()

    /** The host-side ends, by member id. */
    public readonly ends = new Map<string, Connection>()


    public onClient(handler: (client: SessionLink) => void): { dispose(): void } {
        return this.arrived.add(handler)
    }

    public onLeave(handler: (client: Member) => void): { dispose(): void } {
        return this.left.add(handler)
    }

    public onClose(handler: (reason: NetError) => void): { dispose(): void } {
        return this.closed.add(handler)
    }

    public close(): void {
        this.isClosed = true
    }

    /** A client connecting with what it says of itself: its end of the connection, the host told. */
    public arrive(data: JsonValue): { readonly member: Member, readonly connection: Connection } {
        const member: Member = { id: `member-${this.count++}`, data }
        const [client, host] = MemoryConnection.pair()
        this.ends.set(member.id, host)
        // The host hears of it once the connection opens, as the room tells it.
        void host.opened.then(() => this.arrived.emit({ member, connection: host }))
        return { member, connection: client }
    }

    /** A member leaving, or whose connection was lost. */
    public lose(member: Member): void {
        this.ends.get(member.id)?.close()
        this.left.emit(member)
    }
}

/** What a client says of itself, to join a host with this session. */
export function dataOf(session: SessionInfo): JsonValue {
    return writeSession(session)
}
