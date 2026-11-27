import { ManualScheduler } from "@game/core-src/engine/net/Scheduler"
import { describe, expect, test } from "vitest"

describe("ManualScheduler", () => {
    test("nothing runs until the time moves", () => {
        const scheduler = new ManualScheduler()
        let ran = 0
        scheduler.after(10, () => ran++)
        expect(ran).toBe(0)
        scheduler.advance(9)
        expect(ran).toBe(0)
        scheduler.advance(1)
        expect(ran).toBe(1)
    })

    test("now → moves by what advance gives, and starts at 0", () => {
        const scheduler = new ManualScheduler()
        expect(scheduler.now()).toBe(0)
        scheduler.advance(25)
        expect(scheduler.now()).toBe(25)
    })

    test("several due at once → run in the order they were due", () => {
        const scheduler = new ManualScheduler()
        const order: string[] = []
        scheduler.after(30, () => order.push("c"))
        scheduler.after(10, () => order.push("a"))
        scheduler.after(20, () => order.push("b"))
        scheduler.advance(100)
        expect(order).toEqual(["a", "b", "c"])
    })

    test("run at its due time → now is that time while it runs", () => {
        const scheduler = new ManualScheduler()
        const times: number[] = []
        scheduler.after(10, () => times.push(scheduler.now()))
        scheduler.after(40, () => times.push(scheduler.now()))
        scheduler.advance(100)
        expect(times).toEqual([10, 40])
        expect(scheduler.now()).toBe(100)
    })

    test("cancelled → never runs", () => {
        const scheduler = new ManualScheduler()
        let ran = false
        const wait = scheduler.after(10, () => { ran = true })
        wait.cancel()
        scheduler.advance(100)
        expect(ran).toBe(false)
    })

    test("run once → not run again by a later advance", () => {
        const scheduler = new ManualScheduler()
        let ran = 0
        scheduler.after(10, () => ran++)
        scheduler.advance(10)
        scheduler.advance(10)
        expect(ran).toBe(1)
    })

    test("timer set by a timer that is due within the same advance → runs in that advance", () => {
        const scheduler = new ManualScheduler()
        const order: string[] = []
        scheduler.after(10, () => {
            order.push("first")
            scheduler.after(10, () => order.push("second"))
        })
        scheduler.advance(30)
        expect(order).toEqual(["first", "second"])
    })

    test("timer set by a timer that is due after this advance → waits for the next", () => {
        const scheduler = new ManualScheduler()
        const order: string[] = []
        scheduler.after(10, () => {
            order.push("first")
            scheduler.after(10, () => order.push("second"))
        })
        scheduler.advance(15)
        expect(order).toEqual(["first"])
        scheduler.advance(5)
        expect(order).toEqual(["first", "second"])
    })
})
