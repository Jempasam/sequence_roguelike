import { Scope } from "@game/core-src/lifetime/Scope"
import { describe, expect, test } from "vitest"

/** A handle that notes in `log` when it is taken back. */
function noting(log: string[], name: string): { remove(): void } {
    return { remove: () => void log.push(name) }
}

describe("Scope", () => {

    test("takes back everything kept, the last kept first", () => {
        const log: string[] = []
        const scope = new Scope(noting(log, "a"), noting(log, "b"))
        scope.track(noting(log, "c"))
        scope.remove()
        expect(log).toEqual(["c", "b", "a"])
    })

    test("takes back what it was given once, whatever the number of removals", () => {
        const log: string[] = []
        const scope = new Scope(noting(log, "a"))
        scope.remove()
        scope.remove()
        expect(log).toEqual(["a"])
        expect(scope.isRemoved).toBe(true)
    })

    test("takes back at once what is kept after it was removed", () => {
        const log: string[] = []
        const scope = new Scope()
        scope.remove()
        scope.track(noting(log, "late"))
        expect(log).toEqual(["late"])
    })

    test("accepts a function, which is called when the scope is removed", () => {
        const log: string[] = []
        const scope = new Scope(() => void log.push("called"))
        expect(log).toEqual([])
        scope.remove()
        expect(log).toEqual(["called"])
    })

    test("the handle returned takes back what was given with it, and the scope no more", () => {
        const log: string[] = []
        const scope = new Scope()
        const tracked = scope.track(noting(log, "a"), noting(log, "b"))
        scope.track(noting(log, "c"))
        tracked.remove()
        tracked.remove()
        expect(log).toEqual(["b", "a"])
        scope.remove()
        expect(log).toEqual(["b", "a", "c"])
    })

    test("a scope kept in another is taken back with it", () => {
        const log: string[] = []
        const inner = new Scope(noting(log, "inner"))
        const outer = new Scope(inner, noting(log, "outer"))
        outer.remove()
        expect(log).toEqual(["outer", "inner"])
        expect(inner.isRemoved).toBe(true)
    })

    test("a handle that throws does not stop the others, its error is thrown after", () => {
        const log: string[] = []
        const broken = { remove(): void { throw new Error("boom") } }
        const scope = new Scope(noting(log, "a"), broken, noting(log, "c"))
        expect(() => scope.remove()).toThrow("boom")
        expect(log).toEqual(["c", "a"])
        expect(scope.isRemoved).toBe(true)
    })
})
