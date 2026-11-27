import { describe, expect, test } from "vitest"
import { visual } from "@game/core-src/games/mecard/sim/base/Visual"
import { gives } from "@game/core-src/games/mecard/sim/card/Card"
import { POTION } from "@game/core-src/games/mecard/sim/card/CardType"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { WAIT } from "@game/core-src/games/mecard/sim/card/subs/movement/Wait"
import { CardBottle } from "@game/core-src/games/mecard/sim/usable/subs/hand/CardBottle"
import { ENERGIZER } from "@game/core-src/games/mecard/sim/usable/subs/hand/Energizer"
import { MIXER } from "@game/core-src/games/mecard/sim/usable/subs/hand/Mixer"
import { PLANT_BAG } from "@game/core-src/games/mecard/sim/usable/subs/hand/PlantBag"
import { HealingPotion } from "@game/core-src/games/mecard/sim/usable/subs/HealingPotion"
import { Carried } from "@game/core-src/games/mecard/sim/usable/Usable"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"
import type { Usable } from "@game/core-src/games/mecard/sim/usable/Usable"

import { battle, chain, MONSTERS, unit } from "../fixtures"

// --- Fixture builders ---

/** A unit drawing no card, an enemy far away so the battle goes on, and a usable in its belt. */
function carrying(usable: Usable): { on: Battle, carrier: Unit, carried: Carried } {
    const on = battle()
    const carrier = unit(on, 3, 3)
    unit(on, 0, 0, { team: MONSTERS })
    carrier.stats.firstDraw.base = 0
    carrier.stats.draw.base = 0
    const carried = new Carried(usable)
    carrier.usables.push(carried)
    return { on, carrier, carried }
}

/** Use what the unit carries in a round where it plays a chain, the round played out or not. */
function useIn(on: Battle, carrier: Unit, carried: Carried, played: readonly Card[] = []): void {
    on.startRound()
    carrier.hand.push(...played)
    on.commit(carrier, chain(...played))
    on.activate(carrier, [carried])
    on.endPreparation()
}

// --- Tests ---

describe("Usable, charges", () => {
    test("a usable of one charge → out of the belt once used", () => {
        const { on, carrier, carried } = carrying(new HealingPotion(2))
        useIn(on, carrier, carried)
        expect(carrier.usables).toEqual([])
    })

    test("a bottle of a card → a copy in hand at each use, broken after its third", () => {
        const { on, carrier, carried } = carrying(new CardBottle("Bouteille d'estoc", visual("usables/thrust_bottle"), THRUST, 3))
        for(let use = 1; use <= 3; use++){
            useIn(on, carrier, carried)
            expect(carrier.hand.filter(card => card === THRUST)).toHaveLength(use)
            on.playRound()
        }
        expect(carrier.usables).toEqual([])
    })

    test("a usable refilling → kept spent in the belt, refused, then filled again", () => {
        const { on, carrier, carried } = carrying(MIXER)
        useIn(on, carrier, carried)
        on.playRound()
        expect(carrier.usables).toEqual([carried])
        expect(carried.spent).toBe(true)
        on.startRound()
        expect(() => on.activate(carrier, [carried])).toThrow()
        on.refill(carrier)
        expect(carried.charges).toBe(1)
    })
})

describe("Usable, effects", () => {
    test("an energizer → the chain shown twice, its steps queued twice", () => {
        const { on, carrier, carried } = carrying(ENERGIZER)
        useIn(on, carrier, carried, [STEP, WAIT])
        expect(on.planOf(carrier)?.cards).toEqual([STEP, WAIT, STEP, WAIT])
        expect(carrier.steps).toHaveLength(4)
    })

    test("a mixer → the hand and the discard back in the deck, as many cards drawn again", () => {
        const { on, carrier, carried } = carrying(MIXER)
        carrier.decks.all[0].discard.push(THRUST, THRUST)
        on.startRound()
        carrier.hand.push(WAIT, WAIT, WAIT)
        on.activate(carrier, [carried])
        on.endPreparation()
        expect(carrier.hand).toHaveLength(3)
        expect(carrier.decks.all[0].discard).toEqual([])
        const cards = [...carrier.hand, ...carrier.decks.all[0].pile]
        expect(cards.filter(card => card === THRUST)).toHaveLength(2)
        expect(cards.filter(card => card === WAIT)).toHaveLength(3)
    })

    test("a bag of plants → a potion in hand, a charge spent, refilled for the next battle", () => {
        const { on, carrier, carried } = carrying(PLANT_BAG)
        useIn(on, carrier, carried)
        expect(carrier.hand.filter(card => gives(card, POTION))).toHaveLength(1)
        expect(carried.charges).toBe(2)
        on.refill(carrier)
        expect(carried.charges).toBe(3)
    })
})
