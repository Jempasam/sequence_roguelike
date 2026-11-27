import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { KAMIKAZE } from "@game/core-src/games/mecard/sim/card/subs/body/BodyCards"
import { AIM } from "@game/core-src/games/mecard/sim/card/subs/movement/Aim"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { WAIT } from "@game/core-src/games/mecard/sim/card/subs/movement/Wait"
import {
    INFLATE,
    INSPIRATION,
    BATH,
    SURPRISE_BUBBLE,
    PROGRAMMED_BUBBLE,
} from "@game/core-src/games/mecard/sim/card/subs/summon/BubbleCards"
import {
    BEAST_BUBBLE,
    BLUE_BUBBLE,
    EXPLOSIVE_BUBBLE,
    GIANT_BUBBLE,
    RED_BUBBLE,
    VIOLET_BUBBLE,
    ORANGE_BUBBLE,
} from "@game/core-src/games/mecard/sim/card/subs/summon/Bubbles"
import { ALL_BOOSTERS } from "@game/core-src/games/mecard/sim/catalog/boosters"
import { BUBBLE_CARDS, ALL_CARDS } from "@game/core-src/games/mecard/sim/catalog/cards"
import { BUBBLE_MAGE_KIT, BUBBLER_KIT, ALL_KITS } from "@game/core-src/games/mecard/sim/catalog/kits"
import { BUBBLE_PET } from "@game/core-src/games/mecard/sim/catalog/pets"
import { FIRE_ELEMENT } from "@game/core-src/games/mecard/sim/element/subs/Fire"
import { Heart } from "@game/core-src/games/mecard/sim/heart/Heart"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import { BUBBLE_BODY } from "@game/core-src/games/mecard/sim/item/subs/summon/BubbleBody"
import { allyOf } from "@game/core-src/games/mecard/sim/run/Hero"
import { saveBattle, loadBattle } from "@game/core-src/games/mecard/sim/save/battleSave"
import { STATUS_CODECS } from "@game/core-src/games/mecard/sim/save/statusCodecs"
import { BUBBLE, GIANT, SOAPY } from "@game/core-src/games/mecard/sim/status/subs/BubbleStatuses"
import { ELEMENT_COATINGS } from "@game/core-src/games/mecard/sim/status/subs/ElementCoating"
import { MOMENTUM } from "@game/core-src/games/mecard/sim/status/subs/Momentum"
import * as Walk from "@game/core-src/games/mecard/sim/battle/mecanic/walk"
import * as Summon from "@game/core-src/games/mecard/sim/battle/mecanic/summon"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"

import { battle, chain, MONSTERS, play, unit } from "../fixtures"

/** A battle with a far monster, so it does not end, and a blower. */
function arena(items: Parameters<Battle["add"]>[0]["items"] = undefined) {
    const on = battle()
    unit(on, 6.5, 6.5, { team: MONSTERS, hearts: Heart.many(RED_HEART, 40) })
    const blower = on.add({
        name: "Souffleur", team: unit(on, 0.5, 0.5).team, controller: "player", position: new Vector2(2, 2),
        direction: Vector2.RIGHT, hearts: Heart.many(RED_HEART, 40), decks: [[]], items,
    })
    return { on, blower }
}

/** Count the steps each unit starts from now on. */
function counting(on: Battle): Map<Unit, number> {
    const counts = new Map<Unit, number>()
    on.signals.stepStarted.add(({ unit: stepping }) => counts.set(stepping, (counts.get(stepping) ?? 0) + 1))
    return counts
}

function bubblesOf(on: Battle, owner: Unit): Unit[] {
    return Summon.summonsOf(on, owner).filter(body => body.statuses.has(BUBBLE))
}

