import { describe, expect, test } from "vitest"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { REPEAT_2 } from "@game/core-src/games/mecard/sim/card/subs/modifier/RepeatCard"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { FIRE } from "@game/core-src/games/mecard/sim/card/subs/spell/ElementCard"
import { SPELL } from "@game/core-src/games/mecard/sim/card/subs/spell/SpellCard"
import { LANCER_KIT } from "@game/core-src/games/mecard/sim/catalog/kits"
import {
    enchant,
    enchantedOrder,
    enchantments,
    ENCHANTER_HALT,
} from "@game/core-src/games/mecard/sim/halt/subs/deck/EnchanterHalt"
import { heroOf } from "@game/core-src/games/mecard/sim/run/Hero"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"
import type { Halt } from "@game/core-src/games/mecard/sim/halt/Halt"
import type { Hero } from "@game/core-src/games/mecard/sim/run/Hero"

import { ScriptedPlayer } from "../../../../../../fixtures/haltFixtures"
import { startedRun } from "../../../../../../fixtures/startedRun"

// --- Fixture builders ---

/** A hero holding exactly some cards. */
function holding(...cards: Card[]): Hero {
    const hero = heroOf(LANCER_KIT)
    hero.decks[0].splice(0, hero.decks[0].length, ...cards)
    return hero
}

// --- Tests ---

describe("enchantedOrder", () => {
    test("a modifier and an action → the modifier first; two actions → as given", () => {
        expect(enchantedOrder(REPEAT_2, THRUST)).toEqual([REPEAT_2, THRUST])
        expect(enchantedOrder(STEP, THRUST)).toEqual([STEP, THRUST])
    })

    test("an element and an action → none", () => {
        expect(enchantedOrder(FIRE, THRUST)).toBeNull()
    })
})

describe("enchantments", () => {
    test("the starting party → three, each fitting a card of a deck", () => {
        for(let seed = 1; seed < 40; seed++){
            const { heroes } = startedRun(seed)
            const offered = enchantments(new Rng(seed), heroes)
            expect(offered).toHaveLength(3)
            for(const enchantment of offered){
                const cards = heroes.flatMap(hero => hero.decks[0])
                const fits = cards.some(card => enchantedOrder(enchantment, card))
                expect(fits, enchantment.name).toBe(true)
            }
        }
    })

    test("no spell in the party → no element; a spell → elements too", () => {
        const offersFire = (hero: Hero, seeds: number): boolean => {
            for(let seed = 0; seed < seeds; seed++){
                if(enchantments(new Rng(seed), [hero]).includes(FIRE)) return true
            }
            return false
        }
        expect(offersFire(holding(THRUST), 200)).toBe(false)
        expect(offersFire(holding(THRUST, SPELL), 5000)).toBe(true)
    })

    test("the starting party → cards of every sort it can fuse, not only those taking another", () => {
        const { heroes } = startedRun(1)
        const offered = Array.from({ length: 200 }, (_, seed) => enchantments(new Rng(seed), heroes)).flat()
        expect(offered.some(card => card.input === null)).toBe(true)
        expect(offered.some(card => card.input !== null)).toBe(true)
    })

    test("nothing to enchant → none", () => {
        expect(enchantments(new Rng(1), [holding()])).toEqual([])
    })
})

describe("EnchanterHalt", () => {
    /** A visit answered up to the fusion shown, cancelling when that dialog is answered if asked to. */
    function shownFusion(cancelling: boolean): { player: ScriptedPlayer, halt: Halt, hero: Hero } {
        const run = startedRun(1)
        const [hero] = run.heroes
        run.heroes.splice(1)
        hero.decks.splice(0, hero.decks.length, [THRUST])
        const halt = ENCHANTER_HALT.create(run)
        const player = new ScriptedPlayer(run, count => cancelling && count === 4 ? 3 : 0)
        halt.start(player)
        while(!player.log.some(line => line.startsWith("confirm:"))) player.answer()
        return { player, halt, hero }
    }

    test("a card picked → the fusion shown, nothing changed yet", () => {
        const { player, halt, hero } = shownFusion(false)
        expect(player.log.at(-1)).toContain("Enchanter")
        expect(hero.decks[0]).toEqual([THRUST])
        expect(halt.hasImpact).toBe(false)
    })

    test("the fusion accepted → in the deck, an impact", () => {
        const { player, halt, hero } = shownFusion(false)
        player.answer()
        expect(hero.decks[0]).toHaveLength(1)
        expect(hero.decks[0][0].contents).toContain(THRUST)
        expect(halt.hasImpact).toBe(true)
    })

    test("the fusion cancelled → the card asked again, nothing changed", () => {
        const { player, halt, hero } = shownFusion(true)
        player.answer()
        expect(player.log.at(-1)).toMatch(/^cards:/)
        expect(hero.decks[0]).toEqual([THRUST])
        expect(halt.hasImpact).toBe(false)
    })
})

describe("enchant", () => {
    test("an element on a spell → the spell first", () => {
        const hero = holding(SPELL)
        const fusion = enchant(hero.decks[0], FIRE, SPELL)
        expect(fusion.contents).toEqual([SPELL, FIRE])
    })

    test("a modifier on an action → the modifier first", () => {
        expect(enchant(holding(THRUST).decks[0], REPEAT_2, THRUST).contents).toEqual([REPEAT_2, THRUST])
    })

    test("an element on an action → an error", () => {
        expect(() => enchant(holding(THRUST).decks[0], FIRE, THRUST)).toThrow()
    })
})
