import type { WebSocket } from "ws"

import { readServerMessage } from "../protocol"
import type { ServerMessage } from "../protocol"
import { Session } from "./Session"

/** A session over a socket that goes nowhere, keeping what it is sent and how it was closed. */
export interface FakeSession {
    readonly session: Session

    /** What the server said to it, in order. */
    readonly heard: ServerMessage[]

    /** The close code and reason, none while the socket is open. */
    readonly closed: { code: number, reason: string }|null
}

/** Make a session whose socket is open and records what is sent on it. */
export function fakeSession(): FakeSession {
    const heard: ServerMessage[] = []
    const state: { closed: FakeSession["closed"], open: boolean } = { closed: null, open: true }
    const socket = {
        OPEN: 1,
        get readyState(): number { return state.open ? 1 : 3 },
        send: (text: string) => { heard.push(readServerMessage(text)) },
        close: (code: number, reason: string) => {
            state.closed = { code, reason }
            state.open = false
        },
    }
    const session = new Session(socket as unknown as WebSocket)
    return { session, heard, get closed() { return state.closed } }
}

/** Make a session whose socket is already closed: what is sent to it is dropped. */
export function deadSession(): FakeSession {
    const fake = fakeSession()
    fake.session.fail("closed on purpose")
    fake.heard.length = 0
    return fake
}

/** The messages of a type heard so far. */
export function heardOf<T extends ServerMessage["type"]>(
    fake: FakeSession, type: T,
): Extract<ServerMessage, { type: T }>[] {
    const isOfType = (message: ServerMessage): message is Extract<ServerMessage, { type: T }> => {
        return message.type === type
    }
    return fake.heard.filter(isOfType)
}
