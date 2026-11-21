import type { SyncLink, SyncPeer, SyncRoom } from "../../../../platform"
import type { Run } from "../../sim/run/Run"

import { SEAT_TOPIC } from "../SyncChannel"
import { signal } from "../faults"
import { writeSeatMessage } from "./SeatMessage"
import type { Seats } from "./Seats"
import type { Removable } from "../../../../lifetime"

/** A client that came to play. */
interface Guest {
    /** The way to tell it what it plays. */
    readonly seats: SyncLink

    /** What it was last told. */
    told: string
}

/** What a client that plays nothing was told, before anything is said. */
const NO_SEAT = writeSeatMessage({ units: [] })

/**
 * What tells each client what it plays: it gives the seats out, with the {@link Seats} it is given, and
 * tells a client again only when what it plays changed.
 *
 * @remarks
 * What it believes it told a client is forgotten when the connection of that client comes back: the client
 * may have missed it, and it would otherwise never be told again, since it would look the same as the last
 * time.
 */
export class SeatDealer<C = Run> {


    /** Told of each client told what it plays, with the units. */
    public readonly seated = signal<{ readonly id: string, readonly units: readonly string[] }>()

    constructor(
        public readonly seats: Seats<C>,
        room: SyncRoom,
    ){
        this.#handle = room.onBack(peer => this.#again(peer))
    }


    /** The ids of the clients that came to play, in the order they came. */
    public get guests(): readonly string[] {
        return [...this.#guests.keys()]
    }

    /** Did a client come to play? */
    public has(id: string): boolean {
        return this.#guests.has(id)
    }

    /** Take a client that came to play in: it is told nothing until something is dealt to it. */
    public add(peer: SyncPeer): void {
        if(this.#guests.has(peer.id)) return
        this.#guests.set(peer.id, { seats: SEAT_TOPIC.link(peer), told: NO_SEAT })
    }

    /** Let a client go, what it played free. */
    public remove(id: string): void {
        if(!this.#guests.delete(id)) return
        this.seats.drop(id)
    }

    /** Give a seat to whoever has none, the host first, then tell those whose seats changed. */
    public deal(context: C): void {
        const { seats } = this
        seats.mode.seatHost(seats, context)
        for(const id of this.#guests.keys()) seats.seat(id, context)
        for(const [id, guest] of this.#guests){
            const text = writeSeatMessage({ units: seats.unitsOf(id) })
            if(text === guest.told) continue
            this.#send(id, guest, text)
        }
    }

    /** Stop listening. */
    public dispose(): void {
        this.#handle.remove()
    }


    readonly #handle: Removable

    /** The clients that came to play, in the order they came, by their ids. */
    readonly #guests = new Map<string, Guest>()

    /** Tell a client what it plays again, as it may have missed it. */
    #again(peer: SyncPeer): void {
        const guest = this.#guests.get(peer.id)
        if(!guest) return
        guest.told = ""
        this.#send(peer.id, guest, writeSeatMessage({ units: this.seats.unitsOf(peer.id) }))
    }

    #send(id: string, guest: Guest, text: string): void {
        guest.told = text
        guest.seats.send(text)
        this.seated.notify({ id, units: this.seats.unitsOf(id) })
    }
}
