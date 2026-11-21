import { Observable, signal } from "@game/core"
import { describe, expect, test, vi } from "vitest"

describe("Observable", () => {
    test("listeners → called in the order they were added", () => {
        const observable = new Observable<number>(() => {})
        const heard: string[] = []
        observable.add(event => heard.push(`a${event}`))
        observable.add(event => heard.push(`b${event}`))
        observable.notify(1)
        expect(heard).toEqual(["a1", "b1"])
    })

    test("removed listener → not called again, and removing twice changes nothing", () => {
        const observable = new Observable<number>(() => {})
        const heard: number[] = []
        const observer = observable.add(event => heard.push(event))
        observable.notify(1)
        observer.remove()
        observer.remove()
        observable.notify(2)
        expect(heard).toEqual([1])
        expect(observable.size).toBe(0)
    })

    test("same function added twice → removing one observer removes one registration", () => {
        const observable = new Observable<number>(() => {})
        const heard: number[] = []
        const listener = (event: number) => { heard.push(event) }
        const first = observable.add(listener)
        observable.add(listener)
        first.remove()
        observable.notify(1)
        expect(heard).toEqual([1])
    })

    test("listener that removes itself → the others still hear this event", () => {
        const observable = new Observable<number>(() => {})
        const heard: string[] = []
        const own = observable.add(() => {
            heard.push("own")
            own.remove()
        })
        observable.add(() => heard.push("other"))
        observable.notify(1)
        observable.notify(2)
        expect(heard).toEqual(["own", "other", "other"])
    })

    test("listener that adds another → it hears the next event, not this one", () => {
        const observable = new Observable<number>(() => {})
        const heard: string[] = []
        let added = false
        observable.add(() => {
            if(added) return
            added = true
            observable.add(event => heard.push(`late${event}`))
        })
        observable.notify(1)
        observable.notify(2)
        expect(heard).toEqual(["late2"])
    })

    test("clear → nothing is heard any more", () => {
        const observable = new Observable<number>(() => {})
        const heard: number[] = []
        observable.add(event => heard.push(event))
        observable.clear()
        observable.notify(1)
        expect(heard).toEqual([])
    })

    test("listener that throws → the error goes to the sink and the next ones still hear", () => {
        const errors: unknown[] = []
        const observable = new Observable<number>(error => errors.push(error))
        const heard: number[] = []
        observable.add(() => { throw new Error("boom") })
        observable.add(event => heard.push(event))
        observable.notify(1)
        expect(heard).toEqual([1])
        expect(errors).toHaveLength(1)
    })
})

describe("signal", () => {
    test("listener that throws → written to the console, not thrown", () => {
        const written = vi.spyOn(console, "error").mockImplementation(() => {})
        try {
            const observable = signal<number>()
            observable.add(() => { throw new Error("boom") })
            expect(() => observable.notify(1)).not.toThrow()
            expect(written).toHaveBeenCalledTimes(1)
        } finally {
            written.mockRestore()
        }
    })
})
