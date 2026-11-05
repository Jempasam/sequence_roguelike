import { describe, expect, test } from "vitest"
import { Add, Attribute, CLAMP_ORDER, Clamp, ModifierKey, Multiply } from "@game/core/mecard"

// --- Tests ---

describe("Attribute.value", () => {
    test("modifiers → by order, whatever the order they were added in", () => {
        const attribute = new Attribute(10)
        attribute.add(new ModifierKey("clamp"), new Clamp(0, 15))
        attribute.add(new ModifierKey("double"), new Multiply(2))
        attribute.add(new ModifierKey("add"), new Add(1))
        expect(attribute.value).toBe(15)
        expect(CLAMP_ORDER).toBeGreaterThan(0)
    })

    test("a key taken back → its modifier gone", () => {
        const attribute = new Attribute(1)
        const key = new ModifierKey("add")
        attribute.add(key, new Add(4))
        attribute.remove(key)
        expect(attribute.value).toBe(1)
    })
})

describe("Attribute.toString", () => {
    test("no modifier → the value alone", () => {
        expect(`${new Attribute(4)}`).toBe("4")
    })

    test("a modifier → the value, then the base", () => {
        const attribute = new Attribute(1)
        attribute.add(new ModifierKey("slow"), new Multiply(1 / 3))
        expect(`${attribute}`).toBe("0.33 (base 1)")
    })

    test("a flag → oui or non", () => {
        expect(`${new Attribute(true)}`).toBe("oui")
    })
})
