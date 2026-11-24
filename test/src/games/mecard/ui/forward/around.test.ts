import { describe, expect, test } from "vitest"
import { AnimationChain } from "@game/core"
import { Observable } from "@game/core/mecard"
import { forwardAround } from "@game/core/mecard/around"
import { Forwarded } from "@game/core/mecard/forwarded"

// --- Fixture builders ---

/** What the forwards of an observable told, in order. */
function listened<T>(forwarded: Forwarded, observable: Observable<T>): string[] {
    const told: string[] = []
    forwarded.on(observable, (value, phase) => told.push(`${phase} ${String(value)}`))
    return told
}

/** Let what plays go on. */
function settled(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0))
}

/** A chain that fails the test on an error, and a forwarded that does the same. */
function setup(): { chain: AnimationChain, forwarded: Forwarded } {
    const fail = (error: unknown): void => {
        throw error
    }
    return { chain: new AnimationChain(fail), forwarded: new Forwarded(fail) }
}

// --- Tests ---

describe("forwardAround", () => {
    test("an event told while another plays → forwarded when its turn comes, not when told", async() => {
        const { chain, forwarded } = setup()
        const observable = new Observable<number>(() => {})
        const told = listened(forwarded, observable)
        let release = (): void => {}
        chain.add(() => new Promise<void>(resolve => {
            release = resolve
        }))
        forwardAround(chain, forwarded, [observable], () => [
            observable.add(() => chain.add(() => Promise.resolve())),
        ])
        observable.notify(1)
        await settled()
        expect(told).toEqual([])
        release()
        await settled()
        expect(told).toEqual(["start 1", "end 1"])
    })

    test("an animation that lasts → start at its beginning, end once it is over", async() => {
        const { chain, forwarded } = setup()
        const observable = new Observable<number>(() => {})
        const told = listened(forwarded, observable)
        let finish = (): void => {}
        forwardAround(chain, forwarded, [observable], () => [
            observable.add(() => chain.add(() => new Promise<void>(resolve => {
                finish = resolve
            }))),
        ])
        observable.notify(1)
        await settled()
        expect(told).toEqual(["start 1"])
        finish()
        await settled()
        expect(told).toEqual(["start 1", "end 1"])
    })

    test("two events → forwarded in the order they play", async() => {
        const { chain, forwarded } = setup()
        const observable = new Observable<number>(() => {})
        const told = listened(forwarded, observable)
        forwardAround(chain, forwarded, [observable], () => [
            observable.add(() => chain.add(() => Promise.resolve())),
        ])
        observable.notify(1)
        observable.notify(2)
        await settled()
        expect(told).toEqual(["start 1", "end 1", "start 2", "end 2"])
    })

    test("two observers of one event → one start before both and one end after both", async() => {
        const { chain, forwarded } = setup()
        const observable = new Observable<number>(() => {})
        const told: string[] = []
        forwarded.on(observable, (_value, phase) => told.push(phase))
        forwardAround(chain, forwarded, [observable], () => [
            observable.add(() => chain.add(() => Promise.resolve().then(() => void told.push("first")))),
            observable.add(() => chain.add(() => Promise.resolve().then(() => void told.push("second")))),
        ])
        observable.notify(1)
        await settled()
        expect(told).toEqual(["start", "first", "second", "end"])
    })

    test("nothing added by the screen → the event is forwarded all the same", async() => {
        const { chain, forwarded } = setup()
        const observable = new Observable<number>(() => {})
        const told = listened(forwarded, observable)
        forwardAround(chain, forwarded, [observable], () => [])
        observable.notify(1)
        await settled()
        expect(told).toEqual(["start 1", "end 1"])
    })

    test("nothing to forward to → nothing is added to the chain", () => {
        const { chain } = setup()
        const observable = new Observable<number>(() => {})
        forwardAround(chain, null, [observable], () => [])
        observable.notify(1)
        expect(chain.busy).toBe(false)
    })

    test("observers removed → the event is not added", () => {
        const { chain, forwarded } = setup()
        const observable = new Observable<number>(() => {})
        const observers = forwardAround(chain, forwarded, [observable], () => [])
        for(const observer of observers) observer.remove()
        observable.notify(1)
        expect(chain.busy).toBe(false)
    })

    test("a hold → the start is told once the hold is over", async() => {
        const { chain, forwarded } = setup()
        const observable = new Observable<number>(() => {})
        const told = listened(forwarded, observable)
        let release = (): void => {}
        const hold = (): Promise<void> => new Promise<void>(resolve => {
            release = resolve
        })
        forwardAround(chain, forwarded, [observable], () => [], new Map([[observable, hold]]))
        observable.notify(1)
        await settled()
        expect(told).toEqual([])
        release()
        await settled()
        expect(told).toEqual(["start 1", "end 1"])
    })

    test("a hold, nothing to forward to → the chain still waits for it", () => {
        const { chain } = setup()
        const observable = new Observable<number>(() => {})
        const hold = (): Promise<void> => new Promise<void>(() => {})
        forwardAround(chain, null, [observable], () => [], new Map([[observable, hold]]))
        observable.notify(1)
        expect(chain.busy).toBe(true)
    })
})
