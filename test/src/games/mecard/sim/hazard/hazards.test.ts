import { describe, expect, test } from "vitest"
import {
    BOMB, BOMB_DAMAGE, Heart, loadBattle, placeBomb, placeFlames, placePuddle, POTION_LEVEL,
    saveBattle, SHIELD_HEART, SLOWED, SLOWNESS_POTION, STEP, TIME_HEART, Vector2, WAIT,
} from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../fixtures"

// --- Tests ---

describe("Hazards, bodies lying on the ground", () => {
    test("a bomb → a body of its thrower's team, intangible, with a time heart", () => {
        const on = battle()
        const thrower = unit(on, 3, 6)
        const bomb = placeBomb(on, thrower, new Vector2(3, 3))
        expect(bomb?.team).toBe(thrower.team)
        expect(bomb?.tangible).toBe(false)
        expect(bomb?.hearts.all.map(heart => heart.kind)).toEqual([TIME_HEART])
        expect(on.bodies).not.toContain(bomb)
        expect(on.free(new Vector2(3, 3))).toBe(true)
    })

    test("a bomb → never aimed at nor hit, goes off at the next pass, gone at the end of the round", () => {
        const on = battle()
        const thrower = unit(on, 0, 6)
        const enemy = unit(on, 3, 2, { team: MONSTERS })
        on.startRound()
        const bomb = placeBomb(on, thrower, new Vector2(3, 3))
        expect(on.enemiesOf(enemy)).not.toContain(bomb)
        expect(on.unitsIn({ kind: "circle", center: new Vector2(3, 3), radius: 1 })).toEqual([enemy])
        thrower.hand.push(WAIT)
        on.commit(thrower, chain(WAIT))
        on.endPreparation()
        on.playRound()
        expect(enemy.life).toBe(4 - BOMB_DAMAGE)
        expect(on.units).not.toContain(bomb)
    })

    test("flames → burn whoever stands in them at the next pass, then gone", () => {
        const on = battle()
        const lighter = unit(on, 0, 6)
        const enemy = unit(on, 3, 3, { team: MONSTERS })
        on.startRound()
        placeFlames(on, lighter, { kind: "circle", center: new Vector2(3, 3), radius: 0.5 })
        on.endPreparation()
        on.playRound()
        expect(enemy.life).toBeLessThan(4)
        expect(on.living.filter(each => each.summoned === "fire")).toEqual([])
    })

    test("a puddle → as many time hearts as its rounds, poured on whoever steps in, worn out after them", () => {
        const on = battle()
        const pourer = unit(on, 3, 6)
        const walker = unit(on, 3, 2.4, { team: MONSTERS, direction: Vector2.DOWN })
        const dose = { potion: SLOWNESS_POTION, sign: 1 as const, factor: 1 }
        const puddle = placePuddle(on, pourer, new Vector2(3, 4), dose, POTION_LEVEL, 2)
        expect(puddle?.hearts.all).toHaveLength(2)
        play(on, [[walker, chain(STEP)]])
        expect(walker.statusOf(SLOWED)).toBeDefined()
        expect(puddle?.statusOf(SLOWED)).toBeUndefined()
        play(on, [[pourer, chain(WAIT)]])
        expect(on.units).not.toContain(puddle)
    })
})

describe("Hazards playing cards", () => {
    test("a bomb thrown → plays right after its thrower: waits, then blows up after the thrower's next step", () => {
        const on = battle()
        const thrower = unit(on, 0.5, 6)
        const enemy = unit(on, 1.5, 3.5, { team: MONSTERS })
        on.startRound()
        thrower.hand.push(BOMB, STEP)
        on.commit(thrower, chain(BOMB, STEP))
        on.endPreparation()
        const order: string[] = []
        on.signals.stepStarted.add(({ unit: playing }) => order.push(playing.name))
        on.playRound()
        expect(order).toEqual([thrower.name, "Bombe", thrower.name, "Bombe"])
        expect(enemy.life).toBeLessThan(4)
    })

    test("a body playing cards → in the order of play after its owner, saved and loaded with it", () => {
        const on = battle()
        const owner = unit(on, 1, 6)
        unit(on, 6, 1, { team: MONSTERS })
        on.startRound()
        const body = on.place(owner, {
            look: "stone", name: "Robot", at: new Vector2(3, 3), hearts: Heart.many(SHIELD_HEART, 2),
            cards: [WAIT, STEP],
        })
        expect(on.initiative.indexOf(body!)).toBe(on.initiative.indexOf(owner) + 1)
        on.endPreparation()
        on.playRound()
        on.startRound()
        expect(on.initiative.indexOf(body!)).toBe(on.initiative.indexOf(owner) + 1)
        expect(body?.hand.map(String)).toEqual(["Attendre", "Avancer"])
        const loaded = loadBattle(saveBattle(on))
        const again = loaded.units[on.units.indexOf(body!)]
        expect(again.owner).toBe(loaded.units[on.units.indexOf(owner)])
        expect(again.acting).toBe(true)
    })
})
