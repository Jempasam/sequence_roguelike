import { describe, expect, test, vi } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { resolve } from "@game/core-src/games/mecard/sim/card/CardChain"
import { ELEMENT } from "@game/core-src/games/mecard/sim/card/CardType"
import { POSSESSION } from "@game/core-src/games/mecard/sim/card/subs/attack/Possession"
import { SLASH } from "@game/core-src/games/mecard/sim/card/subs/attack/Slash"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { RELOCATED } from "@game/core-src/games/mecard/sim/battle/mecanic/relocation"
import { summonCardOf } from "@game/core-src/games/mecard/sim/card/subs/beast/BeastRewrites"
import { WOLF_CARD } from "@game/core-src/games/mecard/sim/card/subs/beast/beasts"
import {
    PREPARATION_CARD,
    TIME_MANIPULATION,
} from "@game/core-src/games/mecard/sim/card/subs/composite/ChainRewrites"
import { FusionCard } from "@game/core-src/games/mecard/sim/card/subs/composite/FusionCard"
import { CHARGE, MergedCard } from "@game/core-src/games/mecard/sim/card/subs/composite/MergedCard"
import { REPETITION } from "@game/core-src/games/mecard/sim/card/subs/composite/RewriteCards"
import { COMBO } from "@game/core-src/games/mecard/sim/card/subs/modifier/Combo"
import { REPEAT_2 } from "@game/core-src/games/mecard/sim/card/subs/modifier/RepeatCard"
import { ELEPHANT_CARD } from "@game/core-src/games/mecard/sim/card/subs/modifier/Wrappers"
import { AIM, AimCard } from "@game/core-src/games/mecard/sim/card/subs/movement/Aim"
import { ARC_DISTANCE, ARC_STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/ArcStep"
import { BLINK } from "@game/core-src/games/mecard/sim/card/subs/movement/Blink"
import { BOUNCE_DASH } from "@game/core-src/games/mecard/sim/card/subs/movement/BounceDash"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { nearestTurn, TURN_STEPS, TURNS } from "@game/core-src/games/mecard/sim/card/subs/movement/TurnCard"
import { WAIT } from "@game/core-src/games/mecard/sim/card/subs/movement/Wait"
import { ELEMENT_ON_BLADE } from "@game/core-src/games/mecard/sim/card/subs/spell/ElementActions"
import { FIRE, LIGHTNING } from "@game/core-src/games/mecard/sim/card/subs/spell/ElementCard"
import { SPELL } from "@game/core-src/games/mecard/sim/card/subs/spell/SpellCard"
import { BLEED } from "@game/core-src/games/mecard/sim/card/subs/status/StatusCards"
import { ChainSummonCard } from "@game/core-src/games/mecard/sim/card/subs/summon/ChainSummons"
import { ENCHANTED_BLADE } from "@game/core-src/games/mecard/sim/catalog/cards"
import { LOOT_MONSTERS } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { LIGHTNING_ELEMENT } from "@game/core-src/games/mecard/sim/element/subs/Lightning"
import { fusionOfMonster } from "@game/core-src/games/mecard/sim/halt/subs/monster/monsterCards"
import { Heart } from "@game/core-src/games/mecard/sim/heart/Heart"
import { BLUE_HEART } from "@game/core-src/games/mecard/sim/heart/subs/BlueHeartKind"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import { WINGS } from "@game/core-src/games/mecard/sim/item/subs/combat/ChainItems"
import type { Action } from "@game/core-src/games/mecard/sim/battle/Action"
import type { Card, RewriteSpot } from "@game/core-src/games/mecard/sim/card/Card"

import { battle, chain, HEROES, MONSTERS, play, unit } from "../fixtures"

// --- Fixtures ---

/** Where a preparation stands: the cards on its right, nothing else in sight. */
function spotOf(...rest: Card[]): RewriteSpot {
    return { previous: null, next: rest[0] ?? null, rest, deck: [], trial: false, fits: () => true }
}

/** The first option of a draw, as a preview takes it. */
const FIRST = { pick: <T>(options: readonly T[]): T => options[0] }

/** Play an action of a unit, outside of any round. */
function playOut(action: Action, ctx: Parameters<Action["use"]>[0]): void {
    action.use(ctx)
}

// --- Tests ---

describe("the turn, more precise", () => {
    test("each of its directions → a unit vector, the nearest turn to it being itself", () => {
        expect(TURNS).toHaveLength(TURN_STEPS)
        expect(TURN_STEPS).toBe(32)
        for(const [step, turn] of TURNS.entries()){
            expect(turn.direction.length).toBeCloseTo(1, 5)
            expect(nearestTurn(turn.direction)).toBe(step)
        }
    })
})

describe("the arc", () => {
    test("walked on an empty arena → it ends straight ahead of where it started", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5.5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(ARC_STEP)]])
        expect(hero.position.x).toBeCloseTo(3.5, 1)
        expect(5.5 - hero.position.y).toBeCloseTo(1.93, 1)
    })

    test("walked → it ends exactly ahead by its distance, half the way out to the side, still facing as before", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5.5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        let widest = 0
        hero.observers.of(RELOCATED).add(() => { widest = Math.max(widest, Math.abs(hero.position.x - 3.5)) })
        play(on, [[hero, chain(ARC_STEP)]])
        expect(hero.position.x).toBeCloseTo(3.5, 5)
        expect(5.5 - hero.position.y).toBeCloseTo(ARC_DISTANCE * hero.stats.move.value, 5)
        expect(widest).toBeCloseTo(ARC_DISTANCE * hero.stats.move.value / 2, 1)
        expect(hero.direction).toEqual(Vector2.UP)
    })

    test("walked blocked by a wall → it stops short, never past it", () => {
        const on = battle()
        const hero = unit(on, 3.5, 1)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(ARC_STEP)]])
        expect(hero.position.y).toBeGreaterThanOrEqual(0)
        expect(1 - hero.position.y).toBeLessThan(ARC_DISTANCE * hero.stats.move.value)
    })
})

