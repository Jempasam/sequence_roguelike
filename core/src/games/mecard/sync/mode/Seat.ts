import type { SyncLink } from "../SyncChannel"

import { ACT_TOPIC, ASK_TOPIC, REPLY_TOPIC, upTopic } from "./messages"

/**
 * What a player asks of « the other side », the manager: the same few calls whether it is far away or on
 * the same
 * client. {@link GameModeGuest} is the same code everywhere, and only the seat differs.
 */
export interface Seat {
    /** Say something on an instance or a store: `{id, message}`. */
    act(json: string): void

    /** Ask something on an instance or a store: `{id, req, message}`. */
    ask(json: string): void

    /** Answer an ask the manager passed on to the owner of an instance: `{req, value}`. */
    reply(json: string): void

    /** Give the manager what the owner of an instance tells of it. */
    up(id: number, text: string): void
}

/** A seat to a manager far away, over the link to it. */
export class RemoteSeat implements Seat {


    constructor(
        private readonly link: SyncLink,
    ){}


    public act(json: string): void {
        ACT_TOPIC.link(this.link).send(json)
    }

    public ask(json: string): void {
        ASK_TOPIC.link(this.link).send(json)
    }

    public reply(json: string): void {
        REPLY_TOPIC.link(this.link).send(json)
    }

    public up(id: number, text: string): void {
        upTopic(id).link(this.link).send(text)
    }
}
