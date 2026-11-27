import { describe, expect, test } from "vitest"
import { FISHING } from "@game/core-src/games/mecard/sim/card/subs/attack/Crosses"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { BOW_MODULE } from "@game/core-src/games/mecard/sim/card/subs/mechanic/ModuleCard"
import { THRUSTERS } from "@game/core-src/games/mecard/sim/card/subs/mechanic/ModuleModifiers"
import { IMPROVISED_ROBOT } from "@game/core-src/games/mecard/sim/card/subs/mechanic/RobotCard"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { MUD_CARD, WATER, PLANT } from "@game/core-src/games/mecard/sim/card/subs/spell/ElementCard"
import { TURRET } from "@game/core-src/games/mecard/sim/card/subs/summon/ChainSummons"
import { PLANT_ELEMENT } from "@game/core-src/games/mecard/sim/element/subs/Plant"
import { STONE_ELEMENT } from "@game/core-src/games/mecard/sim/element/subs/Stone"
import { WATER_ELEMENT } from "@game/core-src/games/mecard/sim/element/subs/Water"
import { BLUE_HEART } from "@game/core-src/games/mecard/sim/heart/subs/BlueHeartKind"
import { EXPLOSIVE_HEART } from "@game/core-src/games/mecard/sim/heart/subs/ExplosiveHeartKind"
import { CONCENTRATED, FURIOUS } from "@game/core-src/games/mecard/sim/status/subs/Calm"
import { DEMONIC } from "@game/core-src/games/mecard/sim/status/subs/DemonEnergy"
import { POISONED } from "@game/core-src/games/mecard/sim/status/subs/Poison"
import { ritualType } from "@game/core-src/games/mecard/sim/status/subs/RitualStatus"
import { BLEEDING, FRAGILE } from "@game/core-src/games/mecard/sim/status/subs/Wounds"
import {
    CALM_INFUSION,
    COOL_SYRUP,
    DEMON_ELIXIR,
    FURY_ELIXIR,
    SHARPENING_STONE,
} from "@game/core-src/games/mecard/sim/usable/subs/elixir/StatusElixirs"
import { BLOOD_FLASK, FRAGILITY_FLASK } from "@game/core-src/games/mecard/sim/usable/subs/flask/AreaFlasks"
import {
    BATTERY,
    ENGINE_OIL,
    FISHING_CARD,
    FOLDING_TURRET,
    INFLATABLE_DECOY,
    LEATHER_BAG,
    MAGIC_WATCH,
    WHISTLE,
    WRENCH,
} from "@game/core-src/games/mecard/sim/usable/subs/hand/ChainUsables"
import { WIZARD_STAFF } from "@game/core-src/games/mecard/sim/usable/subs/hand/WizardStaff"
import {
    BLUE_BRACELET,
    BLUE_FLASK,
    EXPLOSIVE_CORE,
} from "@game/core-src/games/mecard/sim/usable/subs/HeartUsables"
import { Carried } from "@game/core-src/games/mecard/sim/usable/Usable"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"
import type { Usable } from "@game/core-src/games/mecard/sim/usable/Usable"

import { battle, chain, MONSTERS, unit } from "../fixtures"
import { DamageType } from "@game/core-src/games/mecard/sim/battle/DamageType"
import * as Summon from "@game/core-src/games/mecard/sim/battle/mecanic/summon"

// --- Fixture builders ---

/** A hero carrying a usable, and a far enemy so the battle goes on, ready to use the usable at the start of the execution. */
function carrying(usable: Usable) {
    const on = battle()
    const hero = unit(on, 3.5, 5)
    const far = unit(on, 1, 1, { team: MONSTERS })
    const carried = new Carried(usable)
    hero.usables.push(carried)
    on.startRound()
    return { on, hero, far, carried }
}

/** Use it as the execution starts. */
function used(on: ReturnType<typeof battle>, hero: Unit, carried: Carried): void {
    on.activate(hero, [carried])
    on.endPreparation()
}

