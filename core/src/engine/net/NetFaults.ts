import { Fault } from "./Fault"
import { NetError } from "./NetError"

/** The signaling server could not be reached, or the connection to it failed. */
export class UnreachableFault extends Fault {


    public readonly who = null

    constructor(
        /** What the layer below said. */
        public readonly detail: string,
    ){
        super()
    }


    public describe(): string {
        return `The signaling server could not be reached: ${this.detail}`
    }
}

/** No room has the code that was asked for. */
export class RoomNotFoundFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "No room has this code."
    }
}

/** A room was to be opened under a code that another open room has. */
export class RoomTakenFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "Another room has this code already."
    }
}

/** The room is full. */
export class RoomFullFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "The room is full."
    }
}

/** The owner of the room refused this client. */
export class RefusedFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "The owner of the room refused to let this client in."
    }
}

/** The host lost the signaling server, so the room closed. */
export class HostLostServerFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "The host lost the signaling server: the room closed."
    }
}

/** The connection to a peer was lost, and may come back until its session expires. */
export class ConnectionLostFault extends Fault {


    constructor(
        public readonly who: string|null,
    ){
        super()
    }


    public describe(): string {
        return `The connection to ${this.who ?? "the host"} was lost.`
    }
}

/** A client came back after its session was over, or never came back in time. */
export class SessionExpiredFault extends Fault {


    constructor(
        public readonly who: string|null,
    ){
        super()
    }


    public describe(): string {
        return `The session of ${this.who ?? "this client"} is over.`
    }
}

/** A client came with the id of a session but not its secret. */
export class BadSecretFault extends Fault {


    constructor(
        public readonly who: string,
    ){
        super()
    }


    public describe(): string {
        return `A client claimed the session ${this.who} with another secret.`
    }
}

/** A client speaks another version of the protocol. */
export class VersionMismatchFault extends Fault {


    constructor(
        public readonly who: string,
        public readonly theirs: number|null,
        public readonly ours: number,
    ){
        super()
    }


    public describe(): string {
        return `${this.who} speaks version ${this.theirs ?? "?"} of the protocol, where this is ${this.ours}.`
    }
}

/** A viewer tried to send to the viewers, which only the main client does. */
export class NotHostFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "A viewer only listens, and sends nothing to the viewers."
    }
}

/** Too much was said to a client that could not be reached: the oldest messages kept for it are lost. */
export class OutboxFullFault extends Fault {


    constructor(
        public readonly who: string|null,
    ){
        super()
    }


    public describe(): string {
        return `Too much was said to ${this.who ?? "the host"} while it could not be reached: the oldest messages are lost.`
    }
}

/**
 * The fault of what a layer below rejected with. This is the boundary with the {@link NetError} of the
 * sockets, which throw: it is caught, and told here as a value.
 */
export function faultOf(error: unknown): Fault {
    if(error instanceof NetError){
        switch(error.reason){
            case "not-found": return new RoomNotFoundFault()
            case "full": return new RoomFullFault()
            case "refused": return new RefusedFault()
            case "taken": return new RoomTakenFault()
            default: return new UnreachableFault(error.message)
        }
    }
    return new UnreachableFault(error instanceof Error ? error.message : String(error))
}
