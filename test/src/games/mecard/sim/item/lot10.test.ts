import { describe, expect, test } from "vitest"
import {
    Carried, DAGGER, DEBT, EPIDEMIC, Heart, HEALING_POTION, LOADED_DIE, LUCIDITY, MergedCard, POISONED, RED_HEART,
    SCAVENGER_NOSE, SLASH, SLOWED, SNAIL_SHELL, TAMING_MARK, TESTAMENT, TRANSFUSION, UNSURE_BLOW, Vector2, WAIT, CLOVER,
    COOLER, PEDOMETER, BLEEDING, SCARIFICATION, PLAGUE_MASK, PURGE, AGGRAVATION, AUTOPSY, NATURALIZATION, isStuffed,
    MUZZLE, ROOTED, TREAT, DODGE, WHIP,
} from "@game/core/mecard"
import type { Battle, Item, Unit } from "@game/core/mecard"

import { battle, chain, HEROES, MONSTERS, play, unit } from "../fixtures"

// --- Fixtures ---

/** A hero of the heroes at a cell, facing up, carrying some items and usables. */
function carrier(on: Battle, x: number, y: number, items: readonly Item[], usables: readonly Carried[] = []): Unit {
    return on.add({
        name: `c${on.units.length}`, team: HEROES, controller: "player", position: new Vector2(x, y), direction: Vector2.UP,
        hearts: Heart.many(RED_HEART, 4), decks: [[]], items, usables,
    })
}

/** A far monster that keeps the battle from ending. */
function bystander(on: Battle): Unit {
    return unit(on, 0.5, 0.5, { team: MONSTERS })
}

// --- Tests ---

describe("a unit with no sprite", () => {
    test("added with none → it still has one, named and colored from its name", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5.5)
        expect(hero.sprite).toBeDefined()
        expect(hero.sprite.description).toBe(hero.name)
    })
})

describe("the clover and the cooler", () => {
    test("the clover → two fleeting cards of chaos in the hand at the first round, each its own", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [CLOVER])
        bystander(on)
        on.startRound()
        const chaos = hero.hand.filter(card => card.name === "Chaos")
        expect(chaos).toHaveLength(2)
        expect(chaos[0]).not.toBe(chaos[1])
        expect(chaos.every(card => on.isFleeting(card))).toBe(true)
    })

    test("the cooler → one more charge for each usable at the first round", () => {
        const on = battle()
        const potion = new Carried(HEALING_POTION)
        carrier(on, 3.5, 5.5, [COOLER], [potion])
        bystander(on)
        on.startRound()
        expect(potion.charges).toBe(2)
    })
})

describe("the debt", () => {
    test("owed three at the start, one less each round, and never past the floors", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [DEBT])
        bystander(on)
        on.startRound()
        expect(hero.stats.chainSize.value).toBe(4 + 3)
        expect(hero.stats.handSize.value).toBe(8 + 3)
        play(on, [[hero, chain(WAIT)]])
        expect(hero.stats.chainSize.value).toBe(4 + 2)
        for(let round = 0; round < 12; round++) play(on, [[hero, chain(WAIT)]])
        expect(hero.stats.chainSize.value).toBe(1)
        expect(hero.stats.handSize.value).toBe(2)
        expect(hero.stats.draw.value).toBe(0)
    })
})

describe("the pedometer", () => {
    test("ten meters walked → one strength more; twenty → one precision more", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 3.5, [PEDOMETER])
        bystander(on)
        on.startRound()
        for(let leg = 0; leg < 2; leg++){
            on.move(hero, Vector2.UP, 3)
            on.move(hero, Vector2.DOWN, 3)
        }
        expect(hero.stats.strength.value).toBe(1)
        expect(hero.stats.precision.value).toBe(0)
        for(let leg = 0; leg < 4; leg++){
            on.move(hero, Vector2.UP, 3)
            on.move(hero, Vector2.DOWN, 3)
        }
        expect(hero.stats.strength.value).toBeGreaterThanOrEqual(3)
        expect(hero.stats.precision.value).toBe(1)
    })
})

describe("the snail shell", () => {
    test("a round without a move → a shield heart, then a move drops it", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [SNAIL_SHELL])
        bystander(on)
        const shields = (): number => hero.hearts.all.filter(heart => heart.kind.name === "bouclier").length
        play(on, [[hero, chain(WAIT)]])
        expect(shields()).toBe(1)
        play(on, [[hero, chain(WAIT)]])
        expect(shields()).toBe(2)
        on.move(hero, Vector2.UP, 1)
        expect(shields()).toBe(0)
    })
})

describe("the scavenger nose", () => {
    test("a feverish enemy within three meters at the end of the round → a level of lucidity", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [SCAVENGER_NOSE])
        const hearts = [new Heart(RED_HEART), new Heart(RED_HEART, true), new Heart(RED_HEART, true), new Heart(RED_HEART, true)]
        unit(on, 3.5, 3.5, { team: MONSTERS, hearts })
        play(on, [[hero, chain(WAIT)]])
        expect(hero.statuses.has(LUCIDITY)).toBe(true)
    })
})

