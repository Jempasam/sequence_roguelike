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
 * What the seats of a mode are drawn from, and what tells when they may have changed: the run of the host for
 * the modes that play one, the places of a race for the others.
 */
export interface SeatContext<C = Run> {
    /** What the candidates are drawn from now. */
    current(): C

    /** Hear that what the seats are drawn from may have changed, until the returned handle is removed. */
    watch(changed: () => void): { remove(): void }
}

/** The run of the host as what its seats are drawn from: its heroes, its battles and its phases change them. */
export class RunSeatContext implements SeatContext<Run> {


    constructor(run: Run){
        this.#run = run
    }


    public current(): Run { return this.#run }

    /** Draw the seats from another run in place of this one. */
    public set run(run: Run){
        this.#run = run
        for(const listener of [...this.#listeners]) listener.rebind()
    }

    public watch(changed: () => void): { remove(): void } {
        const listener = { observers: [] as Observer[], rebind: () => {} }
        const bind = (): void => {
            for(const observer of listener.observers) observer.remove()
            const run = this.#run
            listener.observers = [
                run.heroJoined.add(changed),
                run.heroLeft.add(changed),
                run.battleStarted.add(changed),
                run.phaseChanged.add(changed),
            ]
        }
        listener.rebind = () => {
            bind()
            changed()
        }
        bind()
        this.#listeners.add(listener)
        return {
            remove: () => {
                for(const observer of listener.observers) observer.remove()
                this.#listeners.delete(listener)
            },
        }
    }


    #run: Run
    readonly #listeners = new Set<{ observers: Observer[], rebind: () => void }>()
}

/**
 * How the host answers a client asking for a seat: polymorphic, so a mode chooses between taking whoever asks
 * first, and having the host decide.
 */
export interface SeatArbiter {
    /** Judge a wish: it ends with {@link SeatChoice.grant} or {@link SeatChoice.deny}, now or later. */
    judge(choice: SeatGrants, guest: string, unit: string): void
}

/** What an arbiter ends a wish with, whatever the seats are drawn from. */
export interface SeatGrants {
    /** Give the seat, and tell everyone. @returns Why it could not be, none when it was. */
    grant(guest: string, unit: string): Fault|null

    /** Refuse the seat, and tell everyone where the seats stand. */
    deny(guest: string, unit: string): void
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


    public judge(_choice: SeatGrants, guest: string, unit: string): void {
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
export class SeatChoice<C = Run> {


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
        private readonly dealer: SeatDealer<C>,
        room: SyncRoom,
        sender: SyncSender,
        private readonly arbiter: SeatArbiter,
        private readonly context: SeatContext<C>,
    ){
        this.#offers = SEAT_OFFER_TOPIC.sender(sender)
        const dealt = dealer.seated.add(() => this.#offer())
        const watching = context.watch(() => this.#offer())
        this.#handles = [
            room.onJoin(peer => this.#listen(peer)),
            room.onLeave(peer => this.#left(peer)),
            room.onBack(() => this.#offer()),
            this.#offers.onPeer(() => this.#message()),
            // The seats given by the dealer change what is offered.
            { dispose: () => dealt.remove() },
            // What the seats are drawn from changes what is offered.
            { dispose: () => watching.remove() },
        ]
    }


    /** Tell everyone the seats as they stand: for what changes with no seat given, as a seat kept that is not any more. */
    public publish(): void {
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
            ? this.dealer.seats.claim(guest, unit, this.context.current())
            : new NotCandidateFault(guest, unit)
        if(fault){
            this.faulted.notify(fault)
            this.#offer()
            return fault
        }
        this.claimed.notify({ id: guest, unit })
        this.dealer.deal(this.context.current())
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
        const reserved: Record<string, string> = {}
        const candidates = seats.mode.candidates(this.context.current()).map(each => each.name)
        for(const name of candidates){
            const holder = seats.holderOf(name)
            if(holder !== null){
                held[name] = holder
                continue
            }
            // Nobody holds it: it may be kept for who held it.
            const former = seats.formerOf(name)
            if(former && seats.isReservedAgainst(name, "")) reserved[name] = former.id
        }
        return { candidates, held, reserved }
    }

    /** Stop listening. */
    public dispose(): void {
        for(const handle of this.#handles) handle.dispose()
        for(const handles of this.#listening.values()) for(const handle of handles) handle.dispose()
        this.#listening.clear()
    }


    readonly #offers: SyncSender
    readonly #handles: readonly { dispose(): void }[]
    readonly #listening = new Map<string, { dispose(): void }[]>()
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
            this.dealer.deal(this.context.current())
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
