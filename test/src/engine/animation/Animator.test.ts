import { describe, expect, test } from "vitest"
import { Animator } from "@game/core"
import type { Animation } from "@game/core"

/** An animation that lasts a number of updates and writes what it lives through. */
function counted(updates: number, log: string[], name = "a"): Animation {
    let left = updates
    return {
        start(){ log.push(`${name}:start`) },
        update(){
            log.push(`${name}:update`)
            return --left > 0
        },
        end(){ log.push(`${name}:end`) },
    }
}

describe("an animator", () => {

    test("an animation played → it starts at once, then moves on at each update", () => {
        const log: string[] = []
        const animator = new Animator(error => { throw error })
        animator.play(counted(2, log))
        animator.update(0.1)
        expect(log).toEqual(["a:start", "a:update"])
        expect(animator.playing).toBe(1)
    })

    test("an animation over → it ends once, leaves, and tells its end", () => {
        const log: string[] = []
        const animator = new Animator(error => { throw error })
        animator.play(counted(1, log), () => log.push("a:over"))
        animator.update(0.1)
        animator.update(0.1)
        expect(log).toEqual(["a:start", "a:update", "a:end", "a:over"])
        expect(animator.playing).toBe(0)
    })

    test("stop → every animation ends once, and a later stop ends nothing more", () => {
        const log: string[] = []
        const animator = new Animator(error => { throw error })
        animator.play(counted(5, log, "a"))
        animator.play(counted(5, log, "b"))
        animator.stop()
        animator.stop()
        expect(log.filter(line => line.endsWith(":end"))).toEqual(["a:end", "b:end"])
        expect(animator.playing).toBe(0)
    })

    test("an animation that fails → its error is told, it ends, and the others go on", () => {
        const errors: unknown[] = []
        const log: string[] = []
        const animator = new Animator(error => errors.push(error))
        const failing: Animation = {
            start(){},
            update(){ throw new Error("broken") },
            end(){ log.push("failing:end") },
        }
        animator.play(failing)
        animator.play(counted(3, log, "b"))
        animator.update(0.1)
        expect(errors).toHaveLength(1)
        expect(log).toContain("failing:end")
        expect(animator.playing).toBe(1)
    })

    test("an animation that fails to start → its error is told, it never plays, and its end is told", () => {
        const errors: unknown[] = []
        let over = false
        const animator = new Animator(error => errors.push(error))
        animator.play({ start(){ throw new Error("no") }, update: () => true, end(){} }, () => { over = true })
        expect(errors).toHaveLength(1)
        expect(over).toBe(true)
        expect(animator.playing).toBe(0)
    })
})
