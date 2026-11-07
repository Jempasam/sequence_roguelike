import { describe, expect, test } from "vitest"
import {
    BOTTLE, CardChain, CHAOS, DOUBLE_DIAGONAL, DRAW, FIRE, FusionCard, Heart, INSTINCT, POISON,
    POTION_POUCH, PRAYER, PREPARATION, RECOVERY, RED_HEART, REPEAT_2, REPETITION, resolve, SLASH, SPELL, STEP,
    SUPER_REPETITION, THRUST, TORNADO, Vector2, REACTION, RITUAL, WATER, AURA,
} from "@game/core/mecard"
import type { RewriteContext } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../../../fixtures"

/** A context drawing the option at an index, or the last when there are fewer. */
function drawing(index: number): RewriteContext {
    return { pick: options => options[Math.min(index, options.length - 1)] }
}

// --- Tests ---

describe("REPETITION", () => {
    test("before a thrust → two thrusts", () => {
        const resolution = resolve([REPETITION, THRUST], drawing(0))
        expect(resolution.cards).toEqual([THRUST, THRUST])
        expect(resolution.chain.actionsLeft()).toHaveLength(2)
    })

    test("before a modifier and what it takes → the modifier twice, nesting", () => {
        const resolution = resolve([REPETITION, REPEAT_2, STEP], drawing(0))
        expect(resolution.chain.actionsLeft()).toHaveLength(4)
    })

    test("before a preparation card → played twice", () => {
        const resolution = resolve([REPETITION, PRAYER], drawing(0))
        expect(resolution.acting).toHaveLength(2)
    })

    test("at the end of the row → nothing", () => {
        const resolution = resolve([STEP, REPETITION], drawing(0))
        expect(resolution.cards).toEqual([STEP])
    })
})

