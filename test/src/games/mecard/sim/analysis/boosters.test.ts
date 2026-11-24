import { describe, expect, test } from "vitest"
import {
    AIM, alternated, ALL_BOOSTERS, BOOSTER_KIND, BOW_MODULE, BULL_MODULE, convert, everyDrawReads,
    IMPROVISED_ROBOT,
    KINDS, MISSILE, MONSTER_KIND, STEP, TANK_ROBOT, THRUST,
} from "@game/core/mecard"
import type { Booster, Card } from "@game/core/mecard"
import { interchangeable } from "@game/core/mecard/unordered-parts"
import { PROFILES } from "@game/core/mecard"

// --- Fixture builders ---

const ATELIER = ALL_BOOSTERS.find(each => each.name === "Atelier")!
const MECA_BETE = ALL_BOOSTERS.find(each => each.name === "Méca-bête")!

function pooled(booster: Booster): Card[] {
    return booster.pools.flatMap(({ pool }) => pool)
}

// --- Tests ---

describe("interchangeable", () => {
    test("cards that take and give the same types and are for the same use → listed, the card left out", () => {
        const parts = [IMPROVISED_ROBOT, TANK_ROBOT, BOW_MODULE, STEP]
        const found = interchangeable(parts, IMPROVISED_ROBOT, PROFILES[4])
        expect(found).toEqual([TANK_ROBOT])
    })

    test("cards of another signature or another use → not listed", () => {
        const found = interchangeable([STEP, THRUST, AIM, BOW_MODULE], STEP, PROFILES[0])
        expect(found).toEqual([])
    })
})

describe("a booster as a source", () => {
    const POISONS = ALL_BOOSTERS.find(each => each.name === "Poisons")!

    test("its pools → alternated, one card of each pool after the other", () => {
        const [first, second] = POISONS.pools.map(({ pool }) => pool)
        const anatomy = BOOSTER_KIND.anatomy(POISONS)
        expect(anatomy.ordered).toBe(false)
        const { parts } = anatomy as { parts: readonly Card[] }
        expect(parts.slice(0, 4)).toEqual([first[0], second[0], first[1], second[1]])
    })

    test("a pool that has run out → skipped, no card lost or doubled", () => {
        const first = [AIM, STEP, THRUST]
        const second = [IMPROVISED_ROBOT]
        expect(alternated([first, second])).toEqual([AIM, IMPROVISED_ROBOT, STEP, THRUST])
        expect(alternated([])).toEqual([])
    })

    test("every booster of the game → all its cards kept, the first rounds taking the pools in turn", () => {
        const failures: string[] = []
        for(const booster of ALL_BOOSTERS){
            const pools = booster.pools.map(({ pool }) => pool)
            const chain = alternated(pools)
            if(chain.length !== pools.flat().length) failures.push(`${booster.name}: cards lost`)
            const shortest = Math.min(...pools.map(pool => pool.length))
            for(let at = 0; at < shortest * pools.length; at++){
                const expected = pools[at % pools.length][Math.floor(at / pools.length)]
                if(chain[at] !== expected) failures.push(`${booster.name}: place ${at} is ${chain[at].name}`)
            }
        }
        expect(failures).toEqual([])
    })

    test("the potions and the cards that play them → read together, whatever the pool", () => {
        const made = convert(BOOSTER_KIND, POISONS, BOOSTER_KIND)
        expect(made.pools.length).toBeGreaterThanOrEqual(2)
        expect(everyDrawReads(made.pools.map(({ pool }) => pool))).toBe(true)
    })
})

describe("a booster made of another thing", () => {
    test("a booster that is a chain of robot then module → a pool for each link, one card drawn from each", () => {
        const made = convert(BOOSTER_KIND, ATELIER, BOOSTER_KIND)
        expect(made.pools).toHaveLength(2)
        expect(made.pools.map(({ count }) => count)).toEqual([1, 1])
        expect(made.pools[0].pool).toContain(IMPROVISED_ROBOT)
        expect(made.pools[0].pool.every(card => card === IMPROVISED_ROBOT || card === TANK_ROBOT)).toBe(true)
        const modules: Card[] = [BOW_MODULE, BULL_MODULE, MISSILE]
        expect(made.pools[1].pool.some(card => modules.includes(card))).toBe(true)
    })

    test("every draw → the cards of its pools, in order, read whole", () => {
        for(const source of [ATELIER, MECA_BETE]){
            const made = convert(BOOSTER_KIND, source, BOOSTER_KIND)
            expect(everyDrawReads(made.pools.map(({ pool }) => pool)), source.name).toBe(true)
        }
    })

    test("every thing of the game → a booster whose every draw reads whole, never a chain in one pool", () => {
        const failures: string[] = []
        for(const source of KINDS){
            for(const value of source.all()){
                const made = convert(source, value, BOOSTER_KIND)
                const label = `${source.id}:${source.nameOf(value)}`
                if(!everyDrawReads(made.pools.map(({ pool }) => pool))) failures.push(`${label}: a draw does not read`)
                if(made.pools.length < 2) failures.push(`${label}: one pool only`)
            }
        }
        expect(failures).toEqual([])
    })

    test("the cards of a booster → all taken from the thing it is made of, none added", () => {
        for(const monster of MONSTER_KIND.all()){
            const made = convert(MONSTER_KIND, monster, BOOSTER_KIND)
            for(const card of pooled(made)) expect(monster.cards, monster.name).toContain(card)
        }
    })

    test("a thing whose chain has one link → completed by another chain to make two pools", () => {
        const made = convert(MONSTER_KIND, MONSTER_KIND.all()[0], BOOSTER_KIND)
        expect(made.pools.length).toBeGreaterThanOrEqual(2)
    })

    test("a thing converted twice → the same booster", () => {
        const first = convert(MONSTER_KIND, MONSTER_KIND.all()[0], BOOSTER_KIND)
        const second = convert(MONSTER_KIND, MONSTER_KIND.all()[0], BOOSTER_KIND)
        expect(pooled(first).map(card => card.name)).toEqual(pooled(second).map(card => card.name))
    })
})
