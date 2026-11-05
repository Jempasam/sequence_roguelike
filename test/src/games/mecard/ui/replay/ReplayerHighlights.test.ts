import { describe, expect, test } from "vitest"
import {
    Arena, Battle, Heart, RED_HEART, SHIELD_HEART, SPELL, Strength, Vector2, WAIT,
} from "@game/core/mecard"
import type { Card, Unit } from "@game/core/mecard"
import { BattleScene, HIGHLIGHT_TIME, Replayer } from "@game/core/mecard/replay"

import { chain, HEROES, MONSTERS } from "../../sim/fixtures"

/** A hero and a foe in a round being prepared, watched by a replay at rest. */
function watched(hearts = Heart.many(RED_HEART, 3)): {
    on: Battle, hero: Unit, scene: BattleScene, replay: Replayer, selected: Unit[],
} {
    const on = new Battle(new Arena(7, 7), 1)
    const spec = { direction: Vector2.UP, decks: [[]] as Card[][] }
    const hero = on.add({ ...spec, name: "hero", team: HEROES, controller: "player", position: new Vector2(1, 5), hearts })
    on.add({
        ...spec, name: "foe", team: MONSTERS, controller: "bot", position: new Vector2(6, 1),
        hearts: Heart.many(RED_HEART, 3),
    })
    const scene = new BattleScene()
    const replay = new Replayer(scene)
    const selected: Unit[] = []
    replay.onSelect = unit => selected.push(unit)
    replay.watch(on)
    on.startRound()
    replay.frame(0)
    return { on, hero, scene, replay, selected }
}

/** Have a unit play cards in the round going on, the replay not having shown it yet. */
function played(on: Battle, hero: Unit, cards: Card[]): void {
    hero.hand.push(...cards)
    on.commit(hero, chain(...cards))
    on.endPreparation()
    on.playRound()
}

/** The hearts of a unit as the scene shows them. */
function bar(scene: BattleScene, unit: Unit): string {
    return (scene.of(unit)?.hearts ?? []).map(heart => heart.isEmpty ? "o" : "x").join("")
}

// --- Tests ---

describe("Replayer, the cards", () => {
    test("a card activated → its unit selected, the card lit, the replay stopped on it", () => {
        const { on, hero, scene, replay, selected } = watched()
        played(on, hero, [WAIT])
        replay.frame(0)
        expect(selected).toEqual([hero])
        expect(scene.litCards).toEqual({ unit: hero, first: 0, last: 0, invalid: false })
        replay.frame(HIGHLIGHT_TIME / 2)
        expect(scene.litCards).not.toBeNull()
    })

    test("its time over → no more lit, then greyed out", () => {
        const { on, hero, scene, replay } = watched()
        played(on, hero, [WAIT])
        replay.frame(0)
        expect(scene.of(hero)?.chain.cursor).toBe(0)
        replay.frame(HIGHLIGHT_TIME)
        expect(scene.litCards).toBeNull()
        expect(scene.of(hero)?.chain.cursor).toBe(1)
    })

    test("a card that cannot be built → its unit selected, the card lit and crossed out", () => {
        const { on, hero, scene, replay, selected } = watched()
        played(on, hero, [SPELL, WAIT])
        replay.frame(0)
        expect(selected).toEqual([hero])
        expect(scene.litCards).toEqual({ unit: hero, first: 0, last: 0, invalid: true })
        replay.frame(HIGHLIGHT_TIME / 2)
        expect(scene.litCards?.invalid).toBe(true)
        replay.frame(HIGHLIGHT_TIME / 2)
        expect(scene.litCards).toEqual({ unit: hero, first: 1, last: 1, invalid: false })
    })

    test("the end of the round skipped → nothing lit anymore", () => {
        const { on, hero, scene, replay } = watched()
        played(on, hero, [WAIT])
        replay.frame(0)
        replay.finish()
        expect(scene.litCards).toBeNull()
        expect(replay.drained).toBe(true)
    })
})

describe("Replayer, the hearts", () => {
    test("a heart added → shown at once, lit, the replay stopped on it", () => {
        const { hero, scene, replay } = watched()
        hero.hearts.give(new Heart(SHIELD_HEART))
        replay.frame(0)
        expect(bar(scene, hero)).toBe("xxxx")
        expect(scene.litHeart).toEqual({ unit: hero, indexes: [3] })
        replay.frame(HIGHLIGHT_TIME)
        expect(scene.litHeart).toBeNull()
    })

    test("a heart removed → lit where it stands, gone once its time is over", () => {
        const { hero, scene, replay } = watched([new Heart(RED_HEART), new Heart(SHIELD_HEART)])
        hero.hearts.remove(SHIELD_HEART, 1, null)
        replay.frame(0)
        expect(bar(scene, hero)).toBe("xx")
        expect(scene.litHeart).toEqual({ unit: hero, indexes: [1] })
        replay.frame(HIGHLIGHT_TIME)
        expect(bar(scene, hero)).toBe("x")
        expect(scene.litHeart).toBeNull()
    })

    test("a heart transformed → lit, then what took its place lit in turn", () => {
        const { hero, scene, replay } = watched()
        hero.hearts.remove(RED_HEART, 1, null)
        replay.frame(0)
        expect(bar(scene, hero)).toBe("xxx")
        expect(scene.litHeart?.indexes).toEqual([2])
        replay.frame(HIGHLIGHT_TIME)
        expect(bar(scene, hero)).toBe("xxo")
        expect(scene.litHeart?.indexes).toEqual([2])
        replay.frame(HIGHLIGHT_TIME)
        expect(scene.litHeart).toBeNull()
    })

    test("hearts of a kind lost together → lit together, then what took their places", () => {
        const { hero, scene, replay } = watched()
        hero.hearts.remove(RED_HEART, 2, null)
        replay.frame(0)
        expect(bar(scene, hero)).toBe("xxx")
        expect(scene.litHeart?.indexes).toEqual([2, 1])
        replay.frame(HIGHLIGHT_TIME)
        expect(bar(scene, hero)).toBe("xoo")
        expect(scene.litHeart?.indexes).toEqual([2, 1])
        replay.frame(HIGHLIGHT_TIME)
        expect(scene.litHeart).toBeNull()
    })

    test("a wound → shown at once, nothing lit, the replay not stopped", () => {
        const { hero, scene, replay } = watched()
        hero.hearts.damage(2, "physical", null)
        replay.frame(0)
        expect(bar(scene, hero)).toBe("xoo")
        expect(scene.litHeart).toBeNull()
    })
})

describe("Replayer, the processes", () => {
    test("a process added → shown, lit, the replay stopped on it", () => {
        const { on, hero, scene, replay } = watched()
        on.endPreparation()
        const process = new Strength(1)
        on.startProcess(hero, process)
        replay.frame(0)
        expect(scene.of(hero)?.processes).toEqual([process])
        expect(scene.litProcess).toEqual({ unit: hero, process })
        replay.frame(HIGHLIGHT_TIME)
        expect(scene.litProcess).toBeNull()
    })
})
