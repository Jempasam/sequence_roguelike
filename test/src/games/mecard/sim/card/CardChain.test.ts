import { describe, expect, test } from "vitest"
import {
    CHAIN_SIZE, DOUBLE_DIAGONAL, FIRE, FOCUS, FusionCard, GAMBLE, MergedCard, PRAYER, RandomCard, REPEAT_2,
    PREPARATION, resolve, signatureOf, SLASH, SPELL, STEP, STUNNING_DASH, SWEEP, THRUST, UNSTABLE_THRUST,
    Vector2, WATER,
} from "@game/core/mecard"
import type { RewriteContext } from "@game/core/mecard"

import { battle, chain, MONSTERS, unit } from "../fixtures"

/** Chances always drawn as the option at a place, the last one when there is no such place. */
function drawing(place: number): RewriteContext {
    return { pick: options => options[Math.min(place, options.length - 1)] }
}

// --- Tests ---

describe("CardChain.toString", () => {
    test("no card → (rien)", () => {
        expect(`${chain()}`).toBe("(rien)")
    })

    test("cards → the trees they read as, an empty slot as _", () => {
        expect(`${chain(STEP, SPELL, FIRE, REPEAT_2)}`).toBe(`${STEP.name} > ${SPELL.name}(${FIRE.name}) > ${REPEAT_2.name}(_)`)
    })
})

describe("CardChain.problems", () => {
    test("5 cards → too many", () => {
        expect(chain(STEP, STEP, STEP, STEP, STEP).isValid(CHAIN_SIZE)).toBe(false)
    })

    test("an element alone, a modifier with an empty slot → valid, greyed out", () => {
        expect(chain(FIRE).isValid(CHAIN_SIZE)).toBe(true)
        expect(chain(REPEAT_2).isValid(CHAIN_SIZE)).toBe(true)
    })

    test("a spell with its element → valid, 2 cards", () => {
        const spell = chain(SPELL, FIRE)
        expect(spell.isValid(CHAIN_SIZE)).toBe(true)
        expect(spell.size).toBe(2)
    })
})

describe("resolve", () => {
    test("repeat ×2 of an attack → 2 steps", () => {
        expect(resolve([REPEAT_2, SLASH], drawing(0)).chain.actionsLeft()).toHaveLength(2)
    })

    test("double diagonal of an attack → 1 step", () => {
        expect(resolve([DOUBLE_DIAGONAL, SLASH], drawing(0)).chain.actionsLeft()).toHaveLength(1)
    })

    test("a modifier with nothing on its right → greyed out, nothing played", () => {
        const resolution = resolve([STEP, REPEAT_2], drawing(0))
        expect(resolution.chain.actionsLeft()).toHaveLength(1)
        expect(resolution.reading.greyed).toEqual([REPEAT_2])
    })

    test("a preparation card → acting, gone from the chain, no step", () => {
        const resolution = resolve([FOCUS], drawing(0))
        expect(resolution.acting).toEqual([0])
        expect(resolution.cards).toEqual([])
        expect(resolution.chain.actionsLeft()).toHaveLength(0)
    })

    test("a fusion → one card of room, then its cards read from left to right", () => {
        const fused = chain(new FusionCard([REPEAT_2, THRUST, STEP]), SLASH)
        expect(fused.size).toBe(2)
        const resolution = fused.resolve(drawing(0))
        expect(resolution.reading.roots.map(String)).toEqual([`${REPEAT_2.name}(${THRUST.name})`, STEP.name, SLASH.name])
        expect(resolution.chain.actionsLeft()).toHaveLength(4)
    })

    test("a fusion of a fusion → unfolded in turn", () => {
        const resolution = resolve([new FusionCard([new FusionCard([SPELL, FIRE]), STEP])], drawing(0))
        expect(resolution.reading.roots.map(String)).toEqual([`${SPELL.name}(${FIRE.name})`, STEP.name])
    })

    test("a fusion → a preparation, truly giving what its first card gives and taking what its last takes", () => {
        const modifier = new FusionCard([REPEAT_2, GAMBLE])
        expect([modifier.output, modifier.input]).toEqual([PREPARATION, null])
        expect(signatureOf(modifier)).toEqual({ output: REPEAT_2.output, input: GAMBLE.input })
        const blows = new FusionCard([REPEAT_2, THRUST])
        expect(signatureOf(blows)).toEqual({ output: REPEAT_2.output, input: null })
        expect(signatureOf(new FusionCard([PRAYER, THRUST]))).toEqual({ output: THRUST.output, input: null })
    })

    test("a fusion of modifiers before an action → the action taken by both", () => {
        const resolution = resolve([new FusionCard([REPEAT_2, GAMBLE]), THRUST], drawing(0))
        expect(resolution.reading.roots.map(String)).toEqual([`${REPEAT_2.name}(${GAMBLE.name}(${THRUST.name}))`])
        expect(resolution.chain.actionsLeft()).toHaveLength(2)
    })

    test("a fusion plugged into a modifier → its first card taken, the rest after", () => {
        const resolution = resolve([REPEAT_2, new FusionCard([THRUST, PRAYER])], drawing(0))
        expect(resolution.reading.roots.map(String)).toEqual([`${REPEAT_2.name}(${THRUST.name})`])
        expect([resolution.chain.actionsLeft().length, resolution.acting.length]).toEqual([2, 1])
    })

    test("a fusion whose last card is not given its input → unfolded, only that card greyed out", () => {
        const resolution = resolve([new FusionCard([THRUST, REPEAT_2]), FIRE], drawing(0))
        expect(resolution.cards).toEqual([THRUST, REPEAT_2, FIRE])
        expect(resolution.reading.greyed).toEqual([REPEAT_2, FIRE])
        expect(resolution.chain.actionsLeft()).toHaveLength(1)
    })

    test("a card fitting no tree → greyed out", () => {
        const resolution = resolve([new FusionCard([FIRE, WATER])], drawing(0))
        expect(resolution.reading.greyed).toEqual([FIRE, WATER])
    })

    test("a fusion of the catalog → its cards, a gamble of two thrusts", () => {
        const resolution = resolve([UNSTABLE_THRUST], drawing(0))
        expect(resolution.reading.roots.map(String)).toEqual([`${GAMBLE.name}(${REPEAT_2.name}(${THRUST.name}))`])
        expect(resolution.chain.actionsLeft()).toHaveLength(2)
    })

    test("a draw → the card drawn, read in its place", () => {
        const resolution = resolve([SPELL, new RandomCard(FIRE, WATER)], drawing(1))
        expect(resolution.reading.roots.map(String)).toEqual([`${SPELL.name}(${WATER.name})`])
        expect(resolution.origin).toEqual([0, 1])
    })

    test("a merged card → one step", () => {
        expect(resolve([new MergedCard(STEP, THRUST)], drawing(0)).chain.actionsLeft()).toHaveLength(1)
    })

    test("a merged card of a preparation → an error: it plays actions only", () => {
        expect(() => new MergedCard(STEP, new FusionCard([THRUST, SWEEP]))).toThrow()
    })
})

