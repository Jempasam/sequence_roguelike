import { describe, expect, test } from "vitest"
import { AnimationChain, FrameClock } from "@game/core"

// --- Fixture builders ---

/** Let everything already settled go on. */
async function settle(): Promise<void> {
    for(let turn = 0; turn < 10; turn++) await Promise.resolve()
}

/** A chain and a clock, the errors of the chain kept, and what played written down. */
function chained() {
    const errors: unknown[] = []
    const chain = new AnimationChain(error => errors.push(error))
    const clock = new FrameClock()
    const played: string[] = []
    const timed = (name: string, seconds: number) => async() => {
        played.push(`${name} starts`)
        await clock.wait(seconds)
        played.push(`${name} ends`)
    }
    return { chain, clock, played, errors, timed }
}

// --- Tests ---

describe("AnimationChain", () => {
    test("nothing going on → an animation added starts at once", () => {
        const { chain, played, timed } = chained()
        chain.add(timed("first", 1))
        expect(played).toEqual(["first starts"])
        expect(chain.busy).toBe(true)
    })

    test("an animation going on → the next waits for it to end", async() => {
        const { chain, clock, played, timed } = chained()
        chain.add(timed("first", 1))
        chain.add(timed("second", 1))
        expect(chain.waiting).toBe(1)
        clock.advance(0.5)
        await settle()
        expect(played).toEqual(["first starts"])
        clock.advance(0.5)
        await settle()
        expect(played).toEqual(["first starts", "first ends", "second starts"])
    })

    test("every animation over → idle, and the next added starts at once again", async() => {
        const { chain, clock, played, timed } = chained()
        chain.add(timed("first", 1))
        clock.advance(1)
        await settle()
        expect(chain.busy).toBe(false)
        chain.add(timed("second", 1))
        expect(played.at(-1)).toBe("second starts")
    })

    test("cancelled → those not started never play, the one going on ends", async() => {
        const { chain, clock, played, timed } = chained()
        chain.add(timed("first", 1))
        chain.add(timed("second", 1))
        chain.cancel()
        clock.advance(1)
        await settle()
        expect(played).toEqual(["first starts", "first ends"])
        expect(chain.busy).toBe(false)
    })

    test("an animation failing → told, and the next plays", async() => {
        const { chain, played, errors, timed } = chained()
        const failure = new Error("no picture")
        chain.add(() => Promise.reject(failure))
        chain.add(timed("second", 1))
        await settle()
        expect(errors).toEqual([failure])
        expect(played).toEqual(["second starts"])
    })

    test("an animation throwing as it starts → told, and the next plays", async() => {
        const { chain, played, errors, timed } = chained()
        const failure = new Error("no scene")
        chain.add(() => { throw failure })
        chain.add(timed("second", 1))
        await settle()
        expect(errors).toEqual([failure])
        expect(played).toEqual(["second starts"])
    })
})

describe("FrameClock", () => {
    test("a tween → shown from its start to its end, as the frames go by", async() => {
        const clock = new FrameClock()
        const shares: number[] = []
        const over = clock.tween(1, share => shares.push(share))
        clock.advance(0.25)
        clock.advance(1)
        await over
        expect(shares).toEqual([0, 0.25, 1])
        expect(clock.running).toBe(false)
    })

    test("no time to wait → done at once, shown at its end", async() => {
        const clock = new FrameClock()
        const shares: number[] = []
        await clock.tween(0, share => shares.push(share))
        expect(shares).toEqual([1])
    })

    test("finished → what waits ends now, shown at its end", async() => {
        const clock = new FrameClock()
        const shares: number[] = []
        const over = clock.tween(10, share => shares.push(share))
        clock.finish()
        await over
        expect(shares).toEqual([0, 1])
    })
})
