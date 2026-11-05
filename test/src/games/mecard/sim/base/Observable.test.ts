import { describe, expect, test } from "vitest"
import { Observable } from "@game/core/mecard"

// --- Tests ---

describe("Observable.notify", () => {
    test("a listener throws → the next ones still run, the error reported", () => {
        const errors: unknown[] = []
        const observable = new Observable<number>(error => errors.push(error))
        const heard: number[] = []
        observable.add(() => { throw new Error("broken") })
        observable.add(value => heard.push(value))
        observable.notify(3)
        expect(heard).toEqual([3])
        expect(errors).toHaveLength(1)
    })

    test("removed during a notification → still called this time, not the next", () => {
        const observable = new Observable<void>(() => {})
        let calls = 0
        const second = { remove: () => {} }
        observable.add(() => second.remove())
        Object.assign(second, observable.add(() => calls++))
        observable.notify()
        observable.notify()
        expect(calls).toBe(1)
    })
})
