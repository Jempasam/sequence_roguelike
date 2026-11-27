import { describe, expect, test } from "vitest"
import { BITE_PROFILE, RUN_PROFILE } from "@game/core-src/games/mecard/sim/analysis/Profile"
import { readsWhole } from "@game/core-src/games/mecard/sim/card/CardChain"
import { SHOT } from "@game/core-src/games/mecard/sim/card/subs/attack/Shot"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { BOW_MODULE } from "@game/core-src/games/mecard/sim/card/subs/mechanic/ModuleCard"
import { IMPROVISED_ROBOT } from "@game/core-src/games/mecard/sim/card/subs/mechanic/RobotCard"
import { AIM } from "@game/core-src/games/mecard/sim/card/subs/movement/Aim"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import {
    arranged, bestSet, comboPossible, completion, partition, ranked, without,
} from "@game/core/mecard/unordered-parts"

// --- Tests ---

describe("bestSet", () => {
    test("a set in any order → the cards that fit the most, each once", () => {
        expect(bestSet([THRUST, STEP, THRUST, AIM], BITE_PROFILE, 3)).toEqual([THRUST])
        expect(bestSet([AIM, STEP, THRUST], RUN_PROFILE, 2)).toEqual([STEP])
    })

    test("ranked → the cards that fit the most first, the order of the set on a tie", () => {
        expect(ranked([AIM, THRUST, STEP], BITE_PROFILE)[0]).toBe(THRUST)
    })
})

describe("partition and without", () => {
    test("partition → each card in the profile it is for the most", () => {
        const found = partition([STEP, THRUST, AIM])
        expect(found.get(RUN_PROFILE)).toEqual([STEP])
        expect(found.get(BITE_PROFILE)).toEqual([THRUST])
    })

    test("without → one card of the set for each card taken", () => {
        expect(without([STEP, STEP, THRUST], [STEP])).toEqual([STEP, THRUST])
    })
})

describe("arranged", () => {
    test("a taker given before its giver → the taker first, the whole reads", () => {
        const chain = arranged([BOW_MODULE, IMPROVISED_ROBOT])
        expect(chain).toEqual([IMPROVISED_ROBOT, BOW_MODULE])
        expect(readsWhole(chain)).toBe(true)
    })

    test("a taker nothing gives to → left out, nothing at all when nothing reads", () => {
        expect(arranged([IMPROVISED_ROBOT])).toEqual([])
        expect(arranged([IMPROVISED_ROBOT, STEP])).toEqual([STEP])
    })

    test("completion → the card then the cards it needs, none when they lack", () => {
        expect(completion(IMPROVISED_ROBOT, [BOW_MODULE, STEP])).toEqual([IMPROVISED_ROBOT, BOW_MODULE])
        expect(completion(IMPROVISED_ROBOT, [STEP])).toBeNull()
    })
})

describe("comboPossible", () => {
    test("every card that takes something has what it takes → possible", () => {
        expect(comboPossible([IMPROVISED_ROBOT, BOW_MODULE])).toBe(true)
        expect(comboPossible([SHOT])).toBe(true)
    })

    test("a card that takes something the set lacks → not possible", () => {
        expect(comboPossible([IMPROVISED_ROBOT, STEP])).toBe(false)
        expect(comboPossible([])).toBe(false)
    })
})
