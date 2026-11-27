import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { DamageType } from "@game/core-src/games/mecard/sim/battle/DamageType"
import * as Inflict from "@game/core-src/games/mecard/sim/battle/mecanic/inflict"
import { WALKED } from "@game/core-src/games/mecard/sim/battle/mecanic/walk/signals"
import { SLASH } from "@game/core-src/games/mecard/sim/card/subs/attack/Slash"
import { PLAYED_BY_NEAREST } from "@game/core-src/games/mecard/sim/card/subs/chess/ChessCards"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { FIRE_ELEMENT } from "@game/core-src/games/mecard/sim/element/subs/Fire"
import { Heart } from "@game/core-src/games/mecard/sim/heart/Heart"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import { SOUL_LANTERN } from "@game/core-src/games/mecard/sim/item/subs/combat/ChainItems"
import { MAD_COMPASS } from "@game/core-src/games/mecard/sim/item/subs/combat/MadCompass"
import { CHESS_PIECE } from "@game/core-src/games/mecard/sim/status/subs/ChessPieces"
import { enchantmentOf } from "@game/core-src/games/mecard/sim/status/subs/EnchantedBlade"
import { Carried } from "@game/core-src/games/mecard/sim/usable/Usable"
import { HEALING_POTION } from "@game/core-src/games/mecard/sim/usable/subs/HealingPotion"
import type { Action } from "@game/core-src/games/mecard/sim/battle/Action"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"

import { battle, chain, HEROES, MONSTERS, play, unit } from "../../../fixtures"

// --- Fixtures ---

/** An action wounding a unit once, for one heart. */
function wounding(target: Unit): Action {
    return {
        use: ({ unit: attacker }) => { target.hearts.damage(1, DamageType.PHYSICAL, attacker) },
        preview: ({ pose }) => ({ pose, indicators: [] }),
    }
}

// --- Tests ---

describe("isInflictedBy", () => {
    test("an action playing → inflicted by its unit alone, by nobody after", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        const other = unit(on, 1, 1, { team: MONSTERS })
        const seen: boolean[] = []
        Inflict.act({ battle: on, unit: hero }, () => {
            seen.push(Inflict.isInflictedBy(on, hero), Inflict.isInflictedBy(on, other))
        })
        expect(seen).toEqual([true, false])
        expect(Inflict.isInflictedBy(on, hero)).toBe(false)
    })

    test("an action failing → over all the same", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        expect(() => Inflict.act({ battle: on, unit: hero }, () => { throw new Error("failed") })).toThrow()
        expect(on.acting).toEqual([])
    })

    test("a blow and the enchanted blade reacting to it → inflicted by the attacker, the burn ticking alone", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        unit(on, 3, 3, { team: MONSTERS })
        on.startRound()
        on.applyStatus(hero, enchantmentOf(FIRE_ELEMENT), 1)
        const seen: boolean[] = []
        on.signals.damaged.add(() => seen.push(Inflict.isInflictedBy(on, hero)))
        on.signals.statusAdded.add(() => seen.push(Inflict.isInflictedBy(on, hero)))
        play(on, [[hero, chain(SLASH)]])
        expect(seen).toEqual([true, true, false])
    })

    test("a move → told while its action still plays", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 0, 0, { team: MONSTERS })
        const seen: boolean[] = []
        on.observers.of(WALKED).add(() => seen.push(Inflict.isInflictedBy(on, hero)))
        play(on, [[hero, chain(STEP)]])
        expect(seen).toEqual([true])
    })

    test("the end of a round → inflicted by nobody", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        unit(on, 0, 0, { team: MONSTERS })
        const seen: boolean[] = []
        on.roundEnded.add(() => seen.push(Inflict.isInflictedBy(on, hero)))
        play(on, [[hero, chain(STEP)]])
        expect(seen).toEqual([false])
    })

    test("a usable used → inflicted by its unit", () => {
        const on = battle()
        const drinker = unit(on, 3, 3)
        unit(on, 0, 0, { team: MONSTERS })
        const potion = new Carried(HEALING_POTION)
        drinker.usables.push(potion)
        on.startRound()
        drinker.hearts.damage(2, DamageType.PHYSICAL, null)
        const seen: boolean[] = []
        on.signals.healed.add(() => seen.push(Inflict.isInflictedBy(on, drinker)))
        on.activate(drinker, [potion])
        on.endPreparation()
        expect(seen).toEqual([true])
    })

    test("an action played by a piece → inflicted by the piece and by who has it play", () => {
        const on = battle()
        const owner = unit(on, 1, 5)
        const piece = unit(on, 3, 4)
        unit(on, 3, 3, { team: MONSTERS })
        on.startRound()
        on.applyStatus(piece, CHESS_PIECE, 2)
        const seen: boolean[][] = []
        on.signals.damaged.add(() => seen.push([Inflict.isInflictedBy(on, owner), Inflict.isInflictedBy(on, piece)]))
        play(on, [[owner, chain(PLAYED_BY_NEAREST, SLASH)]])
        expect(seen).toEqual([[true, true]])
    })
})

