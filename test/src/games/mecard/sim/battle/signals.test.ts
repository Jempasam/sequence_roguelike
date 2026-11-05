import { describe, expect, test } from "vitest"
import {
    Add, BLINK, Burn, Heart, ModifierKey, RED_HEART, SLASH, STEP, THORN_HEART, TICKS_PER_SECOND,
    Vector2, WAIT,
} from "@game/core/mecard"
import type { Battle } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../fixtures"

// --- Fixture builders ---

/** The names of the signals a battle tells, in order. */
function heard(on: Battle): string[] {
    const told: string[] = []
    for(const [name, observable] of Object.entries(on.signals)){
        observable.add(() => told.push(name))
    }
    return told
}

// --- Tests ---

describe("Battle signals", () => {
    test("a round started → the draw phase, each card drawn, then the preparation", () => {
        const on = battle()
        const drawer = on.add({
            name: "drawer", team: MONSTERS, controller: "bot", position: new Vector2(3, 5), direction: Vector2.UP,
            hearts: Heart.many(RED_HEART, 2), decks: [[STEP, STEP, STEP]], bases: { firstDraw: 2 },
        })
        unit(on, 0.5, 0.5)
        const phases: string[] = []
        const drawn: number[] = []
        on.signals.phase.add(phase => phases.push(phase))
        on.signals.drawn.add(({ unit: who, deck }) => { if(who === drawer) drawn.push(deck) })
        on.startRound()
        expect(phases).toEqual(["draw", "preparation"])
        expect(drawn).toEqual([0, 0])
    })

    test("two decks → each card told with the deck it came from", () => {
        const on = battle()
        const drawer = on.add({
            name: "drawer", team: MONSTERS, controller: "bot", position: new Vector2(3, 5), direction: Vector2.UP,
            hearts: Heart.many(RED_HEART, 2), decks: [[STEP, STEP], [STEP]], bases: { firstDraw: 3 },
        })
        unit(on, 0.5, 0.5)
        const drawn: number[] = []
        on.signals.drawn.add(({ unit: who, deck }) => { if(who === drawer) drawn.push(deck) })
        on.startRound()
        expect(drawn).toEqual([0, 1, 0])
    })

    test("a step → one move, from where it stood to where it stopped, as long as it took", () => {
        const on = battle()
        const walker = unit(on, 3, 5)
        unit(on, 0, 0, { team: MONSTERS })
        const moves: { from: Vector2, to: Vector2, duration: number }[] = []
        on.signals.moved.add(({ unit: who, from, to, duration }) => {
            if(who === walker) moves.push({ from: from.position, to: to.position, duration })
        })
        play(on, [[walker, chain(STEP)]])
        expect(moves).toHaveLength(1)
        expect(moves[0].from).toEqual(new Vector2(3, 5))
        expect(moves[0].to.y).toBeCloseTo(3)
        expect(moves[0].duration).toBeGreaterThan(0)
    })

    test("a blink → one blink, its two poses", () => {
        const on = battle()
        const blinker = unit(on, 3, 5)
        unit(on, 0, 0, { team: MONSTERS })
        const blinks: Vector2[] = []
        on.signals.blinked.add(({ from, to }) => blinks.push(from.position, to.position))
        play(on, [[blinker, chain(BLINK)]])
        expect(blinks[0]).toEqual(new Vector2(3, 5))
        expect(blinks[1].y).toBeLessThan(5)
    })

    test("a slash killing → its sweep shown, then each heart lost, the wound, the death", () => {
        const on = battle()
        const attacker = unit(on, 3, 3)
        unit(on, 3, 2, { team: MONSTERS, hearts: Heart.many(RED_HEART, 1) })
        const told = heard(on)
        play(on, [[attacker, chain(SLASH)]])
        const story = told.filter(name => ["effect", "damaged", "heartWounded", "died"].includes(name))
        const firstLoss = story.indexOf("heartWounded")
        expect(firstLoss).toBeGreaterThan(0)
        expect(story.slice(0, firstLoss).every(name => name === "effect")).toBe(true)
        expect(story.slice(firstLoss, firstLoss + 3)).toEqual(["heartWounded", "damaged", "died"])
    })

    test("the bar told → copies, which the battle changes no more", () => {
        const on = battle()
        const attacker = unit(on, 3, 3)
        const target = unit(on, 3, 2, { team: MONSTERS })
        const bars: (readonly Heart[])[] = []
        on.signals.damaged.add(({ hearts }) => bars.push(hearts))
        play(on, [[attacker, chain(SLASH)]])
        expect(bars[0]).toHaveLength(target.hearts.all.length)
        expect(bars[0]).not.toBe(target.hearts.all)
        expect(bars[0][0]).not.toBe(target.hearts.all[0])
    })

    test("a thorn heart broken → noticed before it wounds back", () => {
        const on = battle()
        const attacker = unit(on, 3, 3)
        const target = unit(on, 3, 2, { team: MONSTERS })
        target.hearts.give(new Heart(THORN_HEART))
        const told = heard(on)
        play(on, [[attacker, chain(SLASH)]])
        const notice = told.indexOf("notifyHeart")
        expect(notice).toBeGreaterThanOrEqual(0)
        expect(told.indexOf("damaged", notice)).toBeGreaterThan(notice)
    })

    test("a burn at the end of the round → noticed, then the wound", () => {
        const on = battle()
        const burnt = unit(on, 3, 3)
        unit(on, 0, 0, { team: MONSTERS })
        on.startRound()
        on.applyStatus(burnt, new Burn(1))
        const told = heard(on)
        play(on, [[burnt, chain(WAIT)]])
        const notice = told.indexOf("notifyStatus")
        expect(notice).toBeGreaterThanOrEqual(0)
        expect(told.indexOf("damaged", notice)).toBeGreaterThan(notice)
        expect(told.slice(notice + 1, told.indexOf("damaged", notice))).not.toContain("notifyStatus")
    })

    test("a modifier → told as added, then as taken back", () => {
        const on = battle()
        const strong = unit(on, 3, 3)
        const told = heard(on)
        const key = new ModifierKey("test")
        strong.stats.strength.add(key, new Add(1))
        strong.stats.strength.remove(key)
        expect(told).toEqual(["modifierAdded", "modifierRemoved"])
    })

    test("the clock → the ticks played, what a move is timed by", () => {
        const on = battle()
        const walker = unit(on, 3, 5)
        unit(on, 0, 0, { team: MONSTERS })
        let start = -1
        on.signals.moved.add(({ duration }) => { start = on.clock / TICKS_PER_SECOND - duration })
        play(on, [[walker, chain(STEP)]])
        expect(start).toBeGreaterThanOrEqual(0)
        expect(on.clock).toBeGreaterThan(0)
    })

    test("a round played out → the battle waits for the next, which draws once started", () => {
        const on = battle()
        const a = unit(on, 3, 5)
        unit(on, 0, 0, { team: MONSTERS })
        on.startRound()
        on.commit(a, chain())
        on.endPreparation()
        on.playRound()
        expect(on.waiting).toBe(true)
        expect(() => on.commit(a, chain())).toThrow()
        on.startRound()
        expect(on.phase).toBe("preparation")
        expect(on.round).toBe(2)
    })
})
