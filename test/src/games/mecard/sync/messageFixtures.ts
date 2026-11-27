import { UnreadableFault } from "@game/core-src/games/mecard/sync/faults"
import { expect } from "vitest"

/** Texts no message is: not JSON, or JSON of a shape no message has. */
export const NOT_MESSAGES: readonly string[] = ["", "not json", "{", "null", "42", "true", "\"text\"", "[]", "[1,2]"]

/** The reader of a message, as the sync writes them. */
type Reader = (text: string) => unknown

/** Every text no message is → an {@link UnreadableFault}, and never a throw. */
export function expectNoneOf(read: Reader, extra: readonly string[] = []): void {
    for(const text of [...NOT_MESSAGES, ...extra]){
        const result = read(text)
        expect(result, `reading ${JSON.stringify(text)}`).toBeInstanceOf(UnreadableFault)
    }
}

/** What a text read as unreadable says: the fault carries the text it could not read. */
export function expectUnreadable(result: unknown, text: string): UnreadableFault {
    expect(result).toBeInstanceOf(UnreadableFault)
    const fault = result as UnreadableFault
    expect(fault.text).toBe(text)
    expect(fault.describe()).toContain(fault.topic)
    return fault
}
