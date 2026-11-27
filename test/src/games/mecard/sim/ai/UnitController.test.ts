import { describe, expect, test } from "vitest"
import { DeckAi } from "@game/core-src/games/mecard/sim/ai/Bot"
import { LOOKAHEAD_COUNTS, LookaheadAi } from "@game/core-src/games/mecard/sim/ai/LookaheadAi"
import {
    combine,
    guessKey,
    lineCloseness,
    withoutDecks,
} from "@game/core-src/games/mecard/sim/ai/lookaheadHelpers"
import { RandomAi } from "@game/core-src/games/mecard/sim/ai/RandomAi"
import { ShuffleAi } from "@game/core-src/games/mecard/sim/ai/ShuffleAi"
import { askAi, viewFor } from "@game/core-src/games/mecard/sim/ai/UnitController"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { CardChain } from "@game/core-src/games/mecard/sim/card/CardChain"
import { SLASH } from "@game/core-src/games/mecard/sim/card/subs/attack/Slash"
import { AIM } from "@game/core-src/games/mecard/sim/card/subs/movement/Aim"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { SECRET_CARD } from "@game/core-src/games/mecard/sim/card/subs/SecretCard"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"

import { battle, HEROES, MONSTERS, unit } from "../fixtures"

function preparing() {
    const on = battle()
    const hero = unit(on, 3, 5, { team: HEROES, hand: [SLASH, STEP, AIM] })
    unit(on, 3, 1, { team: MONSTERS, hand: [SLASH] })
    on.startRound()
    return { on, hero }
}

describe("viewFor", () => {
    test("→ a copy with the unit in it, the battle left as it was", () => {
        const { on, hero } = preparing()
        const before = JSON.stringify(on.save())
        const { view, unit: seen } = viewFor(on, hero)
        expect(view).not.toBe(on)
        expect(view.units[on.units.indexOf(hero)]).toBe(seen)
        view.commit(seen, new DeckAi().decide(seen).chain)
        expect(JSON.stringify(on.save())).toBe(before)
    })
})

describe("DeckAi", () => {
    test("→ the chain of its hand read from left to right", () => {
        const { on, hero } = preparing()
        expect(askAi(on, hero, new DeckAi()).chain.cards).toEqual(new DeckAi().decide(hero).chain.cards)
    })
})

describe("RandomAi", () => {
    test("→ a chain of cards of the hand, within the size", () => {
        const { on, hero } = preparing()
        const ai = new RandomAi(new Rng(4))
        for(let times = 0; times < 20; times++){
            const { chain } = askAi(on, hero, ai)
            expect(chain.size).toBeLessThanOrEqual(hero.stats.chainSize.value)
            for(const card of chain.cards) expect(hero.hand).toContain(card)
        }
    })
})

describe("ShuffleAi and LookaheadAi", () => {
    test.each([
        ["ShuffleAi", () => new ShuffleAi(new Rng(2), 4, 1)],
        ["LookaheadAi", () => new LookaheadAi(new Rng(2), 4, true, {
            heuristics: true,
            prune: false,
            local: true,
            durations: true,
        }, 1)],
    ])("%s → a chain of cards of the hand, the battle left as it was", (_name, make) => {
        const { on, hero } = preparing()
        const before = JSON.stringify(on.save())
        const { chain } = askAi(on, hero, make())
        expect(chain.size).toBeLessThanOrEqual(hero.stats.chainSize.value)
        for(const card of chain.cards) expect(hero.hand).toContain(card)
        expect(JSON.stringify(on.save())).toBe(before)
    })
})

