import type { Fault } from "../../../../engine/net/Fault"
import type { Observer } from "../../sim/base/Observable"
import { signal, UnreadableFault } from "../faults"
import { NOTHING, Relay } from "../Relay"
import { CHAT_TOPIC } from "../SyncChannel"
import type { SyncRoom, SyncSender } from "../SyncChannel"
import type { Chat } from "./Chat"
import { readChatMessage, writeChatMessage } from "./ChatMessage"
import type { ChatAuthor, ChatLine } from "./ChatMessage"

/**
 * The chat from the host: it copies what each client says to every other, and speaks as a member too.
 *
 * @remarks
 * It is given the room and the channel as they are, with no more to know of the session: whatever opened it
 * and whatever else it carries, a game or a gathering, is not its business. History is not kept: a member
 * that connects hears what is said from then on.
 */
export class ChatHost implements Chat {


    public readonly heard = signal<ChatLine>()
    public readonly faulted = signal<Fault>()

    constructor(
        room: SyncRoom,
        sender: SyncSender,

        public readonly self: ChatAuthor,
    ){
        this.#relay = new Relay(CHAT_TOPIC, room, sender, NOTHING)
        this.#handle = this.#relay.relayed.add(({ from, message }) => {
            const read = readChatMessage(message)
            if(read instanceof UnreadableFault) this.faulted.notify(read)
            else this.heard.notify({ from, author: read.author, text: read.text })
        })
    }


    public say(text: string): void {
        if(this.#isDisposed) return
        this.#relay.send(writeChatMessage({ author: this.self, text }))
    }

    public dispose(): void {
        this.#isDisposed = true
        this.#handle.remove()
        this.#relay.dispose()
    }


    readonly #relay: Relay
    readonly #handle: Observer
    #isDisposed = false
}
