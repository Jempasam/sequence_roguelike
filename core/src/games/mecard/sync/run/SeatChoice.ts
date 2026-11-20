import type { SyncPeer, SyncRoom } from "../../../../platform"
import { Fault } from "../../../../engine/net/Fault"
import type { Observer } from "../../sim/base/Observable"
import type { Run } from "../../sim/run/Run"

import { SEAT_OFFER_TOPIC, SEAT_RELEASE_TOPIC, SEAT_TAKE_TOPIC } from "../SyncChannel"
import type { SyncSender } from "../SyncChannel"
import { DeniedFault, NotCandidateFault, signal } from "../faults"
import { readSeatWishMessage, writeSeatOfferMessage } from "./SeatOfferMessage"
import type { SeatOffer } from "./SeatOfferMessage"
import type { SeatDealer } from "./SeatDealer"

/**
 * How the host answers a client asking for a seat: polymorphic, so a mode chooses between taking whoever asks
 * first, and having the host decide.
 */
export interface SeatArbiter {
    /** Judge a wish: it ends with {@link SeatChoice.grant} or {@link SeatChoice.deny}, now or later. */
    judge(choice: SeatChoice, guest: string, unit: string): void
}

/** The first to ask is given the seat, if it is free. */
export const FIRST_COME: SeatArbiter = {
    judge: (choice, guest, unit) => { choice.grant(guest, unit) },
}

/**
 * The host decides: a wish is told by {@link HostApproves.wished}, and the screen of the host then calls
 * {@link SeatChoice.grant} or {@link SeatChoice.deny}, at its own pace, as it answers {@link Room.admit}.
 */
export class HostApproves implements SeatArbiter {


    /** Told of each wish, with the client and the unit, which waits for the host. */
    public readonly wished = signal<{ readonly id: string, readonly unit: string }>()


    public judge(_choice: SeatChoice, guest: string, unit: string): void {
        this.wished.notify({ id: guest, unit })
    }
}

/**
 * What lets the clients choose what they play, over what a {@link SeatDealer} gives by itself: a client asks
 * for a seat, the host decides, and every client is told which seats can be asked for and who holds them.
 *
 * @remarks
 * The host stays the authority: a wish is only a wish, and what a client plays it learns from what it is
 * told it plays. With the policy that gives nothing, the seats are the clients' choices alone; with another,
 * what is given by itself is the default, which a client may change.
 *
 * A client is not told of a refusal in particular: it sees that the offer did not change in its favour. The
 * offer is sent again at each change, and whenever the connection of a client comes back, so a client never
 * stays on a stale one. A seat is given or taken during a battle as the mode says, which counts from the
 * next round, as for any seat.
 *
 * Made after the {@link RunHost} it is for, so what it tells follows what the host pruned.
 */
export class SeatChoice {


    /** Told of each seat given to a client on its wish. */
    public readonly claimed = signal<{ readonly id: string, readonly unit: string }>()

    /** Told of each seat a client gave back. */
    public readonly released = signal<{ readonly id: string, readonly unit: string }>()

    /**
     * Told of a wish that could not be granted: the seat is taken, is not to be given, was refused, or is
     * not held. The fault says who asked.
     */
    public readonly faulted = signal<Fault>()

