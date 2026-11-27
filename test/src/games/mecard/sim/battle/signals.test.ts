import { describe, expect, test } from "vitest"
import { Add, ModifierKey } from "@game/core-src/games/mecard/sim/base/Attribute"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { visual } from "@game/core-src/games/mecard/sim/base/Visual"
import * as Areas from "@game/core-src/games/mecard/sim/battle/area/Areas"
import { DamageType } from "@game/core-src/games/mecard/sim/battle/DamageType"
import { SLASH } from "@game/core-src/games/mecard/sim/card/subs/attack/Slash"
import { BLINK } from "@game/core-src/games/mecard/sim/card/subs/movement/Blink"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import * as Blink from "@game/core-src/games/mecard/sim/battle/mecanic/blink"
import * as Walk from "@game/core-src/games/mecard/sim/battle/mecanic/walk"
import { WAIT } from "@game/core-src/games/mecard/sim/card/subs/movement/Wait"
import { Heart } from "@game/core-src/games/mecard/sim/heart/Heart"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import { THORN_HEART } from "@game/core-src/games/mecard/sim/heart/subs/ThornHeartKind"
import { BURN } from "@game/core-src/games/mecard/sim/status/subs/Burn"
import type { Visual } from "@game/core-src/games/mecard/sim/base/Visual"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import type { StrikeSignal } from "@game/core-src/games/mecard/sim/battle/signals"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"

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
        on.observers.of(Walk.WALKED).add(({ unit: who, from, to, duration }) => {
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
        on.observers.of(Blink.BLINKED).add(({ from, to }) => blinks.push(from.position, to.position))
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

    test("a strike with a visual → struck told with the area, the origin, the direction and the visual", () => {
        const on = battle()
        const attacker = unit(on, 3, 3)
        unit(on, 0, 0, { team: MONSTERS })
        const area = Areas.arc(attacker.position, attacker.direction, 1, 0.5)
        const look = visual("slash")
        const struck: StrikeSignal[] = []
        on.signals.struck.add(signal => struck.push(signal))
        on.strike(attacker, area, 1, DamageType.PHYSICAL, () => 1, look)
        expect(struck).toHaveLength(1)
        expect(struck[0].attacker).toBe(attacker)
        expect(struck[0].area).toBe(area)
        expect(struck[0].origin).toEqual(attacker.position)
        expect(struck[0].direction).toEqual(attacker.direction)
        expect(struck[0].visual).toBe(look)
    })

    test("a strike without a visual → struck told with none", () => {
        const on = battle()
        const attacker = unit(on, 3, 3)
        unit(on, 0, 0, { team: MONSTERS })
        const visuals: (Visual | null)[] = []
        on.signals.struck.add(({ visual: look }) => visuals.push(look))
        on.strike(attacker, Areas.arc(attacker.position, attacker.direction, 1, 0.5), 1, DamageType.PHYSICAL)
        expect(visuals).toEqual([null])
    })

    test("a strike on several areas → one struck for each, before any wound", () => {
        const on = battle()
        const attacker = unit(on, 3, 3)
        unit(on, 3, 2, { team: MONSTERS })
        const told: string[] = []
        on.signals.struck.add(() => told.push("struck"))
        on.signals.damaged.add(() => told.push("damaged"))
        const areas = [
            Areas.arc(attacker.position, attacker.direction, 1, 0.5),
            Areas.arc(attacker.position, attacker.direction.times(-1), 1, 0.5),
        ]
        on.strikeMany(attacker, areas, 1, DamageType.PHYSICAL)
        expect(told.filter(name => name === "struck")).toHaveLength(2)
        expect(told.indexOf("damaged")).toBeGreaterThan(told.lastIndexOf("struck"))
    })

    test("a wound dealt by a unit → damaged told with it as its source, none for a wound of its own", () => {
        const on = battle()
        const attacker = unit(on, 3, 3)
        const target = unit(on, 3, 2, { team: MONSTERS })
        const sources: (Unit | null)[] = []
        on.signals.damaged.add(({ source }) => sources.push(source))
        target.hearts.damage(1, DamageType.PHYSICAL, attacker)
        target.hearts.damage(1, DamageType.PHYSICAL, null)
        expect(sources).toEqual([attacker, null])
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
        on.applyStatus(burnt, BURN, 1)
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

    test("a move → told once for all its strides, timed by the speed it goes at", () => {
        const on = battle()
        const walker = unit(on, 3, 5)
        unit(on, 0, 0, { team: MONSTERS })
        const durations: number[] = []
        on.observers.of(Walk.WALKED).add(({ duration }) => durations.push(duration))
        play(on, [[walker, chain(STEP)]])
        expect(durations).toHaveLength(1)
        expect(durations[0]).toBeCloseTo(0.5)
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