describe("the testament", () => {
    test("its unit dies → its chain is added at the end of the chain of the nearest ally", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [TESTAMENT])
        const ally = unit(on, 4.5, 5.5)
        bystander(on)
        on.startRound()
        hero.hand.push(SLASH)
        ally.hand.push(WAIT)
        on.commit(hero, chain(SLASH))
        on.commit(ally, chain(WAIT))
        on.endPreparation()
        hero.hearts.slay(null)
        expect(ally.chain.cards).toContain(SLASH)
    })
})

describe("the loaded die", () => {
    test("a card of chance in the chain → both of its cards merged", () => {
        const on = battle()
        const hero = carrier(on, 3.5, 5.5, [LOADED_DIE])
        bystander(on)
        on.startRound()
        hero.hand.push(UNSURE_BLOW)
        on.commit(hero, chain(UNSURE_BLOW))
        on.endPreparation()
        expect(hero.chain.cards.some(card => card instanceof MergedCard)).toBe(true)
    })
})

describe("the contagion cards", () => {
    test("the epidemic → every status of the victim, a level weaker, on the units around it", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5.5)
        const victim = unit(on, 3.5, 4.6, { team: MONSTERS })
        const neighbor = unit(on, 3.5, 3.8, { team: MONSTERS })
        on.startRound()
        on.applyStatus(victim, POISONED, 3)
        on.applyStatus(victim, BLEEDING, 4)
        play(on, [[hero, chain(EPIDEMIC)]])
        expect(neighbor.statuses.get(POISONED)?.level).toBeGreaterThanOrEqual(1)
        expect(neighbor.statuses.has(BLEEDING)).toBe(true)
    })

    test("the transfusion → the bad statuses of the caster pass to the first unit ahead", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5.5)
        const target = unit(on, 3.5, 4.0, { team: MONSTERS })
        on.startRound()
        on.applyStatus(hero, SLOWED, 2)
        play(on, [[hero, chain(TRANSFUSION)]])
        expect(hero.statuses.has(SLOWED)).toBe(false)
        expect(target.statuses.has(SLOWED)).toBe(true)
    })
})

describe("the cards of the kits", () => {
    test("the scarification → bleeding and blue hearts; the mask → a shield for each bad status", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5.5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(SCARIFICATION)]])
        expect(hero.statuses.has(BLEEDING)).toBe(true)
        expect(hero.hearts.all.filter(heart => heart.kind.name === "bleu").length).toBeGreaterThanOrEqual(1)
        on.applyStatus(hero, SLOWED, 2)
        play(on, [[hero, chain(PLAGUE_MASK)]])
        expect(hero.hearts.all.filter(heart => heart.kind.name === "bouclier").length).toBeGreaterThanOrEqual(2)
    })

    test("the purge → the bad statuses gone", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5.5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.startRound()
        on.applyStatus(hero, SLOWED, 2)
        play(on, [[hero, chain(PURGE)]])
        expect(hero.statuses.has(SLOWED)).toBe(false)
    })

    test("the aggravation → the levels of the bad statuses of the target doubled", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5.5)
        const target = unit(on, 3.5, 4.8, { team: MONSTERS })
        on.startRound()
        on.applyStatus(target, SLOWED, 2)
        play(on, [[hero, chain(AGGRAVATION)]])
        expect(target.statuses.get(SLOWED)?.level).toBeGreaterThanOrEqual(3)
    })

    test("the autopsy → a killed target is stuffed, and the naturalization and the trophy see it", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5.5)
        const prey = unit(on, 3.5, 4.6, { team: MONSTERS, hearts: Heart.many(RED_HEART, 1) })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(AUTOPSY)]])
        expect(prey.alive).toBe(false)
        const bodies = on.summonsOf(hero).filter(isStuffed)
        expect(bodies).toHaveLength(1)
        play(on, [[hero, chain(NATURALIZATION)]])
        expect(bodies[0].hearts.all.some(heart => heart.kind.name === "bouclier")).toBe(true)
    })

    test("the whip → a feverish target is stunned; the muzzle → rooted; the treat → a dodge for the ally", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5.5)
        const ally = unit(on, 4.5, 5.5)
        const hearts = [
            ...Heart.many(RED_HEART, 4), ...Array.from({ length: 6 }, () => new Heart(RED_HEART, true)),
        ]
        const target = unit(on, 3.5, 4.5, { team: MONSTERS, hearts })
        expect(target.feverish).toBe(true)
        play(on, [[hero, chain(MUZZLE)]])
        expect(target.statuses.has(ROOTED)).toBe(true)
        play(on, [[hero, chain(TREAT)]])
        expect(ally.statuses.has(DODGE)).toBe(true)
        play(on, [[hero, chain(WHIP)]])
        expect(target.alive).toBe(true)
    })
})

describe("the taming mark", () => {
    test("the next enemy killed in the round → kept as captured for the end of the battle", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5.5)
        const prey = unit(on, 3.5, 4.7, { team: MONSTERS, hearts: Heart.many(RED_HEART, 1) })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(TAMING_MARK, DAGGER)]])
        expect(prey.alive).toBe(false)
        expect(on.captured).toContain(prey)
    })
})
