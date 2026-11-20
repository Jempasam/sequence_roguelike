import type { SyncLink } from "../SyncChannel"

import { INTENT_TOPIC, TELL_TOPIC, upTopic } from "./messages"

/**
 * What a player asks of « the other side », the manager: the same few calls whether it is far away or on
 * the same
 * client. {@link GameModeGuest} is the same code everywhere, and only the seat differs.
 */
export interface Seat {
    /** Say something to the manager: `{message}`. */
    tell(json: string): void

    /** Say what is wanted done on an instance: `{id, intent}`. */
    intent(json: string): void

    /** Give the manager what the owner of an instance tells of it. */
    up(id: number, text: string): void
}

/** A seat to a manager far away, over the link to it. */
export class RemoteSeat implements Seat {


    constructor(
        private readonly link: SyncLink,
    ){}


    public tell(json: string): void {
        TELL_TOPIC.link(this.link).send(json)
    }

    public intent(json: string): void {
        INTENT_TOPIC.link(this.link).send(json)
    }

    public up(id: number, text: string): void {
        upTopic(id).link(this.link).send(text)
    }
}