describe("Battle.bot", () => {
    /** An AI that notes what it was asked with, and plays nothing. */
    function spy() {
        const asked: { view: unknown, unit: unknown }[] = []
        return {
            asked,
            ai: {
                decide(unit: unknown, view: unknown){
                    asked.push({ view, unit })
                    return { chain: new CardChain() }
                },
            },
        }
    }

    test("a unit that is a bot → planned by battle.bot, on a copy of the battle", () => {
        const on = battle()
        const bot = unit(on, 3, 1, { team: MONSTERS, hand: [SLASH] })
        on.control(bot, "bot")
        const { asked, ai } = spy()
        on.bot = ai
        on.advance()
        expect(asked).toHaveLength(1)
        expect(asked[0].view).not.toBe(on)
        expect(asked[0].unit).not.toBe(bot)
    })

    test("a unit given an AI of its own → planned by it, not by battle.bot", () => {
        const on = battle()
        const bot = unit(on, 3, 1, { team: MONSTERS, hand: [SLASH] })
        const own = spy()
        const base = spy()
        on.control(bot, own.ai)
        on.bot = base.ai
        on.advance()
        expect(own.asked).toHaveLength(1)
        expect(base.asked).toHaveLength(0)
    })

    test("by default → the hand read from left to right", () => {
        const on = battle()
        const bot = unit(on, 3, 1, { team: MONSTERS, hand: [SLASH, STEP] })
        on.control(bot, "bot")
        const expected = new DeckAi().decide(bot).chain.cards
        on.advance()
        expect(on.planOf(bot)?.cards).toEqual(expected)
    })
})

describe("depth", () => {
    /** An AI that notes the depth it was asked with, and plays nothing. */
    function spy() {
        const depths: number[] = []
        return {
            depths,
            ai: {
                decide(_unit: unknown, _view: unknown, depth: number){
                    depths.push(depth)
                    return { chain: new CardChain() }
                },
            },
        }
    }

    const SMART = { heuristics: true, prune: false, local: false, durations: false }

    test("askAi → the root depth (-1) by default, or as told", () => {
        const { on, hero } = preparing()
        const { depths, ai } = spy()
        askAi(on, hero, ai)
        askAi(on, hero, ai, {}, 3)
        expect(depths).toEqual([-1, 3])
    })

    test("a root lookahead or shuffle → uses the depth it was built with", () => {
        const { on, hero } = preparing()
        const foe = on.units.find(each => each !== hero)!
        const { depths, ai } = spy()
        on.control(foe, ai)
        askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, SMART, 3))
        askAi(on, hero, new ShuffleAi(new Rng(1), 3, 2))
        askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, SMART, 0))
        askAi(on, hero, new ShuffleAi(new Rng(1), 3, 1))
        expect(depths).toEqual([2, 1, 0])
    })

    test("a lookahead of depth 1 → asks the AI of the other unit, with depth 0", () => {
        const { on, hero } = preparing()
        const foe = on.units.find(each => each !== hero)!
        const { depths, ai } = spy()
        on.control(foe, ai)
        askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, SMART, 1), {}, 1)
        expect(depths).toEqual([0])
    })

    test("a lookahead of depth 0 → asks no one", () => {
        const { on, hero } = preparing()
        const foe = on.units.find(each => each !== hero)!
        const { depths, ai } = spy()
        on.control(foe, ai)
        askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, SMART, 1), {}, 0)
        askAi(on, hero, new ShuffleAi(new Rng(1), 3, 1), {}, 0)
        expect(depths).toEqual([])
    })

    test("a unit of a player → played by the controller given to the lookahead, not by battle.bot", () => {
        const { on, hero } = preparing()
        const { depths: played, ai: players } = spy()
        const { depths: base, ai: bot } = spy()
        on.bot = bot
        askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, SMART, 1, { players }), {}, 1)
        askAi(on, hero, new ShuffleAi(new Rng(1), 3, 1, { players }), {}, 1)
        expect(played).toEqual([0, 0])
        expect(base).toEqual([])
    })

    test("a copy of a battle → keeps battle.bot and the AI of each unit", () => {
        const { on, hero } = preparing()
        const foe = on.units.find(each => each !== hero)!
        const own = spy().ai
        const base = spy().ai
        on.control(foe, own)
        on.bot = base
        const copy = on.clone()
        expect(copy.bot).toBe(base)
        expect(copy.units[on.units.indexOf(foe)].controller).toBe(own)
        copy.secretize(copy.units[on.units.indexOf(hero)])
        expect(copy.units[on.units.indexOf(foe)].controller).toBe(own)
        expect(copy.units[on.units.indexOf(hero)].controller).toBe("player")
    })
})

