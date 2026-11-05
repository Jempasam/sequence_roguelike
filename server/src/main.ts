import { randomBytes } from "node:crypto"
import { readFileSync } from "node:fs"
import { isIPv4 } from "node:net"

import { IceConfig, SignalingServer } from "./signaling"
import { StunServer } from "./stun"
import { RelayPolicy, TurnCredentials, TurnServer } from "./turn"

/** The port of the signaling WebSocket when PORT is not set. */
const DEFAULT_PORT = 8787

/** The port of STUN and TURN, over UDP and TCP, when STUN_PORT is not set: the standard one. */
const DEFAULT_STUN_PORT = 3478

/** The relay address when RELAY_ADDRESS is not set: this host, for development. */
const DEFAULT_RELAY_ADDRESS = "127.0.0.1"

/** The private IPv4 ranges a development relay may live in, which also let it reach private peers. */
const PRIVATE_ADDRESS = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/

const port = integerOf("PORT", DEFAULT_PORT)
const stunPort = integerOf("STUN_PORT", DEFAULT_STUN_PORT)
const relayAddress = process.env.RELAY_ADDRESS ?? DEFAULT_RELAY_ADDRESS
if(!isIPv4(relayAddress)) throw new Error(`RELAY_ADDRESS must be an IPv4 address, got "${relayAddress}".`)
const publicHost = process.env.PUBLIC_HOST ?? relayAddress

// Without a secret set, one is drawn for this run: signaling and TURN share this process, so it is enough
// for one server, and only several servers behind one name need it set.
const secret = process.env.TURN_SECRET ?? randomBytes(32).toString("hex")
const credentials = new TurnCredentials(secret)

const tls = tlsOf()
const relayPorts = rangeOf("RELAY_PORTS")
const allowPrivatePeers = process.env.ALLOW_PRIVATE_PEERS === undefined
    ? PRIVATE_ADDRESS.test(relayAddress)
    : process.env.ALLOW_PRIVATE_PEERS === "1"

const turn = new TurnServer({
    realm: publicHost,
    credentials,
    relayAddress,
    relayPorts,
    policy: new RelayPolicy({ allowPrivatePeers }),
})
const stun = new StunServer({ port: stunPort, tls, handler: turn })
const signaling = new SignalingServer({
    port,
    ice: new IceConfig({ publicHost, port: stunPort, tlsPort: tls?.port, credentials }),
})
await Promise.all([stun.listening, signaling.listening])
console.log(`TURN relaying from ${relayAddress}${allowPrivatePeers ? ", private peers allowed" : ""}`)

/** Frees the ports, so build/dev.mjs can start the next version of the server after a change. */
export async function stop(): Promise<void> {
    turn.close()
    await Promise.all([signaling.close(), stun.close()])
}

function integerOf(name: string, fallback: number): number {
    const text = process.env[name]
    if(text === undefined) return fallback
    const value = Number(text)
    if(!Number.isInteger(value)) throw new Error(`${name} must be an integer, got "${text}".`)
    return value
}

/** A range of ports written `min-max`, none when the variable is not set. */
function rangeOf(name: string): { min: number, max: number }|undefined {
    const text = process.env[name]
    if(text === undefined) return undefined
    const match = /^(\d+)-(\d+)$/.exec(text)
    const range = match ? { min: Number(match[1]), max: Number(match[2]) } : null
    if(!range || range.min > range.max) throw new Error(`${name} must be a range of ports such as 49152-65535, got "${text}".`)
    return range
}

/** TURN over TLS, served when TLS_CERT and TLS_KEY name the PEM files of a certificate and its key. */
function tlsOf(): { port: number, cert: string, key: string }|undefined {
    const cert = process.env.TLS_CERT
    const key = process.env.TLS_KEY
    if(cert === undefined && key === undefined) return undefined
    if(cert === undefined || key === undefined) throw new Error("TLS needs both TLS_CERT and TLS_KEY.")
    return { port: integerOf("TLS_PORT", 5349), cert: readFileSync(cert, "utf8"), key: readFileSync(key, "utf8") }
}
