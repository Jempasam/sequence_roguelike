import type { IceServer, PeerSignal } from "@game/server/protocol"

import type { NetPort } from "../../platform"
import type { ChannelKind, Connection, ConnectionState } from "./Connection"
import { ConnectionLife } from "./ConnectionLife"
import { NetError } from "./NetError"

/** The settings of each channel, by its label. */
const CHANNELS: Record<ChannelKind, RTCDataChannelInit> = {
    reliable: { ordered: true },
    unreliable: { ordered: false, maxRetransmits: 0 },
}

/**
 * Which side of the negotiation a peer takes: the one that makes the offer and the channels, or the one
 * that answers it and receives them.
 */
export type PeerRole = "offerer"|"answerer"

/** The way the signals of one peer connection go to the other peer and come back, through a server. */
export interface SignalPath {
    send(signal: PeerSignal): void

    /** Hear each signal from the other peer, until the returned handle is disposed. */
    listen(handler: (signal: PeerSignal) => void): { dispose(): void }
}

/**
 * A connection to one other player over WebRTC data channels, negotiated through a {@link SignalPath}. It
 * opens once both its channels are open, a reliable one and an unreliable one.
 *
 * @remarks
 * Only the offerer makes the channels, and the answerer receives them: node-datachannel starts a
 * negotiation of its own as soon as a channel is made, which on the answering side would cross the offer.
 * Candidates that come before the description they belong to are kept until it is set.
 */
export class PeerConnection implements Connection {


    constructor(
        net: NetPort,
        iceServers: readonly IceServer[],

        /** The id of the member at the other end. */
        public readonly peer: string,

        public readonly role: PeerRole,
        signals: SignalPath,
    ){
        this.#signals = signals
        const peerConnection = net.createPeer({
            iceServers: iceServers.map(server => ({
                urls: [...server.urls], username: server.username, credential: server.credential,
            })),
        })
        this.#peer = peerConnection
        this.#listening = signals.listen(signal => this.#hear(signal))
        peerConnection.onicecandidate = event => {
            // A null candidate marks the end of the candidates, which the other side needs not be told.
            const candidate = event.candidate
            if(!candidate || candidate.candidate === "") return
            signals.send({
                kind: "candidate",
                candidate: candidate.candidate,
                sdpMid: candidate.sdpMid,
                sdpMLineIndex: candidate.sdpMLineIndex,
            })
        }
        peerConnection.onconnectionstatechange = () => {
            // "disconnected" may come back by itself, so only "failed" ends the connection.
            const isFailed = peerConnection.connectionState === "failed"
            if(isFailed) this.#end("unreachable", `No path to ${peer} was found, or it was lost.`)
        }
        if(role === "offerer"){
            for(const kind of ["reliable", "unreliable"] as const){
                this.#attach(peerConnection.createDataChannel(kind, CHANNELS[kind]))
            }
            this.#negotiate(() => this.#offer())
        }
        else peerConnection.ondatachannel = event => this.#attach(event.channel)
    }


    public get state(): ConnectionState { return this.#life.state }
    public get opened(): Promise<void> { return this.#life.opened }

    public send(message: string, channel: ChannelKind = "reliable"): void {
        this.#life.ensureOpen()
        const dataChannel = this.#channels.get(channel)
        if(dataChannel?.readyState !== "open") throw new Error(`The ${channel} channel to ${this.peer} is not open.`)
        dataChannel.send(message)
    }

    public listen(handler: (message: string, channel: ChannelKind) => void): { dispose(): void } {
        return this.#life.messages.add(({ message, channel }) => handler(message, channel))
    }

    public onClose(handler: (reason: NetError) => void): { dispose(): void } {
        return this.#life.onClose(handler)
    }

    public close(): void {
        this.#end("closed", `The connection to ${this.peer} was closed by this end.`)
    }


    readonly #peer: RTCPeerConnection
    readonly #signals: SignalPath
    readonly #listening: { dispose(): void }
    readonly #life = new ConnectionLife()
    readonly #channels = new Map<ChannelKind, RTCDataChannel>()

    /** The candidates heard before the description of the other side was set. */
    readonly #early: RTCIceCandidateInit[] = []

    /** The steps of the negotiation, run one after the other in the order the signals came. */
    #negotiation = Promise.resolve()

    #end(reason: "unreachable"|"protocol"|"closed", message: string, cause?: unknown): void {
        if(!this.#life.end(new NetError(reason, message, { cause }))) return
        this.#listening.dispose()
        this.#peer.close()
    }

    /** Add a step to the negotiation, a failure of which ends the connection. */
    #negotiate(step: () => Promise<void>): void {
        this.#negotiation = this.#negotiation.then(step).catch(error => {
            this.#end("unreachable", `The negotiation with ${this.peer} failed: ${String(error)}`, error)
        })
    }

    async #offer(): Promise<void> {
        const offer = await this.#peer.createOffer()
        await this.#peer.setLocalDescription(offer)
        this.#signals.send({ kind: "description", type: "offer", sdp: offer.sdp ?? "" })
    }

    #hear(signal: PeerSignal): void {
        if(signal.kind === "candidate"){
            const { candidate, sdpMid, sdpMLineIndex } = signal
            this.#negotiate(() => this.#addCandidate({ candidate, sdpMid, sdpMLineIndex }))
            return
        }
        const isExpected = signal.type === (this.role === "offerer" ? "answer" : "offer")
        if(!isExpected){
            this.#end("protocol", `${this.peer} sent an ${signal.type} to the ${this.role}.`)
            return
        }
        this.#negotiate(async() => {
            await this.#peer.setRemoteDescription({ type: signal.type, sdp: signal.sdp })
            for(const candidate of this.#early.splice(0)) await this.#peer.addIceCandidate(candidate)
            if(signal.type === "answer") return
            const answer = await this.#peer.createAnswer()
            await this.#peer.setLocalDescription(answer)
            this.#signals.send({ kind: "description", type: "answer", sdp: answer.sdp ?? "" })
        })
    }

    async #addCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if(this.#peer.remoteDescription) await this.#peer.addIceCandidate(candidate)
        else this.#early.push(candidate)
    }

    #attach(channel: RTCDataChannel): void {
        const kind = channel.label
        if(kind !== "reliable" && kind !== "unreliable"){
            this.#end("protocol", `${this.peer} opened a channel named "${kind}", unknown here.`)
            return
        }
        this.#channels.set(kind, channel)
        channel.onopen = () => {
            const isEveryOpen = [...this.#channels.values()].filter(open => open.readyState === "open").length === 2
            if(isEveryOpen) this.#life.open()
        }
        channel.onmessage = event => {
            if(typeof event.data === "string") this.#life.messages.emit({ message: event.data, channel: kind })
            else this.#end("protocol", `${this.peer} sent binary data, where only text is heard.`)
        }
        channel.onclose = () => this.#end("closed", `${this.peer} closed the connection.`)
    }
}