describe("leaf, depths and the memo of guesses", () => {
    const SMART = { heuristics: true, prune: false, local: false, durations: false }

    /** An AI that notes the depths it was asked with, and plays nothing. */
    function spy() {
        const depths: number[] = []
        return {
            depths,
            ai: {
                decide(_unit: unknown, _view: unknown, depth: number){
                    depths.push(depth)
                    return { chain: new CardChain() }
                },
            },
        }
    }

    test("at depth 0 → the other units asked to the leaf, with depth 0", () => {
        const { on, hero } = preparing()
        const { depths, ai: leaf } = spy()
        askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, SMART, 0, { leaf }))
        askAi(on, hero, new ShuffleAi(new Rng(1), 3, 0, { leaf }))
        expect(depths).toEqual([0, 0])
    })

    test("a lookahead as leaf → no endless loop, a chain of the hand", () => {
        const { on, hero } = preparing()
        const leaf = new LookaheadAi(new Rng(3), 3, false, SMART, 1)
        const { chain } = askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, SMART, 2, { leaf }))
        for(const card of chain.cards) expect(hero.hand).toContain(card)
    })

    test("several depths → each level of the other unit asked once", () => {
        const { on, hero } = preparing()
        const foe = on.units.find(each => each !== hero)!
        const { depths, ai } = spy()
        on.control(foe, ai)
        askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, SMART, 3, { depths: [1, 2, 3, 3] }))
        expect([...depths].sort()).toEqual([0, 1, 2])
    })

    test("depths beyond its own depth → kept at its own depth", () => {
        const { on, hero } = preparing()
        const foe = on.units.find(each => each !== hero)!
        const { depths, ai } = spy()
        on.control(foe, ai)
        askAi(on, hero, new ShuffleAi(new Rng(1), 3, 1, { depths: [5] }))
        expect(depths).toEqual([0])
    })

    test("two lookaheads, depth 2 → each unit decided once per level", () => {
        const { on, hero } = preparing()
        const foe = on.units.find(each => each !== hero)!
        let asked = 0
        const counted = new LookaheadAi(new Rng(2), 3, false, SMART, 2)
        const decideWith = counted.decideWith.bind(counted)
        counted.decideWith = (...args) => {
            asked++
            return decideWith(...args)
        }
        on.control(foe, counted)
        const { chain } = askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, SMART, 2, { depths: [0, 1, 2] }))
        // The foe at levels 1 and 2, each once; level 0 is the leaf.
        expect(asked).toBe(2)
        for(const card of chain.cards) expect(hero.hand).toContain(card)
    })

    test("several depths against the deck AI → as many tries as one depth", () => {
        const { on, hero } = preparing()
        on.control(on.units.find(each => each !== hero)!, new DeckAi())
        LOOKAHEAD_COUNTS.played = 0
        askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, SMART, 2))
        const one = LOOKAHEAD_COUNTS.played
        LOOKAHEAD_COUNTS.played = 0
        askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, SMART, 2, { depths: [0, 1, 2] }))
        expect(LOOKAHEAD_COUNTS.played).toBe(one)
    })
})