describe("RECOVERY", () => {
    test("before a slash → the slash plays, and a copy of it lands in hand", () => {
        const on = battle()
        const player = unit(on, 3, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.startRound()
        player.hand.push(RECOVERY, SLASH)
        on.commit(player, chain(RECOVERY, SLASH))
        on.endPreparation()
        expect(player.stepsLeft).toBe(1)
        expect(player.hand).toContain(SLASH)
    })

    test("before a spell and its element → the spell still cast with it, and a copy of the spell in hand", () => {
        const on = battle()
        const player = unit(on, 3, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.startRound()
        player.hand.push(RECOVERY, SPELL, FIRE)
        on.commit(player, chain(RECOVERY, SPELL, FIRE))
        on.endPreparation()
        expect(player.stepsLeft).toBe(1)
        expect(player.hand).toContain(SPELL)
    })

    test("rewritten in a preview → nothing put in the hand", () => {
        const on = battle()
        const player = unit(on, 3, 5, { hand: [RECOVERY, SLASH] })
        chain(RECOVERY, SLASH).preview(on, player, false)
        new CardChain([RECOVERY, SLASH]).activity()
        expect(player.hand).toEqual([RECOVERY, SLASH])
    })

    test("at the end of the chain → greyed out, playing nothing", () => {
        expect(new CardChain([STEP, RECOVERY]).activity()).toEqual([true, false])
        expect(new CardChain([RECOVERY, STEP]).activity()).toEqual([true, true])
    })
})

describe("Rewrites, from left to right", () => {
    test("a repetition before a repetition → ends, its own copies never rewritten again", () => {
        const resolution = resolve([REPETITION, REPETITION, SLASH], drawing(0))
        expect(resolution.chain.actionsLeft().length).toBeGreaterThan(0)
        expect(resolution.cards.every(card => card === SLASH)).toBe(true)
    })

    test("a recovery before a fusion → the fusion whole in hand", () => {
        const on = battle()
        const player = unit(on, 3, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.startRound()
        const fusion = new FusionCard([STEP, SLASH])
        player.hand.push(RECOVERY, fusion)
        on.commit(player, chain(RECOVERY, fusion))
        on.endPreparation()
        expect(player.hand).toContain(fusion)
        expect(player.stepsLeft).toBe(2)
    })

    test("a super repetition before a fusion → the fusion copied whole, then unfolded twice", () => {
        const resolution = resolve([SUPER_REPETITION, new FusionCard([STEP, SLASH])], drawing(0))
        expect(resolution.cards).toEqual([STEP, SLASH, STEP, SLASH])
    })
})

describe("SUPER_REPETITION", () => {
    test("before a step and a slash → the whole chain on its right twice, in order", () => {
        const resolution = resolve([SUPER_REPETITION, STEP, SLASH], drawing(0))
        expect(resolution.cards).toEqual([STEP, SLASH, STEP, SLASH])
        expect(resolution.chain.actionsLeft()).toHaveLength(4)
    })

    test("after a card → only what is on its right repeated", () => {
        const resolution = resolve([THRUST, SUPER_REPETITION, STEP], drawing(0))
        expect(resolution.cards).toEqual([THRUST, STEP, STEP])
    })

    test("at the end of the row → nothing, greyed out", () => {
        expect(new CardChain([STEP, SUPER_REPETITION]).activity()).toEqual([true, false])
    })
})

describe("CardChain.activity", () => {
    test("a modifier before a fusion giving an action → both play, once rewritten", () => {
        expect(new CardChain([REPEAT_2, new FusionCard([THRUST, STEP])]).activity()).toEqual([true, true])
    })

    test("a fusion of a spell, with no element after it → greyed out", () => {
        expect(new CardChain([new FusionCard([STEP, SPELL])]).activity()).toEqual([true])
        expect(new CardChain([SPELL, new FusionCard([STEP, FIRE])]).activity()).toEqual([false, true])
    })
})

describe("INSTINCT", () => {
    test("tried on the whole chain → never a card that only its neighbours would take", () => {
        // A spell on its left takes an element: the fire fits there, the slash does not.
        const resolution = resolve([SPELL, INSTINCT], drawing(0), [SLASH, FIRE])
        expect(resolution.cards).toEqual([SPELL, FIRE])
    })

    test("among the cards in sight → one that fits its place", () => {
        const resolution = resolve([REPEAT_2, INSTINCT], drawing(0), [FIRE, SLASH])
        expect(resolution.cards).toEqual([REPEAT_2, SLASH])
        expect(resolution.chain.actionsLeft()).toHaveLength(2)
    })

    test("before nothing fits → lost", () => {
        const resolution = resolve([INSTINCT], drawing(0), [FIRE])
        expect(resolution.cards).toEqual([])
    })

    test("never itself, so a draw always ends", () => {
        const resolution = resolve([INSTINCT], drawing(0), [INSTINCT, CHAOS, STEP])
        expect(resolution.cards).toEqual([STEP])
    })

    test("in a preview → guessed, so its root is not shown", () => {
        const on = battle()
        const player = unit(on, 3, 5, { hand: [STEP] })
        const [root] = chain(INSTINCT).preview(on, player, false)
        expect(root.preview).toBeNull()
    })
})

describe("CHAOS", () => {
    test("in the slot of a spell → an element", () => {
        for(let index = 0; index < 40; index += 7){
            const resolution = resolve([SPELL, CHAOS], drawing(index))
            expect(resolution.cards[1]?.output).toBe(FIRE.output)
        }
    })
})

describe("POTION_POUCH", () => {
    test("in a bottle → a potion of the cards in sight", () => {
        const resolution = resolve([BOTTLE, POTION_POUCH], drawing(0), [SLASH, POISON])
        expect(resolution.cards).toEqual([BOTTLE, POISON])
        expect(POTION_POUCH.output).toBe(PREPARATION)
    })
})

describe("TORNADO", () => {
    test("a thrust → four steps, the unit facing as it started", () => {
        const on = battle()
        const spinner = unit(on, 3, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.startRound()
        spinner.hand.push(TORNADO, THRUST)
        on.commit(spinner, chain(TORNADO, THRUST))
        on.endPreparation()
        expect(spinner.stepsLeft).toBe(4)
        on.playRound()
        expect(spinner.direction).toEqual(Vector2.UP)
    })

    test("a double diagonal → still four steps, each going both ways", () => {
        expect(resolve([TORNADO, DOUBLE_DIAGONAL, THRUST], drawing(0)).chain.actionsLeft()).toHaveLength(4)
    })

    test("its preview → the unit facing as it started", () => {
        const on = battle()
        const spinner = unit(on, 3, 5)
        const [root] = chain(TORNADO, THRUST).preview(on, spinner, false)
        expect(root.preview?.pose.direction).toEqual(Vector2.UP)
    })
})

describe("DRAW", () => {
    test("played → two more cards in hand, the round after", () => {
        const on = battle()
        const drawer = on.add({
            name: "drawer", team: MONSTERS, controller: "bot", position: new Vector2(3, 5), direction: Vector2.UP,
            hearts: Heart.many(RED_HEART, 2),
            decks: [[STEP, STEP, STEP, STEP, STEP, STEP, STEP, STEP, STEP]],
            bases: { firstDraw: 2 },
        })
        unit(on, 0.5, 0.5)
        on.startRound()
        const before = drawer.hand.length
        play(on, [[drawer, chain(DRAW)]])
        // The draw of the next round comes on top.
        expect(drawer.hand.length).toBe(before + 2 + drawer.stats.draw.value)
    })
})

describe("cards a preparation reads on its right", () => {
    test("a ritual and an element → both play, the element being kept", () => {
        expect(new CardChain([RITUAL, FIRE]).activity()).toEqual([true, true])
    })

    test("a reaction and one element → the element stays greyed out", () => {
        expect(new CardChain([REACTION, FIRE]).activity()).toEqual([false, false])
    })

    test("a reaction and two elements → the three play, standing for the compound", () => {
        const resolution = resolve([REACTION, FIRE, WATER], drawing(0))
        expect(resolution.cards).toHaveLength(1)
        expect(resolution.sources).toEqual([[0, 1, 2]])
        expect(new CardChain([SPELL, REACTION, FIRE, WATER]).activity()).toEqual([true, true, true, true])
    })

    test("a card given back → stands for itself", () => {
        expect(resolve([REPETITION, STEP], drawing(0)).sources).toEqual([[1], [0]])
    })
})

describe("a spell before a reaction", () => {
    test("aura, reaction, two elements → all four play, the elements standing for the compound", () => {
        const row = [AURA, REACTION, FIRE, WATER]
        expect(new CardChain(row).activity()).toEqual([true, true, true, true])
        const { sources, reading } = resolve(row, drawing(0))
        expect(reading.roots).toHaveLength(1)
        expect(sources).toEqual([[0], [1, 2, 3]])
    })

    test("aura, reaction, one element → the reaction does nothing, the aura takes the element", () => {
        expect(new CardChain([AURA, REACTION, FIRE]).activity()).toEqual([true, false, true])
    })
})
