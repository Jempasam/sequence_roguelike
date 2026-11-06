import { describe, expect, test } from "vitest"
import { countText, countTold, stacked, stackUsesText } from "@game/core/mecard/stacks"

// --- Fixture builders ---

function thing(name: string): { readonly name: string } {
    return { name }
}

function usable(charges?: number, refill?: "battle"): Parameters<typeof stackUsesText>[0] {
    return { name: "U", charges, refill } as Parameters<typeof stackUsesText>[0]
}

// --- Tests ---

describe("stacked", () => {
    test("the same instance is one stack, at the place of its first", () => {
        const a = thing("a")
        const b = thing("b")
        const stacks = stacked([a, b, a], each => each)
        expect(stacks.map(stack => stack.first)).toEqual([a, b])
        expect(stacks[0].members).toEqual([a, a])
    })

    test("two instances of the same name stay apart", () => {
        const stacks = stacked([thing("a"), thing("a")], each => each)
        expect(stacks).toHaveLength(2)
    })
})

describe("countText", () => {
    test("tells nothing for one alone", () => {
        expect(countText(1)).toBeNull()
        expect(countText(3)).toBe("3")
    })
})

describe("countTold", () => {
    test("adds the quantity for several, nothing for one", () => {
        expect(countTold("Soigne", 1)).toBe("Soigne")
        expect(countTold("Soigne", 3)).toEqual(expect.anything())
        expect(JSON.stringify(countTold("Soigne", 3))).toContain("3")
    })
})

describe("stackUsesText", () => {
    test("left over full when it refills at each battle", () => {
        expect(stackUsesText(usable(3, "battle"), 4, 6)).toBe("4/6")
    })

    test("the charges left when there are several, none for one", () => {
        expect(stackUsesText(usable(3), 5, 6)).toBe("5")
        expect(stackUsesText(usable(), 1, 1)).toBeNull()
    })
})
