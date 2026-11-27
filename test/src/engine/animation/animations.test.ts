import { describe, expect, test } from "vitest"
import { after, animationFn, once, queue, timed, together } from "@game/core-src/engine/animation/animations"
import type { Animation } from "@game/core-src/engine/animation/Animation"

/** Play an animation to its end in frames of one second, as an animator does. */
function playOut(animation: Animation, limit = 100): number {
    animation.start()
    let frames = 0
    while(frames < limit){
        frames++
        if(!animation.update(1)){
            animation.end()
            return frames
        }
    }
    animation.end()
    return -1
}

describe("a timed animation", () => {

    test("a duration → it steps each frame and is over once the duration is gone", () => {
        const ages: number[] = []
        const frames = playOut(timed(3, (_dt, age) => ages.push(age)))
        expect(ages).toEqual([1, 2, 3])
        expect(frames).toBe(3)
    })
})

describe("an animation made at once", () => {

    test("once → it runs at its first update and is over", () => {
        let runs = 0
        expect(playOut(once(() => runs++))).toBe(1)
        expect(runs).toBe(1)
    })
})

describe("animations together", () => {

    test("two animations → both start, and it is over when the longer is", () => {
        const log: string[] = []
        const tracked = (name: string, duration: number): Animation => {
            const inner = timed(duration, () => {})
            return {
                start(){ inner.start(); log.push(`${name}:start`) },
                update: dt => inner.update(dt),
                end(){ log.push(`${name}:end`) },
            }
        }
        const frames = playOut(together([tracked("short", 1), tracked("long", 3)]))
        expect(frames).toBe(3)
        expect(log).toEqual(["short:start", "long:start", "short:end", "long:end"])
    })

    test("cut short → each animation still going ends once", () => {
        const ends: string[] = []
        const open = (name: string): Animation => ({
            start(){},
            update: () => true,
            end(){ ends.push(name) },
        })
        const both = together([open("a"), open("b")])
        both.start()
        both.update(1)
        both.end()
        both.end()
        expect(ends).toEqual(["a", "b"])
    })
})

describe("an animation that waits", () => {

    test("a delay → what it makes starts only when the delay is gone", () => {
        let made = 0
        const waiting = after(2, () => {
            made++
            return once(() => {})
        })
        waiting.start()
        waiting.update(1)
        expect(made).toBe(0)
        waiting.update(1)
        expect(made).toBe(0)
        waiting.update(1)
        expect(made).toBe(1)
    })

    test("nothing to make → it is over", () => {
        expect(playOut(after(0, () => null))).toBe(1)
    })

    test("a queue → each animation is made at its own time, in order", () => {
        const made: number[] = []
        playOut(queue(3, 2, index => {
            made.push(index)
            return once(() => {})
        }))
        expect(made).toEqual([0, 1, 2])
    })
})

describe("an animation written as a generator", () => {

    test("steps → the generator is made at the start and gets the time of each frame", () => {
        const seen: number[] = []
        const animation = animationFn(function*(){
            for(let step = 0; step < 3; step++) seen.push(yield)
        })
        expect(playOut(animation)).toBe(3)
        expect(seen).toEqual([1, 1, 1])
    })

    test("cut short → the finally of the generator runs, once", () => {
        let closed = 0
        const animation = animationFn(function*(){
            try {
                while(true) yield
            }
            finally {
                closed++
            }
        })
        animation.start()
        animation.update(1)
        animation.end()
        animation.end()
        expect(closed).toBe(1)
    })
})
