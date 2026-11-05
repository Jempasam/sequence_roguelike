import type { TransportAddress } from "../stun"

/** How many allocations one set of credentials may hold at once: a few games open side by side. */
const DEFAULT_MAX_ALLOCATIONS = 8

/** How many bytes per second an allocation relays at most, both ways together: far above a game's need. */
const DEFAULT_BYTES_PER_SECOND = 256 * 1024

/**
 * The IPv4 ranges no peer may be reached at through the relay: this host, its private networks, link-local
 * addresses (where clouds serve their metadata), shared, reserved and multicast ranges. Without them,
 * anyone holding credentials could reach the network behind the server.
 */
const FORBIDDEN_RANGES: readonly (readonly [string, number])[] = [
    ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
    ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 4],
    ["240.0.0.0", 4],
]

/** What the relay is allowed to do. */
export interface RelayPolicyOptions {
    /**
     * May peers on private networks be reached? Only for a relay that serves a private network itself, as
     * in development, where every peer is on this host.
     */
    readonly allowPrivatePeers?: boolean

    readonly maxAllocations?: number
    readonly bytesPerSecond?: number
}

/** The limits of the relay: which peers it reaches, how many allocations and how many bytes it serves. */
export class RelayPolicy {


    public readonly allowPrivatePeers: boolean

    /** How many allocations one set of credentials may hold at once. */
    public readonly maxAllocations: number

    /** How many bytes per second an allocation relays at most. */
    public readonly bytesPerSecond: number


    constructor(options: RelayPolicyOptions = {}){
        this.allowPrivatePeers = options.allowPrivatePeers ?? false
        this.maxAllocations = options.maxAllocations ?? DEFAULT_MAX_ALLOCATIONS
        this.bytesPerSecond = options.bytesPerSecond ?? DEFAULT_BYTES_PER_SECOND
    }


    /** May the relay reach a peer at this address? IPv4 only, as the relay. */
    public allowsPeer(peer: TransportAddress): boolean {
        if(peer.family !== 4) return false
        if(this.allowPrivatePeers) return true
        const ip = ipNumber(peer.address)
        return !FORBIDDEN_RANGES.some(([base, bits]) => inRange(ip, ipNumber(base), bits))
    }

    /** A new meter of the bytes an allocation relays, full. */
    public meter(): ByteMeter {
        return new ByteMeter(this.bytesPerSecond)
    }
}

/**
 * How many bytes an allocation may still relay: a bucket that fills at the allowed rate, up to a second's
 * worth, so a short burst passes and a flood is cut.
 */
export class ByteMeter {


    constructor(
        /** How many bytes per second it lets through. */
        public readonly rate: number,
    ){
        this.#bytes = rate
    }


    /**
     * Take bytes from the bucket, if it holds them.
     *
     * @param now - The current time, in milliseconds.
     * @returns Whether the bytes may be relayed.
     */
    public take(count: number, now = Date.now()): boolean {
        this.#bytes = Math.min(this.rate, this.#bytes + (now - this.#filledAt) / 1000 * this.rate)
        this.#filledAt = now
        if(count > this.#bytes) return false
        this.#bytes -= count
        return true
    }


    #bytes: number
    #filledAt = Date.now()
}

function ipNumber(address: string): number {
    return address.split(".").reduce((number, part) => number * 256 + Number(part), 0)
}

function inRange(ip: number, base: number, bits: number): boolean {
    const size = 2 ** (32 - bits)
    return ip >= base && ip < base + size
}
