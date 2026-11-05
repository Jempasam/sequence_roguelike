import type { ChannelKind, Connection, NetPort } from "@game/core"
import { IceConfig, SignalingServer } from "@game/server/signaling"
import { StunServer } from "@game/server/stun"
import { RelayPolicy, TurnCredentials, TurnServer } from "@game/server/turn"
import { RTCPeerConnection as DataChannelPeer } from "node-datachannel/polyfill"

/** The servers of the network, on free ports of this host: signaling, STUN and TURN. */
export interface NetServer {
    /** The address of the signaling server. */
    readonly url: string

    readonly signaling: SignalingServer
    readonly turn: TurnServer
    close(): Promise<void>
}

/** Start the servers of the network on free ports of this host, relaying between private peers. */
export async function startNetServer(): Promise<NetServer> {
    const credentials = new TurnCredentials("a secret for the tests only")
    const turn = new TurnServer({
        realm: "localhost",
        credentials,
        relayAddress: "127.0.0.1",
        policy: new RelayPolicy({ allowPrivatePeers: true }),
    })
    const stun = new StunServer({ port: 0, handler: turn })
    const { port } = await stun.listening
    const signaling = new SignalingServer({
        port: 0,
        ice: new IceConfig({ publicHost: "127.0.0.1", port, credentials }),
    })
    const signalingPort = await signaling.listening
    return {
        url: `ws://127.0.0.1:${signalingPort}`,
        signaling,
        turn,
        close: async() => {
            turn.close()
            await Promise.all([signaling.close(), stun.close()])
        },
    }
}

/**
 * The network of Node, as the desktop has it: its own WebSocket, and node-datachannel's peer connections.
 *
 * @param relayOnly - Are peers made to reach each other through TURN only, never directly?
 */
export function nodeNet(relayOnly = false): NetPort {
    return {
        openWebSocket: url => new WebSocket(url),
        // As the desktop's NodeNet: node-datachannel's types differ from the DOM's on ondatachannel only.
        createPeer: config => {
            const peer = new DataChannelPeer(relayOnly ? { ...config, iceTransportPolicy: "relay" } : config)
            return peer as unknown as RTCPeerConnection
        },
    }
}

/** The first event a register function tells of, as a promise. */
export function once<T>(register: (handler: (event: T) => void) => { dispose(): void }): Promise<T> {
    return new Promise(resolve => {
        const handle = register(event => {
            handle.dispose()
            resolve(event)
        })
    })
}

/** Something that hears messages, a connection or a sync port. */
interface Listening {
    listen(handler: (message: string) => void): { dispose(): void }
}

/** The first message a connection hears. */
export function nextMessage(connection: Listening): Promise<string> {
    return once(handler => connection.listen(handler))
}

/** The first message a connection hears, and the channel it came by. */
export function nextOnChannel(connection: Connection): Promise<readonly [string, ChannelKind]> {
    return once(handler => connection.listen((message, channel) => handler([message, channel])))
}