    constructor(
        private readonly dealer: SeatDealer,
        room: SyncRoom,
        sender: SyncSender,
        private readonly arbiter: SeatArbiter,
        engine: Run,
    ){
        this.#engine = engine
        this.#offers = SEAT_OFFER_TOPIC.sender(sender)
        const dealt = dealer.seated.add(() => this.#offer())
        this.#handles = [
            room.onJoin(peer => this.#listen(peer)),
            room.onLeave(peer => this.#left(peer)),
            room.onBack(() => this.#offer()),
            this.#offers.onPeer(() => this.#message()),
            // The seats given by the dealer change what is offered.
            { dispose: () => dealt.remove() },
        ]
        this.#registerObservers()
    }


    /** The run the seats are for. */
    public get engine(): Run { return this.#engine }

    /** Offer the seats of another run in place of this one. */
    public set engine(run: Run){
        this.#unregisterObservers()
        this.#engine = run
        this.#registerObservers()
        this.#offer()
    }

    /**
     * Give a seat a client asked for, and tell everyone. It is for the arbiter, or the screen of the host
     * once it decided.
     *
     * @returns Why it could not be, none when it was: a seat taken meanwhile, a client gone meanwhile.
     */
    public grant(guest: string, unit: string): Fault|null {
        const fault = this.dealer.has(guest)
            ? this.dealer.seats.claim(guest, unit, this.#engine)
            : new NotCandidateFault(guest, unit)
        if(fault){
            this.faulted.notify(fault)
            this.#offer()
            return fault
        }
        this.claimed.notify({ id: guest, unit })
        this.dealer.deal(this.#engine)
        this.#offer()
        return null
    }

    /** Refuse a seat a client asked for, and tell everyone where the seats stand. */
    public deny(guest: string, unit: string): void {
        this.faulted.notify(new DeniedFault(guest, unit))
        this.#offer()
    }

    /** What it offers now. */
    public get offer(): SeatOffer {
        const { seats } = this.dealer
        const held: Record<string, string> = {}
        const candidates = seats.mode.candidates(this.#engine).map(each => each.name)
        for(const name of candidates){
            const holder = seats.holderOf(name)
            if(holder !== null) held[name] = holder
        }
        return { candidates, held }
    }

    /** Stop listening. */
    public dispose(): void {
        this.#unregisterObservers()
        for(const handle of this.#handles) handle.dispose()
        for(const handles of this.#listening.values()) for(const handle of handles) handle.dispose()
        this.#listening.clear()
    }


    readonly #offers: SyncSender
    readonly #handles: readonly { dispose(): void }[]
    readonly #listening = new Map<string, { dispose(): void }[]>()
    #engine: Run
    #observers: Observer[] = []

    #registerObservers(): void {
        const run = this.#engine
        this.#observers = [
            run.heroJoined.add(() => this.#offer()),
            run.heroLeft.add(() => this.#offer()),
            run.battleStarted.add(() => this.#offer()),
            run.phaseChanged.add(() => this.#offer()),
        ]
    }

    #unregisterObservers(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }

    #listen(peer: SyncPeer): void {
        this.#listening.get(peer.id)?.forEach(handle => handle.dispose())
        this.#listening.set(peer.id, [
            SEAT_TAKE_TOPIC.source(peer).listen(text => this.#wished(peer.id, text)),
            SEAT_RELEASE_TOPIC.source(peer).listen(text => this.#giveBack(peer.id, text)),
        ])
    }

    #left(peer: SyncPeer): void {
        for(const handle of this.#listening.get(peer.id) ?? []) handle.dispose()
        this.#listening.delete(peer.id)
        this.#offer()
    }

    #wished(guest: string, text: string): void {
        const wish = readSeatWishMessage(SEAT_TAKE_TOPIC, text)
        if(wish instanceof Fault){
            this.faulted.notify(wish)
            return
        }
        this.arbiter.judge(this, guest, wish.unit)
    }

    #giveBack(guest: string, text: string): void {
        const wish = readSeatWishMessage(SEAT_RELEASE_TOPIC, text)
        if(wish instanceof Fault){
            this.faulted.notify(wish)
            return
        }
        const fault = this.dealer.seats.release(guest, wish.unit)
        if(fault){
            this.faulted.notify(fault)
        } else {
            this.released.notify({ id: guest, unit: wish.unit })
            this.dealer.deal(this.#engine)
        }
        this.#offer()
    }

    #message(): string {
        return writeSeatOfferMessage(this.offer)
    }

    #offer(): void {
        this.#offers.send(this.#message())
    }
}
