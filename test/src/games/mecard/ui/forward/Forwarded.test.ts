import { describe, expect, test } from "vitest"
import { Observable } from "@game/core-src/lifetime/Observable"
import { Forwarded } from "@game/core/mecard/forwarded"

describe("Forwarded", () => {
    test("an observable forwarded → its handlers hear the value and the phase", () => {
        const forwarded = new Forwarded(() => {})
        const observable = new Observable<number>(() => {})
        const heard: [number, string][] = []
        forwarded.on(observable, (value, phase) => heard.push([value, phase]))
        forwarded.forward(observable, 3, "start")
        forwarded.forward(observable, 3, "end")
        expect(heard).toEqual([[3, "start"], [3, "end"]])
    })

    test("another observable forwarded → the handlers of this one hear nothing", () => {
        const forwarded = new Forwarded(() => {})
        const observable = new Observable<number>(() => {})
        const other = new Observable<number>(() => {})
        const heard: number[] = []
        forwarded.on(observable, value => heard.push(value))
        forwarded.forward(other, 1, "start")
        expect(heard).toEqual([])
    })

    test("observer removed → its handler hears nothing more, the others still do", () => {
        const forwarded = new Forwarded(() => {})
        const observable = new Observable<number>(() => {})
        const heard: string[] = []
        const first = forwarded.on(observable, () => heard.push("first"))
        forwarded.on(observable, () => heard.push("second"))
        first.remove()
        forwarded.forward(observable, 1, "start")
        expect(heard).toEqual(["second"])
    })

    test("a handler that fails → its error is reported and the next handler hears", () => {
        const errors: unknown[] = []
        const forwarded = new Forwarded(error => errors.push(error))
        const observable = new Observable<number>(() => {})
        const heard: number[] = []
        forwarded.on(observable, () => {
            throw new Error("broken")
        })
        forwarded.on(observable, value => heard.push(value))
        forwarded.forward(observable, 1, "start")
        expect(errors).toHaveLength(1)
        expect(heard).toEqual([1])
    })
})
