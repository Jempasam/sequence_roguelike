import { describe, expect, test } from "vitest"
import {
    AbstractCard, ACTION, CardChain, FIRE, PREPARATION, Rarity, REPEAT_2, resolve, signatureOf, SPELL, STEP,
    THRUST,
} from "@game/core/mecard"
import type { Action, Card, ChainWatcher, Preparation, RewriteContext } from "@game/core/mecard"

import { battle, chain, MONSTERS, unit } from "../fixtures"

/** A chain reading its first option of each chance. */
const FIRST: RewriteContext = { pick: options => options[0] }

/** A preparation taking actions: replaced by a thrust for each action it was given. */
class Doubling extends AbstractCard<Preparation, readonly Action[]> {


    public readonly output = PREPARATION
    public readonly input = ACTION

    constructor(){
        super("Doublage", "", Rarity.COMMON)
    }


    public get(actions: readonly Action[]): Preparation {
        const cards = actions.map(() => THRUST as Card)
        return { rewrite: () => ({ cards, consumed: 0, acting: false }) }
    }
}

const DOUBLING = new Doubling()

/** What a chain tells as it is read, each thing as a word. */
function watched(read: CardChain): string[] {
    const told: string[] = []
    const watcher: ChainWatcher = {
        activated: (first, last) => told.push(`activated ${first}-${last}`),
        invalid: index => told.push(`invalid ${index}`),
        changed: () => told.push(`changed ${read.cursor}`),
    }
    read.watcher = watcher
    return told
}

// --- Tests ---

describe("CardChain.get", () => {
    test("a card and what it takes → what the first gives, and the last of the tree", () => {
        const built = chain(SPELL, FIRE, STEP).get(0)
        expect(built?.last).toBe(1)
        expect(built?.value).toHaveLength(1)
    })

    test("a card taking nothing → itself alone", () => {
        expect(chain(STEP, STEP).get(0)?.last).toBe(0)
    })

    test("an input missing, or of another type → nothing", () => {
        expect(chain(SPELL).get(0)).toBeNull()
        expect(chain(SPELL, STEP).get(0)).toBeNull()
        expect(chain(REPEAT_2, SPELL).get(0)).toBeNull()
    })

    test("past the end → nothing", () => {
        expect(chain(STEP).get(1)).toBeNull()
    })
})

describe("CardChain.next", () => {
    test("a tree → what it gives, the cursor after its last card", () => {
        const read = chain(SPELL, FIRE, STEP)
        expect(read.next(ACTION)).toHaveLength(1)
        expect(read.cursor).toBe(2)
    })

    test("a card of another type → skipped unbuilt, nothing told, the reading goes on", () => {
        const read = chain(FIRE, STEP)
        const told = watched(read)
        expect(read.next(ACTION)).toHaveLength(1)
        expect(told).toEqual(["changed 1", "activated 1-1", "changed 2"])
    })

    test("a card of the type that cannot be built → told invalid, the reading goes on in the same call", () => {
        const read = chain(SPELL, STEP)
        const told = watched(read)
        expect(read.next(ACTION)).toHaveLength(1)
        expect(told).toEqual(["invalid 0", "changed 1", "activated 1-1", "changed 2"])
    })

    test("told before the cursor moves → the tree is lit before it is greyed out", () => {
        const read = chain(STEP, STEP)
        const told = watched(read)
        read.next(ACTION)
        expect(told).toEqual(["activated 0-0", "changed 1"])
    })

    test("the end of the row → nothing", () => {
        const read = chain(STEP)
        read.next(ACTION)
        expect(read.next(ACTION)).toBeNull()
    })
})

describe("CardChain.copy", () => {
    test("read as far, telling nothing", () => {
        const read = chain(STEP, STEP)
        read.next(ACTION)
        const told = watched(read)
        const copy = read.copy()
        expect(copy.cursor).toBe(1)
        copy.next(ACTION)
        expect(told).toEqual([])
    })

    test("what is left counted → nothing told, the cursor where it was", () => {
        const read = chain(REPEAT_2, STEP, SPELL)
        const told = watched(read)
        expect(read.actionsLeft()).toHaveLength(2)
        expect(read.cursor).toBe(0)
        expect(told).toEqual([])
    })
})

describe("A preparation taking an input", () => {
    test("given it → built from it, the whole tree rewritten", () => {
        const read = chain(DOUBLING, REPEAT_2, STEP, STEP)
        read.prepare(FIRST)
        expect(read.cards).toEqual([THRUST, THRUST, STEP])
    })

    test("what is on its right starts after its tree", () => {
        const seen: (Card|null)[] = []
        const looking = new Doubling()
        looking.get = () => ({
            rewrite: (_ctx, spot) => {
                seen.push(spot.next)
                return { cards: [], consumed: 0, acting: false }
            },
        })
        chain(looking, STEP, THRUST).prepare(FIRST)
        expect(seen).toEqual([THRUST])
    })

    test("not given it → told invalid, left greyed out, skipped by the turns", () => {
        const read = chain(DOUBLING, FIRE, STEP)
        const told = watched(read)
        read.prepare(FIRST)
        expect(read.cards).toEqual([DOUBLING, FIRE, STEP])
        expect(told).toEqual(["invalid 0"])
        expect(read.next(ACTION)).toHaveLength(1)
        expect(read.cursor).toBe(3)
    })

    test("not given it → greyed out when read, as any card", () => {
        expect(chain(DOUBLING).activity()).toEqual([false])
        expect(resolve([DOUBLING], FIRST).cards).toEqual([DOUBLING])
    })

    test("alone → reads as what it takes and gives", () => {
        expect(signatureOf(DOUBLING)).toEqual({ input: ACTION, output: PREPARATION })
    })
})

describe("CardChain.prepare", () => {
    test("the cursor stays: nothing it went past was played", () => {
        const read = chain(STEP, DOUBLING, STEP)
        const told = watched(read)
        read.prepare(FIRST)
        expect(read.cursor).toBe(0)
        expect(told).toEqual(["activated 1-2", "changed 0"])
    })

    test("in a battle, the plan stays as it was committed: its unit reads a copy", () => {
        const on = battle()
        const hero = unit(on, 1, 5, { hand: [DOUBLING, STEP] })
        unit(on, 6, 1, { team: MONSTERS })
        on.startRound()
        on.commit(hero, chain(DOUBLING, STEP))
        on.endPreparation()
        expect(hero.chain.cards).toEqual([THRUST])
        expect(on.planOf(hero)?.cards).toEqual([DOUBLING, STEP])
    })
})