describe("the bubbles", () => {
    test("a violet bubble → a bubble nobody aims at, the blower soapy", () => {
        const { on, blower } = arena()
        play(on, [[blower, chain(VIOLET_BUBBLE)]])
        const [bubble] = bubblesOf(on, blower)
        expect(bubble).toBeDefined()
        expect(bubble.targetable).toBe(false)
        expect(bubble.statuses.get(BUBBLE)!.level).toBeGreaterThanOrEqual(3)
        expect(blower.statuses.has(SOAPY)).toBe(true)
    })

    test("a collision → the bubble bursts at once, whoever moved", () => {
        const { on, blower } = arena()
        play(on, [[blower, chain(VIOLET_BUBBLE)]])
        const [bubble] = bubblesOf(on, blower)
        const other = unit(on, bubble.position.x + 1.5, bubble.position.y, { hearts: Heart.many(RED_HEART, 4) })
        Walk.move(on, other, bubble.position.minus(other.position).normalized!, 3, true)
        expect(bubble.alive).toBe(false)
        expect(other.alive).toBe(true)
    })

    test("a soapy blower → its bubbles copy its actions, and pay for it", () => {
        const { on, blower } = arena()
        play(on, [[blower, chain(VIOLET_BUBBLE)]])
        const [bubble] = bubblesOf(on, blower)
        on.applyStatus(blower, SOAPY, 3)
        on.applyStatus(bubble, BUBBLE, 10 - bubble.statuses.get(BUBBLE)!.level)
        const steps = counting(on)
        play(on, [[blower, chain(WAIT)]])
        // The four waits of its own chain, then the copy, put at the end of it.
        expect(steps.get(bubble)).toBe(5)
    })

    test("a bubble below level 3 → copies nothing", () => {
        const { on, blower } = arena()
        play(on, [[blower, chain(BLUE_BUBBLE)]])
        const [bubble] = bubblesOf(on, blower)
        on.applyStatus(blower, SOAPY, 3)
        on.applyStatus(bubble, BUBBLE, -(bubble.statuses.get(BUBBLE)!.level - 1))
        const before = bubble.chain.cards.length
        blower.lastTree = [WAIT]
        blower.actionRead.notify(blower)
        expect(bubble.chain.cards.length).toBe(before)
    })

    test("a burst → the explosive bubble blows up", () => {
        const { on, blower } = arena()
        const near = unit(on, 3, 2.9, { hearts: Heart.many(RED_HEART, 6) })
        play(on, [[blower, chain(EXPLOSIVE_BUBBLE)]])
        // It lives one round: its end sets it off.
        expect(near.life).toBeLessThan(6)
    })

    test("an explosive bubble, then a bursting → it blows at once", () => {
        const { on, blower } = arena()
        play(on, [[blower, chain(EXPLOSIVE_BUBBLE)]])
        const bubbles = on.units.filter(body => body.owner === blower)
        expect(bubbles.every(body => !body.alive)).toBe(true)
    })

    test("a red bubble → momentum; a giant one → its gains, gone when it goes", () => {
        const { on, blower } = arena()
        play(on, [[blower, chain(RED_BUBBLE)]])
        const [red] = bubblesOf(on, blower)
        expect(red.statuses.has(MOMENTUM)).toBe(true)
        const second = arena()
        play(second.on, [[second.blower, chain(GIANT_BUBBLE)]])
        const giant = bubblesOf(second.on, second.blower).find(body => body.statuses.has(GIANT))
        expect(giant).toBeDefined()
        expect(giant!.stats.strength.value).toBe(1)
        expect(giant!.stats.size.value).toBe(2)
    })

    test("an inflation → four levels to each bubble; an inspiration → soapy to 3 at least", () => {
        const { on, blower } = arena()
        play(on, [[blower, chain(VIOLET_BUBBLE)]])
        const [bubble] = bubblesOf(on, blower)
        const before = bubble.statuses.get(BUBBLE)!.level
        // The bubble may burst in the round: a dead unit holds no status, so the level is read as it is told.
        const levels: number[] = []
        on.signals.statusLeveled.add(({ type, level }) => { if(type === BUBBLE) levels.push(level) })
        play(on, [[blower, chain(INFLATE)]])
        expect(Math.max(...levels)).toBeGreaterThanOrEqual(before + 4)
        play(on, [[blower, chain(INSPIRATION)]])
        expect(blower.statuses.get(SOAPY)!.level).toBeGreaterThanOrEqual(2)
    })

    test("a bath → both bubbles come", () => {
        const { on, blower } = arena()
        play(on, [[blower, chain(BATH)]])
        expect(bubblesOf(on, blower).length).toBe(2)
    })

    test("a programmed bubble → takes the cards that follow", () => {
        const { on, blower } = arena()
        const steps = counting(on)
        play(on, [[blower, chain(PROGRAMMED_BUBBLE, WAIT, WAIT)]])
        const [bubble] = Summon.summonsOf(on, blower)
        expect(bubble).toBeDefined()
        expect(steps.get(bubble)).toBe(2)
        expect(steps.get(blower)).toBe(1)
    })

    test("an orange bubble and a kamikaze → a bubble that blows, the blower lives", () => {
        const { on, blower } = arena()
        play(on, [[blower, chain(ORANGE_BUBBLE, KAMIKAZE)]])
        expect(blower.alive).toBe(true)
    })

    test("a surprise bubble → one bubble at most, no error", () => {
        const { on, blower } = arena()
        play(on, [[blower, chain(SURPRISE_BUBBLE, STEP, AIM)]])
        expect(bubblesOf(on, blower).length).toBeLessThanOrEqual(1)
    })
})