describe("LookaheadAi.predicted", () => {
    const SMART = { heuristics: true, prune: false, local: false, durations: false }

    test("the root decision → told once, with its guesses and its plan; a guess for another AI → not told", () => {
        const { on, hero } = preparing()
        const foe = on.units.find(each => each !== hero)!
        const guessed = new LookaheadAi(new Rng(2), 3, false, SMART, 1)
        const told: unknown[] = []
        guessed.predicted.add(prediction => told.push(prediction))
        on.control(foe, guessed)
        const root = new LookaheadAi(new Rng(1), 3, false, SMART, 2, { depths: [1, 2] })
        const predictions: { groups: readonly { levels: readonly number[] }[], plan: unknown }[] = []
        root.predicted.add(prediction => predictions.push(prediction))
        askAi(on, hero, root)
        expect(told).toEqual([])
        expect(predictions).toHaveLength(1)
        expect(predictions[0].groups.flatMap(group => group.levels).sort()).toEqual([1, 2])
        askAi(on, hero, root, {}, 1)
        expect(predictions).toHaveLength(1)
    })
})

describe("the secret card and hidden decks", () => {
    const SMART = { heuristics: true, prune: false, local: false, durations: false }

    /** A battle whose units have cards in their piles and discards. */
    function withDecks() {
        const { on, hero } = preparing()
        const foe = on.units.find(each => each !== hero)!
        hero.decks.all[0].pile.push(SLASH, STEP)
        hero.decks.all[0].discard.push(AIM)
        foe.decks.all[0].pile.push(SLASH)
        return { on, hero, foe }
    }

    test("a hand holding the secret card → never in the chain of a lookahead or a shuffle", () => {
        const on = battle()
        const hero = unit(on, 3, 5, { team: HEROES, hand: [SECRET_CARD, SLASH, SECRET_CARD, STEP] })
        unit(on, 3, 1, { team: MONSTERS, hand: [SLASH] })
        on.startRound()
        for(const ai of [new LookaheadAi(new Rng(1), 4, false, SMART, 1), new ShuffleAi(new Rng(1), 4, 1)]){
            expect(askAi(on, hero, ai).chain.cards).not.toContain(SECRET_CARD)
        }
    })

    test("withoutDecks → every pile and discard made of the secret card, as many, the hands and the view left as they are", () => {
        const { on, hero, foe } = withDecks()
        const { view, unit: seen } = withoutDecks(on, hero)
        for(const each of view.units) for(const deck of each.decks.all){
            expect([...deck.pile, ...deck.discard].every(card => card === SECRET_CARD)).toBe(true)
        }
        expect(seen.decks.all[0].pile).toHaveLength(2)
        expect(seen.decks.all[0].discard).toHaveLength(1)
        expect(view.units[on.units.indexOf(foe)].decks.all[0].pile).toHaveLength(1)
        expect(seen.hand.map(card => card.name)).toEqual(hero.hand.map(card => card.name))
        expect(hero.decks.all[0].pile).toEqual([SLASH, STEP])
    })

    test("withoutDecks → keeps battle.bot and the AI of each unit, as a clone does", () => {
        const { on, hero, foe } = withDecks()
        const own = new DeckAi()
        const base = new DeckAi()
        on.control(foe, own)
        on.bot = base
        const { view } = withoutDecks(on, hero)
        expect(view.bot).toBe(base)
        expect(view.units[on.units.indexOf(foe)].controller).toBe(own)
        expect(view.units[on.units.indexOf(hero)].controller).toBe(hero.controller)
    })

    test("hiddenDecks → its tries see no card of a deck, its plan committed in the battle itself", () => {
        const { on, hero } = withDecks()
        const seen: Card[] = []
        const leaf = {
            decide(_unit: unknown, view: Battle){
                for(const each of view.units) for(const deck of each.decks.all) seen.push(...deck.pile, ...deck.discard)
                return { chain: new CardChain() }
            },
        }
        const plan = askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, SMART, 0, { leaf, hiddenDecks: true }))
        expect(seen.length).toBeGreaterThan(0)
        expect(seen.every(card => card === SECRET_CARD)).toBe(true)
        expect(() => on.commitPlan(hero, plan)).not.toThrow()
    })
})

