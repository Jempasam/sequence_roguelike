import { describe, expect, test } from "vitest"
import { AnimationChain } from "@game/core"
import { Observable } from "@game/core/mecard"
import { animate } from "@game/core/mecard/animate"
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

describe("animate", () => {
    test("an event told while another plays → forwarded when its turn comes, not when told", async() => {
        const { chain, forwarded } = setup()
        const observable = new Observable<number>(() => {})
        const told = listened(forwarded, observable)
        let release = (): void => {}
        chain.add(() => new Promise<void>(resolve => {
            release = resolve
        }))
        animate(chain, forwarded, observable, () => () => Promise.resolve())
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
        animate(chain, forwarded, observable, () => () => new Promise<void>(resolve => {
            finish = resolve
        }))
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
        animate(chain, forwarded, observable, () => () => Promise.resolve())
        observable.notify(1)
        observable.notify(2)
        await settled()
        expect(told).toEqual(["start 1", "end 1", "start 2", "end 2"])
    })

    test("no animation → the event takes its place in the chain and is forwarded", async() => {
        const { chain, forwarded } = setup()
        const observable = new Observable<number>(() => {})
        const told = listened(forwarded, observable)
        animate(chain, forwarded, observable)
        observable.notify(1)
        await settled()
        expect(told).toEqual(["start 1", "end 1"])
    })

    test("no animation, nothing to forward to → nothing is added to the chain", () => {
        const { chain } = setup()
        const observable = new Observable<number>(() => {})
        animate(chain, null, observable)
        observable.notify(1)
        expect(chain.busy).toBe(false)
    })

    test("observer removed → the event is not added", () => {
        const { chain, forwarded } = setup()
        const observable = new Observable<number>(() => {})
        animate(chain, forwarded, observable, () => () => Promise.resolve()).remove()
        observable.notify(1)
        expect(chain.busy).toBe(false)
    })
})
