import type { Fault } from "../../../../engine/net/Fault"
import type { Observable } from "../../sim/base/Observable"
import type { ChatAuthor, ChatLine } from "./ChatMessage"

/**
 * A group chat as one of its members sees it: the same whether it is the host or a client, and whatever
 * session it was made on. What shows it only needs this.
 */
export interface Chat {
    /** Who speaks for this member. */
    readonly self: ChatAuthor

    /** Told of each line of the chat, whoever said it, this member too. */
    readonly heard: Observable<ChatLine>

    /** Told of what came on the chat and could not be read. */
    readonly faulted: Observable<Fault>

    /** Say a line to everyone. */
    say(text: string): void

    /** Stop hearing and saying. It does not close the session the chat was made on. */
    dispose(): void
}
