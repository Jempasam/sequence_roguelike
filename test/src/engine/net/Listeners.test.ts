import { Listeners } from "@game/core"
import { describe, expect, test } from "vitest"

describe("Listeners", () => {
    test("handlers → called in the order they were added", () => {
        const listeners = new Listeners<number>()
        const heard: string[] = []
        listeners.add(event => heard.push(`a${event}`))
        listeners.add(event => heard.push(`b${event}`))
        listeners.emit(1)
        expect(heard).toEqual(["a1", "b1"])
    })

    test("disposed handler → not called again, and disposing twice changes nothing", () => {
        const listeners = new Listeners<number>()
        const heard: number[] = []
        const handle = listeners.add(event => heard.push(event))
        listeners.emit(1)
        handle.dispose()
        handle.dispose()
        listeners.emit(2)
        expect(heard).toEqual([1])
    })

    test("same function added twice → disposing one handle removes one registration", () => {
        const listeners = new Listeners<number>()
        const heard: number[] = []
        const handler = (event: number) => { heard.push(event) }
        const first = listeners.add(handler)
        listeners.add(handler)
        first.dispose()
        listeners.emit(1)
        expect(heard).toEqual([1])
    })

    test("handler that removes itself → the other handlers still hear this event", () => {
        const listeners = new Listeners<number>()
        const heard: string[] = []
        const own = listeners.add(() => {
            heard.push("own")
            own.dispose()
        })
        listeners.add(() => heard.push("other"))
        listeners.emit(1)
        listeners.emit(2)
        expect(heard).toEqual(["own", "other", "other"])
    })

    test("handler that adds another → it hears the next event, not this one", () => {
        const listeners = new Listeners<number>()
        const heard: string[] = []
        let added = false
        listeners.add(() => {
            if(added) return
            added = true
            listeners.add(event => heard.push(`late${event}`))
        })
        listeners.emit(1)
        listeners.emit(2)
        expect(heard).toEqual(["late2"])
    })

    test("clear → nothing is heard any more", () => {
        const listeners = new Listeners<number>()
        const heard: number[] = []
        listeners.add(event => heard.push(event))
        listeners.clear()
        listeners.emit(1)
        expect(heard).toEqual([])
    })

    test("handler that throws → the error goes to the emitter", () => {
        const listeners = new Listeners<number>()
        listeners.add(() => { throw new Error("boom") })
        expect(() => listeners.emit(1)).toThrow("boom")
    })
})
