import type { NetPort, TimerPort } from "../../platform"
import { PeerJsSignaling } from "./PeerJsSignaling"
import type { SignalingConnector } from "./Signaling"
import { SignalingClient } from "./SignalingClient"

/**
 * The connector of the signaling at an address, whichever it is by the scheme of the address:
 * - `ws://` or `wss://`: the signaling server of the game, which holds stars and meshes.
 * - `peerjs://` or `peerjss://`: the relay of a PeerJS server, which holds stars only.
 *
 * @remarks
 * Made once, where the network and the timer are known, so that nothing between that place and the rooms knows
 * which signaling is used nor what it needs. An address that no signaling answers to fails when the connector
 * is called, as an unreachable server does.
 */
export function signalingAt(net: NetPort, timer: TimerPort, url: string): SignalingConnector {
    if(/^wss?:\/\//i.test(url)) return () => SignalingClient.connect(net, url, timer)
    if(/^peerjss?:\/\//i.test(url)) return async() => new PeerJsSignaling(net, timer, url)
    return () => Promise.reject(new Error(
        `No signaling answers to the address ${url}: it starts with ws://, wss://, peerjs:// or peerjss://.`,
    ))
}
