import type { Fault } from "../../../../engine/net/Fault"
import { signal, UnreadableFault } from "../faults"
import { RelayedSource } from "../Relay"
import { CHAT_TOPIC } from "../SyncChannel"
import type { SyncLink } from "../SyncChannel"
import type { Chat } from "./Chat"
import { readChatMessage, writeChatMessage } from "./ChatMessage"
import type { ChatAuthor, ChatLine } from "./ChatMessage"

/**
 * The chat from a client: it says to the host, which copies it to everyone, this client included. What it
 * says is heard back from the host, so a line shows once, in the order the host relayed it.
 *
 * @remarks
 * It is given a link already made, whatever session it is on: it prefixes and filters its own topic.
 */
export class ChatGuest implements Chat {


    public readonly heard = signal<ChatLine>()
    public readonly faulted = signal<Fault>()

    constructor(
        link: SyncLink,

        public readonly self: ChatAuthor,
    ){
        this.#link = CHAT_TOPIC.link(link)
        this.#source = new RelayedSource(CHAT_TOPIC, link)
        this.#source.faulted.add(fault => this.faulted.notify(fault))
        this.#source.heard.add(({ from, message }) => {
            const read = readChatMessage(message)
            if(read instanceof UnreadableFault) this.faulted.notify(read)
            else this.heard.notify({ from, author: read.author, text: read.text })
        })
    }


    public say(text: string): void {
        if(this.#isDisposed) return
        this.#link.send(writeChatMessage({ author: this.self, text }))
    }

    public dispose(): void {
        this.#isDisposed = true
        this.#source.dispose()
    }


    readonly #link: SyncLink
    readonly #source: RelayedSource
    #isDisposed = false
}
