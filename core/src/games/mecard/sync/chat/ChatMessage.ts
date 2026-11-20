import { CHAT_TOPIC } from "../SyncChannel"
import { UnreadableFault } from "../faults"
import { readJson, wrongShape } from "../read"

/** The turns of the hue circle, in degrees. */
export const HUE_TURN = 360

/** Who speaks in a chat: the name it goes by and the hue (0 to 360, in degrees) it is written in. */
export interface ChatAuthor {
    readonly name: string
    readonly hue: number
}

/** A line of the chat, as a listener hears it. */
export interface ChatLine {
    /** The id of the peer that said it, `host` for the host. */
    readonly from: string

    readonly author: ChatAuthor
    readonly text: string
}

/** What a client says: its author, and the text. */
export interface ChatMessage {
    readonly author: ChatAuthor
    readonly text: string
}

/** A message as sent. */
export function writeChatMessage(message: ChatMessage): string {
    return JSON.stringify(message)
}

/** Is it a hue? */
function isHue(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value)
}

/** The hue brought back into [0, 360), whatever it was. */
export function wrapHue(hue: number): number {
    return ((hue % HUE_TURN) + HUE_TURN) % HUE_TURN
}

/** A message as received, or why it cannot be read. */
export function readChatMessage(text: string): ChatMessage|UnreadableFault {
    const message = readJson(CHAT_TOPIC.name, text) as Partial<ChatMessage>|null|UnreadableFault
    if(message instanceof UnreadableFault) return message
    const author = typeof message === "object" && message !== null ? message.author : undefined
    const isMessage = typeof message === "object" && message !== null && typeof message.text === "string"
        && typeof author === "object" && author !== null && typeof author.name === "string" && isHue(author.hue)
    if(!isMessage) return wrongShape(CHAT_TOPIC.name, text, "message of the chat")
    const read = message as ChatMessage
    return { author: { name: read.author.name, hue: wrapHue(read.author.hue) }, text: read.text }
}