describe("the preparations on the chain", () => {
    test("a temporal manipulation → the actions after it that may be merged, merged, the rest left", () => {
        const rewrite = TIME_MANIPULATION.get().rewrite(FIRST, spotOf(STEP, THRUST, REPEAT_2, SLASH))
        // The repeat takes an action: the slash stays out of the merge, for it to take.
        expect(rewrite.consumed).toBe(3)
        expect(rewrite.cards[0]).toBeInstanceOf(MergedCard)
        expect(rewrite.cards[0].contents).toEqual([STEP, THRUST, REPEAT_2])
    })

    test("a temporal manipulation, actions taking an action with none after → nothing merged", () => {
        const rewrite = TIME_MANIPULATION.get().rewrite(FIRST, spotOf(REPEAT_2, STEP))
        expect(rewrite.cards).toHaveLength(0)
    })

    test("a temporal manipulation → a turn, which has variants, merged all the same", () => {
        const rewrite = TIME_MANIPULATION.get().rewrite(FIRST, spotOf(TURNS[8], STEP))
        expect(rewrite.consumed).toBe(2)
        expect(rewrite.cards[0].contents).toEqual([TURNS[8], STEP])
    })

    test("a temporal manipulation, read as a chain → one merge, nothing greyed out", () => {
        const resolution = resolve([TIME_MANIPULATION, TURNS[8], STEP, THRUST], FIRST)
        expect(resolution.cards).toHaveLength(1)
        expect(resolution.cards[0]).toBeInstanceOf(MergedCard)
        expect(resolution.chain.actionsLeft()).toHaveLength(1)
    })

    test("a temporal manipulation, a repetition after it → what it became is merged", () => {
        const resolution = resolve([TIME_MANIPULATION, REPETITION, STEP, THRUST], FIRST)
        expect(resolution.cards).toHaveLength(1)
        expect(resolution.cards[0].contents).toEqual([STEP, STEP, THRUST])
    })

    test("a temporal manipulation, a repeat then its action → the repeat takes the action left out", () => {
        const resolution = resolve([TIME_MANIPULATION, STEP, REPEAT_2, SLASH], FIRST)
        expect(resolution.cards).toHaveLength(2)
        expect(resolution.cards[0].contents).toEqual([STEP, REPEAT_2])
        expect(resolution.chain.actionsLeft()).toHaveLength(1)
        expect(resolution.reading.greyed).toHaveLength(0)
    })

    test("a temporal manipulation, played → both actions in one turn", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 1, 1, { team: MONSTERS })
        const start = hero.position.y
        play(on, [[hero, chain(TIME_MANIPULATION, TURNS[8], STEP)]])
        expect(hero.direction).toEqual(TURNS[8].direction)
        expect(hero.position.y).toBeCloseTo(start, 1)
        expect(hero.position.x).toBeGreaterThan(3)
    })

    test("a temporal manipulation → the row stops before the first card taking another kind of thing", () => {
        const rewrite = TIME_MANIPULATION.get().rewrite(FIRST, spotOf(STEP, ELEMENT_ON_BLADE, FIRE, SLASH))
        expect(rewrite.consumed).toBe(2)
        expect(rewrite.cards).toHaveLength(1)
        expect(rewrite.cards[0]).toBeInstanceOf(MergedCard)
        expect(rewrite.cards[0].contents).toEqual([STEP, ELEMENT_ON_BLADE])
    })

    test("a preparation → the chain after it played later, as a fleeting collage that goes to no discard", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(PREPARATION_CARD, WAIT, WAIT)]])
        const given = hero.hand.find(card => card instanceof FusionCard)
        expect(given?.contents).toEqual([WAIT, WAIT])
        expect(given && on.isFleeting(given)).toBe(true)
        // The next draw may have put the discard back under the pile: what went there is in one of them.
        const kept = (): Card[] => [...hero.decks.piles, ...hero.decks.discards, ...hero.hand]
        expect(kept()).toEqual(expect.arrayContaining([PREPARATION_CARD, WAIT, WAIT]))
        if(!given) return
        hero.hand.splice(hero.hand.indexOf(given), 1)
        play(on, [[hero, chain(given)]])
        expect(kept()).not.toContain(given)
    })
})

