import { Scope } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

/** A handle that notes in `log` when it is stopped. */
function noting(log: string[], name: string): { dispose(): void } {
    return { dispose: () => void log.push(name) }
}

describe("Scope", () => {

    test("stops everything kept, the last kept first", () => {
        const log: string[] = []
        const scope = new Scope(noting(log, "a"), noting(log, "b"))
        scope.track(noting(log, "c"))
        scope.dispose()
        expect(log).toEqual(["c", "b", "a"])
    })

    test("stops what it was given once, whatever the number of disposals", () => {
        const log: string[] = []
        const scope = new Scope(noting(log, "a"))
        scope.dispose()
        scope.dispose()
        expect(log).toEqual(["a"])
        expect(scope.isDisposed).toBe(true)
    })

    test("stops at once what is kept after it was disposed", () => {
        const log: string[] = []
        const scope = new Scope()
        scope.dispose()
        scope.track(noting(log, "late"))
        expect(log).toEqual(["late"])
    })

    test("accepts an observer, which is removed rather than disposed", () => {
        const log: string[] = []
        const scope = new Scope({ remove: () => void log.push("removed") })
        scope.dispose()
        expect(log).toEqual(["removed"])
    })

    test("the handle returned stops what was given with it, and the scope no more", () => {
        const log: string[] = []
        const scope = new Scope()
        const tracked = scope.track(noting(log, "a"), noting(log, "b"))
        scope.track(noting(log, "c"))
        tracked.dispose()
        tracked.dispose()
        expect(log).toEqual(["b", "a"])
        scope.dispose()
        expect(log).toEqual(["b", "a", "c"])
    })

    test("a scope kept in another is stopped with it", () => {
        const log: string[] = []
        const inner = new Scope(noting(log, "inner"))
        const outer = new Scope(inner, noting(log, "outer"))
        outer.dispose()
        expect(log).toEqual(["outer", "inner"])
        expect(inner.isDisposed).toBe(true)
    })
})