// --- Tests ---

describe("elixirs", () => {
    test("the status elixirs give their status, the syrup takes the negative ones off", () => {
        for(const [usable, type] of [[DEMON_ELIXIR, DEMONIC], [CALM_INFUSION, CONCENTRATED], [FURY_ELIXIR, FURIOUS]] as const){
            const { on, hero, carried } = carrying(usable)
            const given: unknown[] = []
            on.signals.statusAdded.add(event => given.push(event.type))
            used(on, hero, carried)
            expect(given).toContain(type)
        }
        const { on, hero, carried } = carrying(COOL_SYRUP)
        on.applyStatus(hero, POISONED, 3)
        used(on, hero, carried)
        expect(hero.statuses.has(POISONED)).toBe(false)
        expect(on.units.includes(hero)).toBe(true)
        expect(hero.usables).toHaveLength(1)
    })

    test("the sharpening stone has three charges that refill", () => {
        const { on, hero, carried } = carrying(SHARPENING_STONE)
        used(on, hero, carried)
        expect(carried.charges).toBe(2)
    })
})

describe("flasks", () => {
    test("the blood flask makes the units around its impact bleed, the fragility flask makes them fragile", () => {
        for(const [usable, type] of [[BLOOD_FLASK, BLEEDING], [FRAGILITY_FLASK, FRAGILE]] as const){
            const { on, hero, carried } = carrying(usable)
            const foe = unit(on, 3.5, 2, { team: MONSTERS })
            const given: [unknown, unknown][] = []
            on.signals.statusAdded.add(event => given.push([event.unit, event.type]))
            used(on, hero, carried)
            expect(given).toContainEqual([foe, type])
        }
    })
})

describe("hearts", () => {
    test("blue flask, bracelet and explosive core give their hearts", () => {
        for(const [usable, kind, count] of [
            [BLUE_FLASK, BLUE_HEART, 1], [BLUE_BRACELET, BLUE_HEART, 1], [EXPLOSIVE_CORE, EXPLOSIVE_HEART, 1],
        ] as const){
            const { on, hero, carried } = carrying(usable)
            const given: unknown[] = []
            hero.hearts.onAdd.add(({ heart }) => given.push(heart.kind))
            used(on, hero, carried)
            expect(given).toEqual(new Array(count).fill(kind))
        }
    })
})

