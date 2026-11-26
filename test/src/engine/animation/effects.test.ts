import { describe, expect, test } from "vitest"
import { effectFn } from "@game/core"

describe("an effect written as a generator", () => {

    test("a context → each animation made runs the generator with it, from its start", () => {
        const seen: string[] = []
        const effect = effectFn<string>(function*(context){
            seen.push(context)
            yield
            seen.push(`${context}!`)
        })
        const animation = effect.create("map")!
        expect(seen).toEqual([])
        animation.start()
        expect(seen).toEqual(["map"])
        expect(animation.update(1)).toBe(false)
        expect(seen).toEqual(["map", "map!"])
    })

    test("two animations made → each runs its own generator", () => {
        let made = 0
        const effect = effectFn<void>(function*(){
            made++
            yield
        })
        effect.create()!.start()
        effect.create()!.start()
        expect(made).toBe(2)
    })
})