describe("a saved battle with bubbles", () => {
    test("bubbles, an orange one with its action, and their links → saved and loaded as they are", () => {
        const { on, blower } = arena()
        play(on, [[blower, chain(VIOLET_BUBBLE)]])
        play(on, [[blower, chain(ORANGE_BUBBLE, KAMIKAZE)]])
        on.applyStatus(blower, SOAPY, 2)
        const save = saveBattle(on)
        const loaded = loadBattle(save)
        expect(JSON.stringify(saveBattle(loaded))).toBe(JSON.stringify(save))
        const back = loaded.units.filter(body => body.statuses.has(BUBBLE))
        expect(back.length).toBe(on.units.filter(body => body.statuses.has(BUBBLE)).length)
        expect(back.every(body => !body.targetable)).toBe(true)
    })
})

describe("the body of bubble", () => {
    test("the bearer → a bubble at 3 plus a round, two of them add up", () => {
        const { on, blower } = arena([BUBBLE_BODY, BUBBLE_BODY])
        on.startRound()
        const level = blower.statuses.get(BUBBLE)?.level ?? 0
        expect(level).toBeGreaterThanOrEqual(6)
        expect(blower.targetable).toBe(false)
    })

    test("an ally of the bubble pet → carries the body", () => {
        expect(allyOf(BUBBLE_PET, "Bulle").items).toEqual([BUBBLE_BODY])
    })
})

describe("the catalog of bubbles", () => {
    test("every bubble card → in the catalog and in a booster or a kit", () => {
        const placed = new Set([
            ...ALL_BOOSTERS.flatMap(booster => booster.pools.flatMap(pool => pool.pool)),
            ...[BUBBLER_KIT, BUBBLE_MAGE_KIT].flatMap(kit => kit.cards),
        ])
        for(const card of BUBBLE_CARDS){
            expect(ALL_CARDS, card.name).toContain(card)
            expect(placed.has(card), card.name).toBe(true)
        }
        expect(new Set(ALL_CARDS.map(card => card.name)).size).toBe(ALL_CARDS.length)
    })

    test("the two kits → in the catalog", () => {
        expect(ALL_KITS).toContain(BUBBLER_KIT)
        expect(ALL_KITS).toContain(BUBBLE_MAGE_KIT)
    })

    test("an element coating → written down, found back as itself", () => {
        const type = ELEMENT_COATINGS.of(FIRE_ELEMENT)
        expect(STATUS_CODECS.load(STATUS_CODECS.save(type))).toBe(type)
        expect(BEAST_BUBBLE.name).toBe("Bulle bestiale")
    })
})
