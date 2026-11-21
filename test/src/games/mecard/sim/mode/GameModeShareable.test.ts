import { decodeShareable, encodeShareable, isGameMember, shareable } from "@game/core/mecard/sync"
import type { GameMember, GameModeShareable } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

const ana: GameMember = { id: "a", name: "Ana", connected: true, options: {} }
const known = (id: string): GameMember => id === "a" ? ana : { id, name: id, connected: false, options: {} }

describe("what crosses the API of a mode", () => {
    test("a member → told by its id, and given back as the member of that id", () => {
        const encoded = encodeShareable({ who: ana, list: [ana] }) as { who: unknown, list: unknown[] }
        expect(encoded.who).toEqual({ $member: "a" })
        expect(encoded.list).toEqual([{ $member: "a" }])
        const decoded = decodeShareable(encoded, known) as unknown as { who: GameMember }
        expect(decoded.who).toBe(ana)
    })

    test("a member that is gone → still given, not listed anywhere", () => {
        const decoded = decodeShareable({ who: { $member: "z" } }, known) as unknown as { who: GameMember }
        expect(decoded.who.id).toBe("z")
        expect(decoded.who.connected).toBe(false)
    })

    test("what is not JSON → made as a network would make it", () => {
        const odd = { n: Number.NaN, inf: Infinity, undef: undefined, date: new Date(0), list: [1, undefined] }
        const result = shareable(odd as unknown as GameModeShareable, known)
        expect(result).toEqual({ n: null, inf: null, date: "1970-01-01T00:00:00.000Z", list: [1, null] })
    })

    test("nothing → null", () => {
        expect(shareable(undefined, known)).toBeNull()
        expect(decodeShareable(undefined, known)).toBeNull()
    })

    test("an object that only looks like a member → not one", () => {
        expect(isGameMember({ id: "a" })).toBe(false)
        expect(isGameMember(null)).toBe(false)
        expect(isGameMember([ana])).toBe(false)
        expect(isGameMember(ana)).toBe(true)
    })
})