describe("hand and chain", () => {
    test("magic watch plays the last step once more", () => {
        const { on, hero, far, carried } = carrying(MAGIC_WATCH)
        const foe = unit(on, 3.5, 4, { team: MONSTERS })
        hero.hand.push(THRUST)
        on.commit(hero, chain(THRUST))
        used(on, hero, carried)
        on.playRound()
        void far
        expect(foe.life).toBe(0)
    })

    test("wizard staff gives the element of the only ritual", () => {
        const { on, hero, carried } = carrying(WIZARD_STAFF)
        on.applyStatus(hero, ritualType(WATER_ELEMENT), 1)
        used(on, hero, carried)
        expect(hero.hand).toEqual([WATER])
        expect(carried.charges).toBe(1)
    })

    test("wizard staff gives the mix of two rituals that react", () => {
        const { on, hero, carried } = carrying(WIZARD_STAFF)
        on.applyStatus(hero, ritualType(WATER_ELEMENT), 1)
        on.applyStatus(hero, ritualType(STONE_ELEMENT), 1)
        used(on, hero, carried)
        expect(hero.hand).toEqual([MUD_CARD])
    })

    test("wizard staff gives an element of the rituals when none of them react", () => {
        const { on, hero, carried } = carrying(WIZARD_STAFF)
        on.applyStatus(hero, ritualType(WATER_ELEMENT), 1)
        on.applyStatus(hero, ritualType(PLANT_ELEMENT), 1)
        used(on, hero, carried)
        expect(hero.hand).toHaveLength(1)
        expect([WATER, PLANT]).toContain(hero.hand[0])
    })

    test("wizard staff gives nothing without a ritual, nor to a full hand", () => {
        const empty = carrying(WIZARD_STAFF)
        used(empty.on, empty.hero, empty.carried)
        expect(empty.hero.hand).toEqual([])

        const full = carrying(WIZARD_STAFF)
        full.on.applyStatus(full.hero, ritualType(WATER_ELEMENT), 1)
        full.hero.hand.push(...new Array<Card>(full.hero.stats.handSize.value).fill(STEP))
        used(full.on, full.hero, full.carried)
        expect(full.hero.hand).not.toContain(WATER)
    })

    test("fishing card puts a Fishing in hand", () => {
        const { on, hero, carried } = carrying(FISHING_CARD)
        used(on, hero, carried)
        expect(hero.hand).toContain(FISHING)
    })

    test("wrench copies a module part from the hand, nothing without one", () => {
        const { on, hero, carried } = carrying(WRENCH)
        used(on, hero, carried)
        expect(hero.hand.filter((card: Card) => card === THRUSTERS)).toHaveLength(0)

        const second = carrying(WRENCH)
        second.hero.hand.push(THRUSTERS)
        used(second.on, second.hero, second.carried)
        expect(second.hero.hand.filter((card: Card) => card === THRUSTERS)).toHaveLength(2)
    })

    test("engine oil makes the robot of its unit play its chain twice", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const foe = unit(on, 3.5, 1.5, { team: MONSTERS })
        const oil = new Carried(ENGINE_OIL)
        hero.usables.push(oil)
        on.startRound()
        hero.hand.push(IMPROVISED_ROBOT, BOW_MODULE)
        on.commit(hero, chain(IMPROVISED_ROBOT, BOW_MODULE))
        on.endPreparation()
        on.playRound()
        const afterFirst = foe.life
        on.startRound()
        used(on, hero, oil)
        on.playRound()
        // Once a round without the oil, twice with it.
        expect(afterFirst - foe.life).toBe(2)
    })
})

describe("whistle and summons", () => {
    test("whistle turns the units around toward its unit", () => {
        const { on, hero, carried } = carrying(WHISTLE)
        const foe = unit(on, 4.5, 5, { team: MONSTERS })
        used(on, hero, carried)
        expect(foe.direction.x).toBeLessThan(-0.99)
    })

    test("folding turret and inflatable decoy set their bodies down a meter ahead", () => {
        for(const usable of [FOLDING_TURRET, INFLATABLE_DECOY]){
            const { on, hero, carried } = carrying(usable)
            used(on, hero, carried)
            const bodies = Summon.summonsOf(on, hero)
            expect(bodies).toHaveLength(1)
            expect(bodies[0].position.y).toBeCloseTo(4, 1)
        }
    })

    test("battery adds a time heart to the turret", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 1, 1, { team: MONSTERS })
        const battery = new Carried(BATTERY)
        hero.usables.push(battery)
        on.startRound()
        hero.hand.push(TURRET)
        on.commit(hero, chain(TURRET))
        on.endPreparation()
        on.playRound()
        const [turret] = Summon.summonsOf(on, hero)
        const before = turret.hearts.maxHearts
        on.startRound()
        used(on, hero, battery)
        expect(turret.hearts.maxHearts).toBe(before + 1)
    })
})

describe("leather bag", () => {
    test("the first unit killed gives the cards of its chain for good", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        const prey = unit(on, 3.5, 4, { team: MONSTERS })
        const bag = new Carried(LEATHER_BAG)
        hero.usables.push(bag)
        prey.hearts.damage(3, DamageType.PHYSICAL, null)
        const won: Card[] = []
        on.onGetCards.add(({ cards }) => won.push(...cards))
        on.startRound()
        prey.hand.push(STEP)
        on.commit(prey, chain(STEP))
        hero.hand.push(THRUST)
        on.commit(hero, chain(THRUST))
        used(on, hero, bag)
        on.playRound()
        expect(prey.alive).toBe(false)
        expect(won).toEqual([STEP])
    })
})