describe("the modifiers", () => {
    test("a combo of slashes on a sturdy enemy → four slashes, no more", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        unit(on, 3, 3, { team: MONSTERS, hearts: Heart.many(RED_HEART, 30) })
        let hits = 0
        hero.hitting.add(() => hits++)
        play(on, [[hero, chain(COMBO, SLASH)]])
        expect(hits).toBe(4)
    })

    test("a combo of slashes in the void → one slash", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 1, 1, { team: MONSTERS })
        let blows = 0
        hero.attacking.add(() => blows++)
        play(on, [[hero, chain(COMBO, SLASH)]])
        expect(blows).toBe(1)
    })

    test("the elephant → the melee reach (1 + 1) × 2, the throw range left while the action plays, back after", () => {
        const on = battle()
        const hero = unit(on, 3, 3)
        const seen: number[] = []
        const probe: Action = {
            use: ({ unit: playing }) => {
                seen.push(playing.stats.throwRange.value, playing.stats.meleeRange.value)
            },
            preview: ({ pose }) => ({ indicators: [], pose }),
        }
        playOut(ELEPHANT_CARD.get(probe), { battle: on, unit: hero })
        expect(seen).toEqual([1, 4])
        expect(hero.stats.throwRange.value).toBe(1)
        expect(hero.stats.meleeRange.value).toBe(1)
    })
})

