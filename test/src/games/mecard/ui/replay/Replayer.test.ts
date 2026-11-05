import { describe, expect, test } from "vitest"
import { AIM, Arena, Battle, Heart, RED_HEART, STEP, Vector2 } from "@game/core/mecard"
import type { Unit } from "@game/core/mecard"
import { BattleScene, DRAW_PAUSE, DRAW_TIME, Replayer } from "@game/core/mecard/replay"
import { HEROES, MONSTERS } from "../../sim/fixtures"

// --- Fixture builders ---

/** A battle where a hero and a foe draw, heard by a replay animating the hero alone. */
function watched(): { on: Battle, hero: Unit, foe: Unit, scene: BattleScene, replay: Replayer } {
    const on = new Battle(new Arena(7, 7), 1)
    const bases = { draw: 2, firstDraw: 2, ordered: true }
    const spec = { direction: Vector2.UP, hearts: Heart.many(RED_HEART, 2), bases }
    const hero = on.add({
        ...spec, name: "hero", team: HEROES, controller: "player", position: new Vector2(3, 5),
        decks: [[STEP, STEP], [AIM]],
    })
    const foe = on.add({
        ...spec, name: "foe", team: MONSTERS, controller: "bot", position: new Vector2(3, 1), decks: [[STEP, AIM]],
    })
    const scene = new BattleScene()
    const replay = new Replayer(scene)
    replay.animates = unit => unit === hero
    replay.watch(on)
    return { on, hero, foe, scene, replay }
}

// --- Tests ---

describe("Replayer, the draw", () => {
    test("a unit starting to draw → the view on it, its hand shown, no card flying yet", () => {
        const { on, hero, scene, replay } = watched()
        const drawers: unknown[] = []
        replay.onSelect = unit => drawers.push(unit)
        on.startRound()
        replay.frame(0)
        expect(scene.drawer).toBe(hero)
        expect(drawers).toEqual([hero])
        expect(scene.flight).toBeNull()
        expect(scene.of(hero)?.hand).toEqual([])
    })

    test("a card drawn → flying from its deck, the piles counted down", () => {
        const { on, hero, scene, replay } = watched()
        on.startRound()
        replay.frame(0)
        replay.frame(DRAW_PAUSE)
        expect(scene.flight).toMatchObject({ unit: hero, card: STEP, deck: 0 })
        expect(scene.of(hero)?.decks.map(deck => deck.pile)).toEqual([1, 1])
        expect(scene.of(hero)?.cursor).toBe(1)
        expect(scene.of(hero)?.hand).toEqual([STEP])
    })

    test("half of its time → half of the way", () => {
        const { on, scene, replay } = watched()
        on.startRound()
        replay.frame(0)
        replay.frame(DRAW_PAUSE)
        replay.frame(DRAW_TIME / 2)
        expect(scene.flight?.share).toBeCloseTo(0.5)
    })

    test("its time over → a pause on the hand, then the next card flies, from the next deck", () => {
        const { on, hero, scene, replay } = watched()
        on.startRound()
        replay.frame(0)
        replay.frame(DRAW_PAUSE)
        replay.frame(DRAW_TIME)
        expect(scene.flight).toBeNull()
        expect(scene.drawer).toBe(hero)
        replay.frame(DRAW_PAUSE)
        expect(scene.flight).toMatchObject({ card: AIM, deck: 1 })
    })

    test("the last card landed → a pause on the hand, then the view leaves it", () => {
        const { on, hero, scene, replay } = watched()
        on.startRound()
        replay.frame(0)
        replay.frame(DRAW_PAUSE)
        replay.frame(DRAW_TIME)
        replay.frame(DRAW_PAUSE)
        replay.frame(DRAW_TIME)
        expect(scene.drawer).toBe(hero)
        replay.frame(DRAW_PAUSE)
        expect(scene.drawer).toBeNull()
    })

    test("a unit not animated → drawn at once", () => {
        const { on, foe, scene, replay } = watched()
        on.startRound()
        replay.frame(2 * DRAW_TIME + 3 * DRAW_PAUSE + 0.01)
        expect(scene.flight).toBeNull()
        expect(scene.of(foe)?.hand).toEqual(foe.hand)
        expect(replay.drained).toBe(true)
    })

    test("the replay skipped → no card left flying", () => {
        const { on, scene, replay } = watched()
        on.startRound()
        replay.frame(0)
        replay.frame(DRAW_PAUSE)
        replay.finish()
        expect(scene.flight).toBeNull()
        expect(scene.drawer).toBeNull()
    })
})
