import { Fault } from "../../../engine/net/Fault"
import { Observable } from "../sim/base/Observable"
import type { Observer } from "../sim/base/Observable"

/**
 * An observable of the sync of a game. What listens to it may fail without breaking the code that tells it:
 * the failure of a listener is a bug, which is written to the console rather than thrown, as nothing in the
 * sync throws.
 */
export function signal<T>(): Observable<T> {
    return new Observable<T>(error => console.error("A listener of the sync failed:", error))
}

/** What was received and could not be read: no message of the topic, or in another version. */
export class UnreadableFault extends Fault {


    constructor(
        /** The topic it came on. */
        public readonly topic: string,

        /** What it said. */
        public readonly text: string,

        /** What is wrong with it. */
        public readonly detail: string,

        public readonly who: string|null = null,
    ){
        super()
    }


    public describe(): string {
        return `A message of ${this.topic} could not be read: ${this.detail}`
    }
}

/** A message was read and was right, but what it asks for could not be done: the simulation refused it. */
export class UnloadableFault extends Fault {


    constructor(
        public readonly topic: string,

        /** What the simulation said. */
        public readonly detail: string,

        public readonly who: string|null = null,
    ){
        super()
    }


    public describe(): string {
        return `A message of ${this.topic} could not be taken in: ${this.detail}`
    }
}

/** A client gave a plan for a unit it does not play. */
export class NotYoursFault extends Fault {


    constructor(
        public readonly who: string,
        public readonly unit: string,
    ){
        super()
    }


    public describe(): string {
        return `${this.who} does not play ${this.unit}.`
    }
}

/** A client gave a plan for a unit that cannot play it. */
export class UnplayableFault extends Fault {


    constructor(
        public readonly who: string,
        public readonly unit: string,
        public readonly detail: string,
    ){
        super()
    }


    public describe(): string {
        return `${this.who} gave ${this.unit} a plan it cannot play: ${this.detail}`
    }
}

/** A client came to a gathering with no room left for it. */
export class GatheringFullFault extends Fault {


    constructor(
        public readonly who: string|null,
    ){
        super()
    }


    public describe(): string {
        return "The gathering has no room left."
    }
}

/** A client came to a gathering that started already. */
export class AlreadyStartedFault extends Fault {


    constructor(
        public readonly who: string|null,
    ){
        super()
    }


    public describe(): string {
        return "The game started already."
    }
}

/** A client asked for a seat another client, or the host, holds. */
export class SeatTakenFault extends Fault {


    constructor(
        public readonly who: string,
        public readonly unit: string,

        /** The client holding it, none when it is the host's. */
        public readonly holder: string|null,
    ){
        super()
    }


    public describe(): string {
        return `${this.who} asked for ${this.unit}, which ${this.holder ?? "the host"} holds.`
    }
}

/** A client asked for a seat that is not to be given now, or that does not exist. */
export class NotCandidateFault extends Fault {


    constructor(
        public readonly who: string,
        public readonly unit: string,
    ){
        super()
    }


    public describe(): string {
        return `${this.who} asked for ${this.unit}, which is not to be given.`
    }
}

/** The host refused the seat a client asked for. */
export class DeniedFault extends Fault {


    constructor(
        public readonly who: string,
        public readonly unit: string,
    ){
        super()
    }


    public describe(): string {
        return `The host refused ${this.unit} to ${this.who}.`
    }
}

/** A client freed a seat it does not hold. */
export class NotHeldFault extends Fault {


    constructor(
        public readonly who: string,
        public readonly unit: string,
    ){
        super()
    }


    public describe(): string {
        return `${this.who} does not hold ${this.unit}.`
    }
}

/** A question was not answered in time. */
export class TimeoutFault extends Fault {


    constructor(
        public readonly who: string|null,

        /** What was asked. */
        public readonly request: string,
    ){
        super()
    }


    public describe(): string {
        return `${this.who ?? "The host"} did not answer ${this.request} in time.`
    }
}

/** A peer left before it answered. */
export class PeerGoneFault extends Fault {


    constructor(
        public readonly who: string,
    ){
        super()
    }


    public describe(): string {
        return `${this.who} left before it answered.`
    }
}

/** The team a player brought to a duel cannot be loaded: its catalog differs, or it is not a team. */
export class InvalidTeamFault extends Fault {


    constructor(
        public readonly who: string,

        /** What is wrong with it. */
        public readonly detail: string,
    ){
        super()
    }


    public describe(): string {
        return `${this.who} brought a team that cannot be loaded: ${this.detail}`
    }
}

/** No duel can be made of the players left: there are fewer than two camps. */
export class NotEnoughPlayersFault extends Fault {


    constructor(
        /** How many players were to fight. */
        public readonly players: number,
    ){
        super()
    }


    public readonly who = null

    public describe(): string {
        return `${this.players} players cannot make a duel.`
    }
}

/** The battle of a duel could not be made from teams that were valid: that duel is called off. */
export class DuelBuildFault extends Fault {


    constructor(
        /** The number of the duel in its round. */
        public readonly fight: number,
        public readonly detail: string,
    ){
        super()
    }


    public readonly who = null

    public describe(): string {
        return `The duel ${this.fight} could not be made: ${this.detail}`
    }
}

/** The map holds no row of duels ahead of a player that has to go to one. */
export class NoDuelAheadFault extends Fault {


    constructor(
        public readonly who: string|null = null,
    ){
        super()
    }


    public describe(): string {
        return "There is no halt of the duels ahead."
    }
}

/** A halt of the duels could not be laid in a row of the map: that row has none. */
export class DuelLayerFault extends Fault {


    constructor(
        public readonly layer: number,
        public readonly detail: string,
    ){
        super()
    }


    public readonly who = null

    public describe(): string {
        return `No halt of the duels could be laid in the row ${this.layer}: ${this.detail}`
    }
}

/** What an observable or a source of a child tells, as a handle of either kind. */
export type Handle = Observer|{ dispose(): void }

/** What tells of a fault dealt with, and of one that ended it: a brick that never ends has no `ended`. */
export interface FaultSource {
    readonly faulted: { add(listener: (fault: Fault) => void): Handle }
    readonly ended?: { add(listener: (fault: Fault) => void): Handle }
}

/** Where the faults of a brick go: a parent. */
export interface FaultSink {
    readonly faulted: { notify(fault: Fault): void }
    readonly ended?: { notify(fault: Fault): void }
}

/** Stop a handle of either kind. */
export function release(handle: Handle): void {
    if("remove" in handle) handle.remove()
    else handle.dispose()
}

/**
 * Have a parent tell of what its child tells. The `faulted` of the child is always the parent's `faulted`.
 * Its `ended` becomes the `ended` of the parent when the child is indispensable, and a simple `faulted`
 * when the parent goes on without it.
 *
 * @param isIndispensable - Does the parent end with the child?
 * @returns What stops the forwarding.
 */
export function forward(
    child: FaultSource,
    parent: FaultSink,
    isIndispensable: boolean,
): { dispose(): void } {
    const handles = [child.faulted.add(fault => parent.faulted.notify(fault))]
    if(child.ended){
        const target = isIndispensable && parent.ended ? parent.ended : parent.faulted
        handles.push(child.ended.add(fault => target.notify(fault)))
    }
    return { dispose: () => handles.forEach(release) }
}