describe("the possession", () => {
    test("a weak enemy killed → the unit takes its place, facing as it did, and its chain grows", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        const prey = unit(on, 3, 2, { team: MONSTERS, hearts: Heart.many(RED_HEART, 3) })
        let longest = 0
        hero.onChainChange.add(({ cards }) => { longest = Math.max(longest, cards.length) })
        play(on, [[hero, chain(POSSESSION)], [prey, chain(WAIT, WAIT)]])
        expect(prey.alive).toBe(false)
        expect(hero.position.distance(new Vector2(3, 2))).toBeLessThan(0.05)
        expect(hero.direction).toEqual(Vector2.UP)
        expect(longest).toBeGreaterThan(1)
    })
})

describe("the spirits of nature", () => {
    test("the summoning of a wolf → a body of four blue hearts, aiming, running, then biting twice", () => {
        const { beast } = WOLF_CARD
        const summoned = summonCardOf(beast, beast, beast)
        expect(summoned).toBeInstanceOf(ChainSummonCard)
        if(!(summoned instanceof ChainSummonCard)) return
        expect(summoned.summon.cards).toEqual([AIM, BOUNCE_DASH, BLEED, SLASH, BLEED, SLASH])
        const owner = unit(battle(), 3, 3)
        expect(summoned.summon.hearts(owner).map(heart => heart.kind)).toEqual(new Array(4).fill(BLUE_HEART))
    })
})

describe("the enchanted blades", () => {
    test("a merge holding a card taking an element → it takes an element; two such cards → fine, a card taking another kind → refused", () => {
        expect(ENCHANTED_BLADE.input).toBe(ELEMENT)
        expect(CHARGE.input).toBeNull()
        expect(new MergedCard([ELEMENT_ON_BLADE, SPELL]).input).toBe(ELEMENT)
        expect(() => new MergedCard([ELEMENT_ON_BLADE, REPEAT_2])).toThrow(/one kind of thing/)
    })

    test("an enchanted blade of lightning → the enemy slashed gets the negative of lightning, one away does not", () => {
        const on = battle()
        const hero = unit(on, 3, 4)
        const slashed = unit(on, 3, 3, { team: MONSTERS, hearts: Heart.many(RED_HEART, 10) })
        const away = unit(on, 1, 6, { team: MONSTERS, hearts: Heart.many(RED_HEART, 10) })
        const negative = vi.spyOn(LIGHTNING_ELEMENT, "applyNegative")
        try {
            play(on, [[hero, chain(ENCHANTED_BLADE, LIGHTNING)]])
            const targets = negative.mock.calls.map(([, target]) => target)
            expect(targets).toContain(slashed)
            expect(targets).not.toContain(away)
        } finally {
            negative.mockRestore()
        }
    })
})

describe("the wings", () => {
    test("worn → every step of the chain, in a merge too, a blink once rewritten", () => {
        const on = battle()
        const hero = on.add({
            name: "hero", team: HEROES, controller: "player", position: new Vector2(3, 5), direction: Vector2.UP,
            hearts: Heart.many(RED_HEART, 4), decks: [[]], items: [WINGS],
        })
        unit(on, 1, 1, { team: MONSTERS })
        on.startRound()
        hero.hand.push(STEP, CHARGE)
        on.commit(hero, chain(STEP, CHARGE))
        on.endPreparation()
        expect(hero.chain.cards[0]).toBe(BLINK)
        expect(hero.chain.cards[1].contents).toEqual([BLINK, THRUST])
    })
})

describe("the fusions of monsters", () => {
    test("for every monster of the loot → the chain that stands for it, named after it, never only steps and aims", () => {
        for(const monster of LOOT_MONSTERS){
            const fusion = fusionOfMonster(monster)
            expect(fusion.name.endsWith(` de ${monster.name}`)).toBe(true)
            expect(fusion.contents?.some(card => card !== STEP && !(card instanceof AimCard))).toBe(true)
        }
    })
})
