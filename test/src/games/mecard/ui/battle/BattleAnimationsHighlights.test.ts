import { describe, expect, test } from "vitest"
import {
    Arena, Battle, Heart, RED_HEART, SHIELD_HEART, SPELL, Strength, Vector2, WAIT,
} from "@game/core/mecard"
import type { Card, Unit } from "@game/core/mecard"
import { BattleScene, HIGHLIGHT_TIME } from "@game/core/mecard/battle-ui"
import { Replay } from "./replay"

import { chain, HEROES, MONSTERS } from "../../sim/fixtures"
import { DamageType } from "@game/core/mecard"

/** A hero and a foe in a round being prepared, watched by a replay at rest. */
async function watched(hearts = Heart.many(RED_HEART, 3)): Promise<{
    on: Battle, hero: Unit, scene: BattleScene, replay: Replay, selected: Unit[],
}> {
    const on = new Battle(new Arena(7, 7), 1)
    const spec = { direction: Vector2.UP, decks: [[]] as Card[][] }
    const hero = on.add({ ...spec, name: "hero", team: HEROES, controller: "player", position: new Vector2(1, 5), hearts })
    on.add({
        ...spec, name: "foe", team: MONSTERS, controller: "bot", position: new Vector2(6, 1),
        hearts: Heart.many(RED_HEART, 3),
    })
    const scene = new BattleScene()
    const replay = new Replay(scene, on)
    const selected: Unit[] = []
    replay.animations.onSelect = unit => selected.push(unit)
    on.startRound()
    await replay.frame(0)
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

describe("BattleAnimations, the cards", () => {
    test("a card activated → its unit selected, the card lit, the replay stopped on it", async() => {
        const { on, hero, scene, replay, selected } = await watched()
        played(on, hero, [WAIT])
        await replay.frame(0)
        expect(selected).toEqual([hero])
        expect(scene.litCards).toEqual({ unit: hero, first: 0, last: 0, invalid: false })
        await replay.frame(HIGHLIGHT_TIME / 2)
        expect(scene.litCards).not.toBeNull()
    })

    test("its time over → no more lit, then greyed out", async() => {
        const { on, hero, scene, replay } = await watched()
        played(on, hero, [WAIT])
        await replay.frame(0)
        expect(scene.of(hero)?.chain.cursor).toBe(0)
        await replay.frame(HIGHLIGHT_TIME)
        expect(scene.litCards).toBeNull()
        expect(scene.of(hero)?.chain.cursor).toBe(1)
    })

    test("a card that cannot be built → its unit selected, the card lit and crossed out", async() => {
        const { on, hero, scene, replay, selected } = await watched()
        played(on, hero, [SPELL, WAIT])
        await replay.frame(0)
        expect(selected).toEqual([hero])
        expect(scene.litCards).toEqual({ unit: hero, first: 0, last: 0, invalid: true })
        await replay.frame(HIGHLIGHT_TIME / 2)
        expect(scene.litCards?.invalid).toBe(true)
        await replay.frame(HIGHLIGHT_TIME / 2)
        expect(scene.litCards).toEqual({ unit: hero, first: 1, last: 1, invalid: false })
    })

    test("the end of the round skipped → nothing lit anymore", async() => {
        const { on, hero, scene, replay } = await watched()
        played(on, hero, [WAIT])
        await replay.frame(0)
        await replay.finish()
        expect(scene.litCards).toBeNull()
        expect(replay.drained).toBe(true)
    })
})

describe("BattleAnimations, the hearts", () => {
    test("a heart added → shown at once, lit, the replay stopped on it", async() => {
        const { hero, scene, replay } = await watched()
        hero.hearts.give(new Heart(SHIELD_HEART))
        await replay.frame(0)
        expect(bar(scene, hero)).toBe("xxxx")
        expect(scene.litHeart).toEqual({ unit: hero, indexes: [3] })
        await replay.frame(HIGHLIGHT_TIME)
        expect(scene.litHeart).toBeNull()
    })

    test("a heart removed → lit where it stands, gone once its time is over", async() => {
        const { hero, scene, replay } = await watched([new Heart(RED_HEART), new Heart(SHIELD_HEART)])
        hero.hearts.remove(SHIELD_HEART, 1, null)
        await replay.frame(0)
        expect(bar(scene, hero)).toBe("xx")
        expect(scene.litHeart).toEqual({ unit: hero, indexes: [1] })
        await replay.frame(HIGHLIGHT_TIME)
        expect(bar(scene, hero)).toBe("x")
        expect(scene.litHeart).toBeNull()
    })

    test("a heart transformed → lit, then what took its place lit in turn", async() => {
        const { hero, scene, replay } = await watched()
        hero.hearts.remove(RED_HEART, 1, null)
        await replay.frame(0)
        expect(bar(scene, hero)).toBe("xxx")
        expect(scene.litHeart?.indexes).toEqual([2])
        await replay.frame(HIGHLIGHT_TIME)
        expect(bar(scene, hero)).toBe("xxo")
        expect(scene.litHeart?.indexes).toEqual([2])
        await replay.frame(HIGHLIGHT_TIME)
        expect(scene.litHeart).toBeNull()
    })

    test("hearts of a kind lost together → lit together, then what took their places", async() => {
        const { hero, scene, replay } = await watched()
        hero.hearts.remove(RED_HEART, 2, null)
        await replay.frame(0)
        expect(bar(scene, hero)).toBe("xxx")
        expect(scene.litHeart?.indexes).toEqual([2, 1])
        await replay.frame(HIGHLIGHT_TIME)
        expect(bar(scene, hero)).toBe("xoo")
        expect(scene.litHeart?.indexes).toEqual([2, 1])
        await replay.frame(HIGHLIGHT_TIME)
        expect(scene.litHeart).toBeNull()
    })

    test("a wound → shown at once, nothing lit, the replay not stopped", async() => {
        const { hero, scene, replay } = await watched()
        hero.hearts.damage(2, DamageType.PHYSICAL, null)
        await replay.frame(0)
        expect(bar(scene, hero)).toBe("xoo")
        expect(scene.litHeart).toBeNull()
    })
})

describe("BattleAnimations, the processes", () => {
    test("a process added → shown, lit, the replay stopped on it", async() => {
        const { on, hero, scene, replay } = await watched()
        on.endPreparation()
        const process = new Strength(1)
        on.startProcess(hero, process)
        await replay.frame(0)
        expect(scene.of(hero)?.processes).toEqual([process])
        expect(scene.litProcess).toEqual({ unit: hero, process })
        await replay.frame(HIGHLIGHT_TIME)
        expect(scene.litProcess).toBeNull()
    })
})
