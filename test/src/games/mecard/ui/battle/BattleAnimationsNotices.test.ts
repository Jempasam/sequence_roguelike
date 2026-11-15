import { describe, expect, test } from "vitest"
import { Arena, Battle, Heart, RED_HEART, SPELL, Vector2, WAIT } from "@game/core/mecard"
import type { Card, Unit } from "@game/core/mecard"
import { BattleScene } from "@game/core/mecard/battle-ui"
import { ADDED_EDGE, NOTICE_EDGE, REMOVED_EDGE } from "@game/core/mecard/colors"
import { Replay } from "./replay"

import { HEROES, MONSTERS } from "../../sim/fixtures"

/** A hero and a foe, watched by a replay at rest. */
async function watched(): Promise<{ on: Battle, hero: Unit, scene: BattleScene, replay: Replay }> {
    const on = new Battle(new Arena(7, 7), 1)
    const spec = { direction: Vector2.UP, decks: [[]] as Card[][] }
    const hero = on.add({
        ...spec, name: "hero", team: HEROES, controller: "player", position: new Vector2(1, 5),
        hearts: Heart.many(RED_HEART, 3),
    })
    on.add({
        ...spec, name: "foe", team: MONSTERS, controller: "bot", position: new Vector2(6, 1),
        hearts: Heart.many(RED_HEART, 3),
    })
    const scene = new BattleScene()
    const replay = new Replay(scene, on)
    on.startRound()
    await replay.frame(0)
    return { on, hero, scene, replay }
}

describe("BattleAnimations, the notices", () => {
    test("a heart notified → outlined in blue where it stands, then no more", async() => {
        const { on, hero, scene, replay } = await watched()
        on.signals.notifyHeart.notify({ unit: hero, target: hero.hearts.all[1] })
        await replay.frame(0)
        expect(scene.litHeart).toMatchObject({ unit: hero, indexes: [1], edge: NOTICE_EDGE })
        expect(scene.notice?.unit).toBe(hero)
        await replay.played()
        expect(scene.litHeart).toBeNull()
        expect(scene.notice).toBeNull()
    })

    test("a status notified → its icon outlined in blue, then no more", async() => {
        const { on, hero, scene, replay } = await watched()
        const status = hero.statuses.values().next().value
        if(!status) return
        on.signals.notifyStatus.notify({ unit: hero, target: status })
        await replay.frame(0)
        expect(scene.litStatus).toMatchObject({ unit: hero, type: status.type, edge: NOTICE_EDGE })
        await replay.played()
        expect(scene.litStatus).toBeNull()
    })
})

describe("BattleAnimations, the chain", () => {
    test("cards put in the chain → outlined in green once there", async() => {
        const { on, hero, scene, replay } = await watched()
        const told = (cards: Card[]) => on.signals.chainChanged.notify({ unit: hero, cards, cursor: 0, borrowed: [] })
        told([WAIT])
        await replay.played()
        expect(scene.of(hero)?.chain.cards).toEqual([WAIT])
        told([WAIT, SPELL])
        await replay.frame(0)
        expect(scene.of(hero)?.chain.cards).toEqual([WAIT, SPELL])
        expect(scene.litCards).toMatchObject({ unit: hero, indexes: [1], edge: ADDED_EDGE })
        await replay.played()
        expect(scene.litCards).toBeNull()
    })

    test("cards leaving the chain → outlined in red where they stand, then gone", async() => {
        const { on, hero, scene, replay } = await watched()
        const told = (cards: Card[]) => on.signals.chainChanged.notify({ unit: hero, cards, cursor: 0, borrowed: [] })
        told([WAIT, SPELL])
        await replay.played()
        told([SPELL])
        await replay.frame(0)
        expect(scene.of(hero)?.chain.cards).toEqual([WAIT, SPELL])
        expect(scene.litCards).toMatchObject({ unit: hero, indexes: [0], edge: REMOVED_EDGE })
        await replay.played()
        expect(scene.of(hero)?.chain.cards).toEqual([SPELL])
        expect(scene.litCards).toBeNull()
    })
})