describe("collect", () => {
    test("what is resolved while the action plays → given back, nothing after", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        const foe = unit(on, 3, 3, { team: MONSTERS })
        const heard = Inflict.collect<number>({ battle: on, unit: hero }, wounding(foe), resolve => {
            return on.signals.damaged.add(({ amount }) => resolve(amount * 10))
        })
        foe.hearts.damage(1, DamageType.PHYSICAL, hero)
        expect(heard).toEqual([10])
    })

    test("a filter on an observable → the messages it keeps alone", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        const foe = unit(on, 3, 3, { team: MONSTERS })
        const ctx = { battle: on, unit: hero }
        const kept = Inflict.collectFrom(ctx, wounding(foe), on.signals.damaged, ({ unit: hurt }) => hurt === foe)
        const left = Inflict.collectFrom(ctx, wounding(foe), on.signals.damaged, ({ unit: hurt }) => hurt === hero)
        expect(kept.map(each => each.unit)).toEqual([foe])
        expect(left).toEqual([])
    })
})

describe("the items of what a unit inflicts", () => {
    test("a mad compass → a point for a wound of its unit, none for a wound out of its actions", () => {
        const on = battle()
        const hero = on.add({
            name: "hero", team: HEROES, controller: "player", position: new Vector2(3, 4), direction: Vector2.UP,
            hearts: Heart.many(RED_HEART, 4), decks: [[]], items: [MAD_COMPASS],
        })
        const foe = unit(on, 3, 3, { team: MONSTERS })
        on.startRound()
        foe.hearts.damage(1, DamageType.PHYSICAL, hero)
        expect(hero.stats.strength.value).toBe(0)
        Inflict.act({ battle: on, unit: hero }, () => { foe.hearts.damage(1, DamageType.PHYSICAL, hero) })
        expect(hero.stats.strength.value).toBe(1)
    })

    test("a soul lantern → nothing for an enemy dying out of the actions of its unit", () => {
        const on = battle()
        const hero = on.add({
            name: "hero", team: HEROES, controller: "player", position: new Vector2(3, 4), direction: Vector2.UP,
            hearts: Heart.many(RED_HEART, 4), decks: [[]], items: [SOUL_LANTERN],
        })
        const foe = unit(on, 3, 3, { team: MONSTERS, hearts: Heart.many(RED_HEART, 1) })
        unit(on, 0, 0, { team: MONSTERS })
        on.startRound()
        foe.takeChain(chain(SLASH))
        foe.hearts.damage(1, DamageType.PHYSICAL, hero)
        expect(hero.hand).toEqual([])
    })

    test("a soul lantern → the cards of an enemy dying of what its unit inflicts", () => {
        const on = battle()
        const hero = on.add({
            name: "hero", team: HEROES, controller: "player", position: new Vector2(3, 4), direction: Vector2.UP,
            hearts: Heart.many(RED_HEART, 4), decks: [[]], items: [SOUL_LANTERN],
        })
        const foe = unit(on, 3, 3, { team: MONSTERS, hearts: Heart.many(RED_HEART, 1) })
        unit(on, 0, 0, { team: MONSTERS })
        on.startRound()
        foe.takeChain(chain(SLASH))
        Inflict.act({ battle: on, unit: hero }, () => { foe.hearts.damage(1, DamageType.PHYSICAL, hero) })
        expect(hero.hand).toHaveLength(1)
    })
})