describe("CardChain.preview", () => {
    test("two steps → the second starts where the first ends", () => {
        const on = battle()
        const walker = unit(on, 3, 5)
        const [first, second] = chain(STEP, STEP).preview(on, walker, false)
        expect(second.start.position).toEqual(first.preview?.pose.position)
        expect(second.preview?.pose.position).toEqual(new Vector2(3, 1))
        expect(walker.position).toEqual(new Vector2(3, 5))
    })

    test("a root with hidden nested cards → no preview, and the next one uncertain", () => {
        const on = battle()
        const walker = unit(on, 3, 5)
        const [hidden, next] = chain(REPEAT_2, STEP, STEP).preview(on, walker, true)
        expect(hidden.preview).toBeNull()
        expect(next.uncertain).toBe(true)
    })

    test("a gamble → its action shown, marked 50 %", () => {
        const on = battle()
        const gambler = unit(on, 3, 5)
        const [root] = chain(GAMBLE, THRUST).preview(on, gambler, false)
        const kinds = root.preview?.indicators.map(indicator => indicator.kind)
        expect(kinds).toEqual(["label", "polygon"])
    })

    test("a preview → the battle untouched", () => {
        const on = battle()
        const attacker = unit(on, 3, 3)
        const target = unit(on, 3, 2, { team: MONSTERS })
        chain(THRUST, STUNNING_DASH).preview(on, attacker, false)
        expect(target.life).toBe(4)
        expect(on.events).toEqual([])
    })

    test("a fusion of two steps → shown as both, the next root after them", () => {
        const on = battle()
        const walker = unit(on, 3, 5)
        const [fused, after] = chain(new FusionCard([STEP, STEP]), STEP).preview(on, walker, true)
        expect(fused.preview?.pose.position).toEqual(new Vector2(3, 1))
        expect(after.uncertain).toBe(false)
    })

    test("a fusion of preparation cards → no preview, nothing uncertain after", () => {
        const on = battle()
        const walker = unit(on, 3, 5)
        const [fused, after] = chain(new FusionCard([FOCUS, FOCUS]), STEP).preview(on, walker, false)
        expect(fused.preview).toBeNull()
        expect(after.uncertain).toBe(false)
    })

    test("a preview of a fusion → the chain left as it was", () => {
        const on = battle()
        const planned = chain(new FusionCard([STEP, STEP]), STEP)
        planned.preview(on, unit(on, 3, 5), false)
        expect(planned.cards).toHaveLength(2)
        expect(planned.cards[0]).toBeInstanceOf(FusionCard)
    })

    test("a draw → no preview, the next root uncertain, the chance of the battle untouched", () => {
        const on = battle()
        const before = on.rng.state
        const walker = unit(on, 3, 5)
        const [drawn, after] = chain(new RandomCard(STEP, THRUST), STEP).preview(on, walker, false)
        expect(drawn.preview).toBeNull()
        expect(after.uncertain).toBe(true)
        expect(on.rng.state).toBe(before)
    })

    test("a draw for a spell → the spell not shown, as it hangs on the draw", () => {
        const on = battle()
        const [spell] = chain(SPELL, new RandomCard(FIRE, WATER)).preview(on, unit(on, 3, 5), false)
        expect(spell.preview).toBeNull()
    })
})
