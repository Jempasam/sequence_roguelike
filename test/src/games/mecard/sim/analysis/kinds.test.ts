import { describe, expect, test } from "vitest"
import { everyDrawReads } from "@game/core-src/games/mecard/sim/analysis/draws"
import {
    BEAST_KIND,
    convert,
    KINDS,
    MODULE_KIND,
    MONSTER_KIND,
    PET_KIND,
} from "@game/core-src/games/mecard/sim/analysis/Kinds"
import { visual } from "@game/core-src/games/mecard/sim/base/Visual"
import { readsWhole } from "@game/core-src/games/mecard/sim/card/CardChain"
import { DAGGER } from "@game/core-src/games/mecard/sim/card/subs/attack/Dagger"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { BACK_DASH } from "@game/core-src/games/mecard/sim/card/subs/movement/BackDash"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { monster } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { WOLF } from "@game/core-src/games/mecard/sim/catalog/pets"
import type { Kind } from "@game/core-src/games/mecard/sim/analysis/Kinds"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"
import type { BeastCard } from "@game/core-src/games/mecard/sim/card/subs/beast/BeastCard"
import type { ModuleCard } from "@game/core-src/games/mecard/sim/card/subs/mechanic/ModuleCard"
import type { Booster } from "@game/core-src/games/mecard/sim/catalog/boosters"
import type { Kit } from "@game/core-src/games/mecard/sim/catalog/kits"
import type { Monster } from "@game/core-src/games/mecard/sim/catalog/monsters"

// --- Fixture builders ---

const SOURCES = KINDS.flatMap(source => source.all().map(value => ({ source, value })))

function names(cards: readonly Card[]): string[] {
    return cards.map(card => card.name)
}

/** What a built thing is, as plain names, to compare two builds. */
function shapeOf(kind: Kind<unknown>, value: unknown): unknown {
    switch(kind.id){
        case "monster":
        case "pet": {
            const { draw, hearts, cards } = value as Monster
            return [draw, hearts, names(cards)]
        }
        case "kit": {
            const { cards, unlimited } = value as Kit
            return [names(cards), names(unlimited ?? [])]
        }
        case "booster": {
            const { pools } = value as Booster
            return pools.map(({ count, pool }) => [count, names(pool)])
        }
        case "module": return names((value as ModuleCard).cards)
        default: {
            const { run, bite, body } = (value as BeastCard).beast
            return [names(run), names(bite), body.map(part => typeof part === "string" ? part : part.name)]
        }
    }
}

/** What is wrong in the form of a built thing: nothing when it is as every thing of its kind is. */
function problemsOf(kind: Kind<unknown>, value: unknown, from: Kind<unknown>): string[] {
    const found: string[] = []
    switch(kind.id){
        case "monster":
        case "pet": {
            const { cards, draw } = value as Monster
            if(cards.length === 0) found.push("no card")
            if(kind.id === "monster" && cards.length % draw !== 0) found.push("rounds are not whole")
            break
        }
        case "kit": {
            const { cards, unlimited } = value as Kit
            if(unlimited?.length !== 2) found.push("not two unlimited cards")
            if(cards.length === 0) found.push("no card")
            break
        }
        case "booster": {
            const { pools } = value as Booster
            if(pools.length < 2) found.push("fewer than two pools")
            if(pools.some(({ count }) => count !== 1)) found.push("a pool that does not give one card")
            if(!everyDrawReads(pools.map(({ pool }) => pool))) found.push("a draw that does not read whole")
            break
        }
        case "module": {
            const { cards } = value as ModuleCard
            if(cards.length === 0) found.push("no card")
            else if(cards.length > MODULE_KIND.defaults.main.max) found.push("too long")
            else if(!readsWhole(cards)) found.push("does not read whole")
            break
        }
        default: {
            const { run, bite, body } = (value as BeastCard).beast
            if(run.length === 0) found.push("empty run")
            if(bite.length === 0) found.push("empty bite")
            if(!readsWhole(run)) found.push("run does not read whole")
            if(!readsWhole(bite)) found.push("bite does not read whole")
            // A booster may only hold chains that read whole and are longer than a run: given as they are.
            if(from.id !== "booster" && run.length > kind.defaults.run.max) found.push("run too long")
            if(from.id !== "booster" && bite.length > kind.defaults.bite.max) found.push("bite too long")
            if(!body.includes("run") || !body.includes("bite")) found.push("body lacks run or bite")
        }
    }
    return found
}

// --- Tests ---

describe("convert", () => {
    for(const target of KINDS){
        test(`every source → a ${target.id} that is the same each time, and of a coherent form`, () => {
            const failures: string[] = []
            for(const { source, value } of SOURCES){
                const first = convert(source, value, target)
                const second = convert(source, value, target)
                const label = `${source.id}:${source.nameOf(value)} -> ${target.id}`
                if(JSON.stringify(shapeOf(target, first)) !== JSON.stringify(shapeOf(target, second))){
                    failures.push(`${label}: not deterministic`)
                }
                for(const problem of problemsOf(target, first, source)) failures.push(`${label}: ${problem}`)
            }
            expect(failures).toEqual([])
        })
    }

    test("a wolf pet → a beast with a run and a bite", () => {
        const made = convert(PET_KIND, WOLF, BEAST_KIND).beast
        expect(made.run.length).toBeGreaterThan(0)
        expect(made.bite.length).toBeGreaterThan(0)
    })

    test("a wolf pet → its run moves and its bite strikes", () => {
        const made = convert(PET_KIND, WOLF, BEAST_KIND).beast
        expect(made.run.every(card => [STEP, BACK_DASH].includes(card as never))).toBe(true)
        expect(made.bite.every(card => [DAGGER, THRUST].includes(card as never))).toBe(true)
    })

    test("a wolf pet → a monster that plays whole rounds of its draw", () => {
        const made = convert(PET_KIND, WOLF, MONSTER_KIND)
        expect(made.cards.length % made.draw).toBe(0)
        expect(made.hearts).toBe(WOLF.hearts)
    })

    test("a monster that runs and bites again and again → every one is marked in the body of the beast", () => {
        const again = monster({
            name: "Insistant", sprite: visual("units/goblin"), hearts: 3, draw: 2,
            cards: [STEP, THRUST, STEP, THRUST, STEP, THRUST],
        })
        const { body } = convert(MONSTER_KIND, again, BEAST_KIND).beast
        expect(body).toEqual(["run", "bite", "run", "bite", "run", "bite"])
    })

    test("a body → always holds a run and a bite, whatever the source", () => {
        for(const source of KINDS){
            for(const value of source.all().slice(0, 5)){
                const { body } = convert(source, value, BEAST_KIND).beast
                expect(body, `${source.id}:${source.nameOf(value)}`).toContain("run")
                expect(body, `${source.id}:${source.nameOf(value)}`).toContain("bite")
            }
        }
    })

    test("sizes given → the cards of the run and of the bite stay within them", () => {
        const sizes = { ...BEAST_KIND.defaults, run: { min: 1, max: 1 }, bite: { min: 1, max: 1 } }
        const made = convert(MONSTER_KIND, WOLF, BEAST_KIND, sizes).beast
        expect(made.run.length).toBe(1)
        expect(made.bite.length).toBe(1)
    })
})