describe("position, finalists, AI of the future, combination", () => {
    const AHEAD = { heuristics: true, prune: false, local: false, durations: false, ahead: true }

    test("lineCloseness → 1 right in front, 0.5 a meter aside, 0 behind", () => {
        const { on, hero } = preparing()
        const other = on.units.find(each => each !== hero)!
        const facing = hero.direction.normalized!
        const at = (offset: Vector2) => {
            other.position = hero.position.plus(offset)
            return lineCloseness(hero, other)
        }
        expect(at(facing.times(3))).toBeCloseTo(1)
        expect(at(facing.times(3).plus(facing.right))).toBeCloseTo(0.5)
        expect(at(facing.times(-2))).toBe(0)
    })

    test("combine → the weighted mean, the worst or the best", () => {
        const scores = [{ value: 2, weight: 1 }, { value: 8, weight: 2 }]
        expect(combine("mean", scores)).toBeCloseTo(6)
        expect(combine("safe", scores)).toBe(2)
        expect(combine("unsafe", scores)).toBe(8)
    })

    test("positions weighing nothing → the same chain as without, on the same view", () => {
        const { on, hero } = preparing()
        // One view for both: each view is secretized with random numbers of its own.
        const { view, unit: seen } = viewFor(on, hero)
        const plain = new LookaheadAi(new Rng(1), 4, false, AHEAD, 0).decide(seen, view, -1)
        const weighed = new LookaheadAi(new Rng(1), 4, false, { ...AHEAD, positions: { exposed: 0, aim: 0 } }, 0).decide(seen, view, -1)
        expect(weighed.chain.cards).toEqual(plain.chain.cards)
    })

    test("more finalists → more battles tried, a chain of the hand", () => {
        const { on, hero } = preparing()
        LOOKAHEAD_COUNTS.played = 0
        askAi(on, hero, new LookaheadAi(new Rng(1), 6, false, AHEAD, 0))
        const three = LOOKAHEAD_COUNTS.played
        LOOKAHEAD_COUNTS.played = 0
        const { chain } = askAi(on, hero, new LookaheadAi(new Rng(1), 6, false, { ...AHEAD, aheadChains: 6 }, 0))
        expect(LOOKAHEAD_COUNTS.played).toBeGreaterThan(three)
        for(const card of chain.cards) expect(hero.hand).toContain(card)
    })

    test("an AI of the future → asked in the second round for every unit, with depth 0; never without ahead", () => {
        const { on, hero } = preparing()
        const depths: number[] = []
        const future = {
            decide(_unit: unknown, _view: unknown, depth: number){
                depths.push(depth)
                return { chain: new CardChain() }
            },
        }
        askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, { ...AHEAD, ahead: false }, 0, { future }))
        expect(depths).toEqual([])
        askAi(on, hero, new LookaheadAi(new Rng(1), 3, false, AHEAD, 0, { future }))
        expect(depths.length).toBeGreaterThanOrEqual(2)
        expect(depths.every(depth => depth === 0)).toBe(true)
    })
})

describe("guessKey", () => {
    test("the same guesses → one key; other cards → another key", () => {
        const { on } = preparing()
        const foe = on.units.find(each => each.hand.length === 1)!
        const index = on.units.indexOf(foe)
        const plain = new Map([[index, { chain: new CardChain([SLASH]) }]])
        const other = new Map([[index, { chain: new CardChain([STEP]) }]])
        expect(guessKey(on, plain)).toBe(guessKey(on, new Map(plain)))
        expect(guessKey(on, plain)).not.toBe(guessKey(on, other))
    })
})

describe("askAi", () => {
    test("a card the unit does not hold → refused", () => {
        const { on, hero } = preparing()
        const ai = { decide: () => ({ chain: new CardChain([AIM, AIM]) }) }
        expect(() => askAi(on, hero, ai)).toThrow()
    })
})
