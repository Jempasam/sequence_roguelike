import type { SyncPeer, SyncRoom } from "../../../platform"
import { Scope } from "./Scope"
import type { SyncSender } from "./SyncChannel"

/**
 * Several rooms heard as one: the clients that connect to any of them, are lost, come back, or leave, are the
 * clients of the one. It is how a hub sees the clients of its network and the ones that reach it by a link
 * within the program as the same clients, with the same code.
 */
export class MergedRoom implements SyncRoom {


    constructor(private readonly rooms: readonly SyncRoom[]){}


    public onJoin(handler: (peer: SyncPeer) => void): { dispose(): void } {
        return new Scope(...this.rooms.map(room => room.onJoin(handler)))
    }

    public onLost(handler: (peer: SyncPeer) => void): { dispose(): void } {
        return new Scope(...this.rooms.map(room => room.onLost(handler)))
    }

    public onBack(handler: (peer: SyncPeer) => void): { dispose(): void } {
        return new Scope(...this.rooms.map(room => room.onBack(handler)))
    }

    public onLeave(handler: (peer: SyncPeer) => void): { dispose(): void } {
        return new Scope(...this.rooms.map(room => room.onLeave(handler)))
    }
}

/**
 * Several senders used as one: what is sent reaches the viewers of each, and each gives its first messages to
 * the viewers that connect to it. The sender of a {@link MergedRoom}.
 */
export class MergedSender implements SyncSender {


    constructor(private readonly senders: readonly SyncSender[]){}


    public send(message: string): void {
        for(const sender of this.senders) sender.send(message)
    }

    public onPeer(initial: () => string|null): { dispose(): void } {
        return new Scope(...this.senders.map(sender => sender.onPeer(initial)))
    }
}
