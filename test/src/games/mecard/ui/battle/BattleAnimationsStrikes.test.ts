import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { visual } from "@game/core-src/games/mecard/sim/base/Visual"
import * as Areas from "@game/core-src/games/mecard/sim/battle/area/Areas"
import { Arena } from "@game/core-src/games/mecard/sim/battle/Arena"
import { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import { DamageType } from "@game/core-src/games/mecard/sim/battle/DamageType"
import { Heart } from "@game/core-src/games/mecard/sim/heart/Heart"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"
import { VECTOR_STRIKE_TIME } from "@game/core-src/games/mecard/ui/battle/BattleAnimations"
import { BattleScene } from "@game/core-src/games/mecard/ui/battle/BattleScene"
import { defaultAnimation } from "@game/core/mecard/fx-animation"
import { Replay } from "./replay"
import { HEROES, MONSTERS } from "../../sim/fixtures"

// --- Fixture builders ---

/** A hero facing a foe two meters up, heard by a replay. */
function watched(): { on: Battle, hero: Unit, foe: Unit, scene: BattleScene, replay: Replay } {
    const on = new Battle(new Arena(7, 7), 1)
    const spec = { direction: Vector2.UP, hearts: Heart.many(RED_HEART, 3), decks: [[]] }
    const hero = on.add({ ...spec, name: "hero", team: HEROES, controller: "player", position: new Vector2(3, 5) })
    const foe = on.add({ ...spec, name: "foe", team: MONSTERS, controller: "bot", position: new Vector2(3, 3.5) })
    const scene = new BattleScene()
    const replay = new Replay(scene, on)
    return { on, hero, foe, scene, replay }
}

// --- Tests ---

describe("BattleAnimations, the strikes", () => {
    test("a blow struck → played over its area, turned toward it, shown from the area when it has no look", async() => {
        const { on, hero, scene, replay } = watched()
        on.strike(hero, Areas.arc(hero.position, hero.direction, 2, 0.5), 1, DamageType.PHYSICAL)
        await replay.frame(0)
        expect(scene.strikes).toHaveLength(1)
        expect(scene.strikes[0].shown.kind).toBe("vector")
        expect(scene.strikes[0].placement.rotation).toBeCloseTo(-Math.PI / 2, 1)
        await replay.played()
        expect(scene.strikes).toHaveLength(0)
    })

    test("a blow struck → the wound shown only once the blow is played", async() => {
        const { on, hero, foe, scene, replay } = watched()
        on.strike(hero, Areas.arc(hero.position, hero.direction, 2, 0.5), 1, DamageType.PHYSICAL)
        await replay.frame(0)
        await replay.frame(VECTOR_STRIKE_TIME / 2)
        expect(scene.strikes).toHaveLength(1)
        expect(scene.of(foe)?.hearts.filter(heart => heart.isEmpty)).toHaveLength(0)
        await replay.played()
        expect(scene.of(foe)?.hearts.filter(heart => heart.isEmpty).length).toBeGreaterThan(0)
    })

    test("a blow with a picture → played as long as the animation of the picture says", async() => {
        const { on, hero, scene, replay } = watched()
        const animation = { ...defaultAnimation("sweep"), duration: 0.6 }
        replay.animations.resolveFx = () => ({
            kind: "sprite", key: "slash", sprite: {} as never, animation, coloration: null, rank: 0,
        })
        on.strike(hero, Areas.arc(hero.position, hero.direction, 2, 0.5), 1, DamageType.PHYSICAL, () => 1, visual("slash"))
        await replay.frame(0)
        await replay.frame(0.5)
        expect(scene.strikes).toHaveLength(1)
        expect(scene.strikes[0].share).toBeGreaterThan(0.5)
        await replay.played()
        expect(scene.strikes).toHaveLength(0)
    })

    test("a blow asking for its look → given the visual and the unit it hits", async() => {
        const { on, hero, foe, replay } = watched()
        const asked: unknown[] = []
        replay.animations.resolveFx = (look, target) => {
            asked.push(look?.visual, target)
            return { kind: "vector", rank: 0 }
        }
        on.strike(hero, Areas.arc(hero.position, hero.direction, 2, 0.5), 1, DamageType.PHYSICAL, () => 1, visual("slash"))
        await replay.played()
        expect(asked).toEqual(["slash", foe])
    })

    test("a screen skipping → no blow left on the board", async() => {
        const { on, hero, scene, replay } = watched()
        on.strike(hero, Areas.arc(hero.position, hero.direction, 2, 0.5), 1, DamageType.PHYSICAL)
        await replay.frame(0)
        await replay.finish()
        expect(scene.strikes).toHaveLength(0)
    })

    test("a blow struck → the attacker lunging along it, back in place at the end", async() => {
        const { on, hero, scene, replay } = watched()
        on.strike(hero, Areas.arc(hero.position, hero.direction, 2, 0.5), 1, DamageType.PHYSICAL)
        await replay.frame(0)
        await replay.frame(VECTOR_STRIKE_TIME / 2)
        expect(scene.of(hero)!.offset.length).toBeGreaterThan(0.1)
        await replay.played()
        expect(scene.of(hero)!.offset.length).toBe(0)
    })

    test("a unit hit by a unit → flashing, then calm again", async() => {
        const { on, hero, foe, scene, replay } = watched()
        on.strike(hero, Areas.arc(hero.position, hero.direction, 2, 0.5), 1, DamageType.PHYSICAL)
        let flashed = 0
        const watching = setInterval(() => flashed = Math.max(flashed, scene.of(foe)!.flash), 0)
        await replay.frame(VECTOR_STRIKE_TIME)
        await replay.frame(0.02)
        clearInterval(watching)
        expect(flashed).toBeGreaterThan(0)
        await replay.played()
        expect(scene.of(foe)!.flash).toBe(0)
        expect(scene.of(foe)!.offset.length).toBe(0)
    })

    test("a blow whose picture names an impact → that picture played on the unit hit", async() => {
        const { on, hero, scene, replay } = watched()
        const sweep = { ...defaultAnimation("sweep"), impact: "impact" }
        const hit = { ...defaultAnimation("hit"), duration: 0.3 }
        replay.animations.resolveFx = look => look?.visual === "impact"
            ? { kind: "sprite", key: "impact", sprite: {} as never, animation: hit, coloration: null, rank: 0 }
            : { kind: "sprite", key: "slash", sprite: {} as never, animation: sweep, coloration: null, rank: 0 }
        on.strike(hero, Areas.arc(hero.position, hero.direction, 2, 0.5), 1, DamageType.PHYSICAL, () => 1, visual("slash"))
        await replay.frame(0)
        await replay.frame(sweep.duration + 0.05)
        expect(scene.impacts).toHaveLength(1)
        expect(scene.impacts[0].scale).toBeCloseTo(1)
        await replay.played()
        expect(scene.impacts).toHaveLength(0)
    })

    test("a tinted blow naming an impact → the impact asked in the same hue", async() => {
        const { on, hero, replay } = watched()
        const sweep = { ...defaultAnimation("sweep"), impact: "impact" }
        const asked: unknown[] = []
        replay.animations.resolveFx = look => {
            asked.push([look?.visual, look?.coloration])
            return {
                kind: "sprite", key: "slash", sprite: {} as never, animation: sweep,
                coloration: look?.coloration ?? null, rank: 0,
            }
        }
        const red = visual("slash", { coloration: [1, 0, 0] })
        const area = Areas.arc(hero.position, hero.direction, 2, 0.5)
        on.strike(hero, area, 1, DamageType.PHYSICAL, () => 1, red)
        await replay.played()
        expect(asked).toEqual([["slash", [1, 0, 0]], ["impact", [1, 0, 0]]])
    })
})
