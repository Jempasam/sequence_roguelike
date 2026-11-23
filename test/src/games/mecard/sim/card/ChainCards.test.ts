import { describe, expect, test } from "vitest"
import {
    CARRION_BREATH, ETHEREAL_FORM, EXO_NERF, HAUNT, PIERCING_SPEAR, PLAGIARISM, keywordsOf, LOOT_CARDS, MEMORY_GAP, STINKING, PARROT, PAS_DE_DEUX, SHOT, SLASH, STEP, STUTTER, SYNCHRONISATION,
    Vector2, WAIT,
} from "@game/core/mecard"
import type { Card } from "@game/core/mecard"

import { battle, chain, expectAt, MONSTERS, play, unit } from "../fixtures"

describe("Synchronisation", () => {
    test("the closest ally plays the action too, as the caster does", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        const ally = unit(on, 1, 5)
        // A monster far off, so the battle does not end for want of an enemy.
        unit(on, 6, 0, { team: MONSTERS })
        play(on, [[caster, chain(SYNCHRONISATION, STEP)], [ally, chain(WAIT)]])
        expect(caster.position.y).toBeLessThan(5)
        expect(ally.position.y).toBeLessThan(5)
    })

    test("an enemy in reach is not synchronised", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        const foe = unit(on, 3, 3, { team: MONSTERS })
        play(on, [[caster, chain(SYNCHRONISATION, STEP)], [foe, chain(WAIT)]])
        expectAt(foe, 3, 3)
    })

    test("no ally in reach → the caster plays the action alone", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const far = unit(on, 0, 0)
        unit(on, 6, 0, { team: MONSTERS })
        play(on, [[caster, chain(SYNCHRONISATION, STEP)], [far, chain(WAIT)]])
        expect(caster.position.y).toBeLessThan(6)
        expectAt(far, 0, 0)
        expect(on.events.some(event => event.type === "skipped" && event.reason === "personne à synchroniser")).toBe(true)
    })
})

describe("Stutter", () => {
    test("the target plays again the last cards it played", () => {
        const alone = battle()
        const single = unit(alone, 3, 1, { team: MONSTERS, direction: Vector2.LEFT })
        unit(alone, 6, 6)
        play(alone, [[single, chain(STEP)]])

        const on = battle()
        const target = unit(on, 3, 1, { team: MONSTERS, direction: Vector2.LEFT })
        const caster = unit(on, 3, 6)
        play(on, [[target, chain(STEP)], [caster, chain(WAIT, STUTTER)]])
        expect(target.position.x).toBeLessThan(single.position.x)
    })

    test("a target with nothing played → nothing to repeat", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const target = unit(on, 3, 1, { team: MONSTERS, direction: Vector2.LEFT })
        play(on, [[caster, chain(STUTTER)], [target, chain(WAIT)]])
        expect(on.events.some(event => event.type === "skipped" && event.reason === "rien à répéter")).toBe(true)
        expectAt(target, 3, 1)
    })

    test("a unit out of the narrow cone is left alone", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const side = unit(on, 0, 6, { team: MONSTERS })
        play(on, [[side, chain(STEP)], [caster, chain(WAIT, STUTTER)]])
        expect(on.events.some(event => event.type === "skipped" && event.reason === "personne à faire bégayer")).toBe(true)
    })
})

describe("Pas de deux", () => {
    test("the caster and the unit in the cone trade places and facings", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        const target = unit(on, 3, 2, { team: MONSTERS, direction: Vector2.LEFT })
        play(on, [[caster, chain(PAS_DE_DEUX)]])
        expectAt(caster, 3, 2)
        expectAt(target, 3, 5)
        expect(caster.direction).toEqual(Vector2.LEFT)
        expect(target.direction).toEqual(Vector2.UP)
    })

    test("an ally is taken as well", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        const ally = unit(on, 3, 3)
        unit(on, 0, 0, { team: MONSTERS })
        play(on, [[caster, chain(PAS_DE_DEUX)]])
        expectAt(caster, 3, 3)
        expectAt(ally, 3, 5)
    })

    test("nobody in the cone → nobody moves", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        const side = unit(on, 0, 5, { team: MONSTERS })
        play(on, [[caster, chain(PAS_DE_DEUX)]])
        expectAt(caster, 3, 5)
        expectAt(side, 0, 5)
    })
})

describe("Memory gap", () => {
    test("the unit ahead loses its next turn, unplayed", () => {
        const free = battle()
        const walker = unit(free, 3, 4, { team: MONSTERS })
        unit(free, 6, 6)
        play(free, [[walker, chain(STEP, STEP)]])

        const on = battle()
        const caster = unit(on, 3, 6)
        const target = unit(on, 3, 4, { team: MONSTERS })
        play(on, [[caster, chain(MEMORY_GAP)], [target, chain(STEP, STEP)]])
        // Two steps took the walker up to the wall: one step only takes the target half way.
        expect(target.position.y).toBeGreaterThan(walker.position.y + 1)
        expect(target.position.y).toBeLessThan(4)
    })

    test("nobody ahead → nothing is lost", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        unit(on, 0, 0, { team: MONSTERS })
        play(on, [[caster, chain(MEMORY_GAP)]])
        expect(on.events.some(event => event.type === "skipped" && event.reason === "personne en face")).toBe(true)
    })
})

describe("Parrot", () => {
    test("the next action of the unit ahead is played by the caster too", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const target = unit(on, 3, 3, { team: MONSTERS, direction: Vector2.LEFT })
        play(on, [[caster, chain(PARROT, WAIT)], [target, chain(STEP)]])
        // The step of the target went left; the caster, facing up, played it facing up.
        expect(target.position.x).toBeLessThan(3)
        expect(caster.position.y).toBeLessThan(6)
        expectAt(caster, 3, caster.position.y)
    })

    test("nobody ahead → no echo", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        unit(on, 0, 0, { team: MONSTERS })
        play(on, [[caster, chain(PARROT, WAIT)]])
        expectAt(caster, 3, 6)
    })
})

describe("Piercing spear", () => {
    test("it wounds the first unit it meets", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const target = unit(on, 3, 3, { team: MONSTERS })
        const before = target.life
        play(on, [[caster, chain(PIERCING_SPEAR)], [target, chain(WAIT)]])
        expect(target.life).toBeLessThan(before)
    })

    test("its thrower follows the unit it pierced when that unit moves", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const target = unit(on, 3, 3, { team: MONSTERS, direction: Vector2.LEFT })
        play(on, [[caster, chain(PIERCING_SPEAR, WAIT)], [target, chain(WAIT, STEP)]])
        expect(target.position.x).toBeLessThan(3)
        expect(caster.position.x).toBeLessThan(3)
    })

    test("a move of its own pulls the spear out: the thrower no longer follows", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const target = unit(on, 3, 3, { team: MONSTERS, direction: Vector2.LEFT })
        play(on, [[caster, chain(PIERCING_SPEAR, STEP)], [target, chain(WAIT, STEP)]])
        expect(target.position.x).toBeLessThan(3)
        expectAt(caster, 3, caster.position.y)
    })

    test("a push pulls it out as well", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const target = unit(on, 3, 3, { team: MONSTERS, direction: Vector2.LEFT })
        play(on, [[caster, chain(PIERCING_SPEAR, WAIT)], [target, chain(WAIT, STEP)]])
        const x = caster.position.x
        // Pushed after the round, by something else: nothing follows any more.
        on.push(caster, Vector2.RIGHT, 1, target)
        expect(caster.position.x).toBeGreaterThanOrEqual(x)
    })

    test("nobody ahead → nothing is thrown at anybody", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const far = unit(on, 0, 0, { team: MONSTERS })
        play(on, [[caster, chain(PIERCING_SPEAR, WAIT)], [far, chain(WAIT, STEP)]])
        expectAt(caster, 3, 6)
    })
})

describe("Ethereal form", () => {
    test("the caster goes through the units in its way", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        // A wall of enemies the caster could not cross otherwise.
        unit(on, 3, 4, { team: MONSTERS })
        play(on, [[caster, chain(ETHEREAL_FORM, STEP, STEP)]])
        expect(caster.position.y).toBeLessThan(4)
    })

    test("nobody can aim at it or touch it, and it takes its body back at the end of the round", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        unit(on, 0, 0, { team: MONSTERS })
        const states: boolean[][] = []
        on.signals.stepStarted.add(event => { states.push([event.unit.tangible, event.unit.targetable, event.unit.touchable]) })
        play(on, [[caster, chain(ETHEREAL_FORM, WAIT)]])
        expect(states).toContainEqual([false, false, false])
        expect([caster.tangible, caster.targetable, caster.touchable]).toEqual([true, true, true])
    })

    test("it takes its body back as soon as it wounds someone", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const target = unit(on, 3, 5, { team: MONSTERS })
        const flags: boolean[] = []
        on.signals.stepStarted.add(event => { if(event.unit === caster) flags.push(event.unit.touchable) })
        play(on, [[caster, chain(ETHEREAL_FORM, SLASH, WAIT)], [target, chain(WAIT, WAIT, WAIT)]])
        // The step before the slash is unsubstantial, the one after the blow is not.
        expect(flags[1]).toBe(false)
        expect(flags[flags.length - 1]).toBe(true)
    })
})

describe("Haunt", () => {
    test("the caster stands behind its host and follows its moves and turns", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const host = unit(on, 3, 3, { team: MONSTERS, direction: Vector2.LEFT })
        play(on, [[caster, chain(HAUNT, WAIT)], [host, chain(WAIT, STEP)]])
        // The host walked left; its back is to the right, where the caster stands, on the same row.
        expect(host.position.x).toBeLessThan(3)
        expect(caster.position.x).toBeGreaterThan(host.position.x)
        expect(Math.abs(caster.position.y - host.position.y)).toBeLessThan(0.5)
    })

    test("nobody ahead → nothing happens", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        unit(on, 0, 0, { team: MONSTERS })
        play(on, [[caster, chain(HAUNT, WAIT)]])
        expectAt(caster, 3, 6)
    })
})

describe("Plagiarism", () => {
    test("the last cards the units around played are copied at the end of the chain", () => {
        const on = battle()
        const walker = unit(on, 3, 3, { team: MONSTERS, direction: Vector2.LEFT })
        const caster = unit(on, 3, 5)
        play(on, [[walker, chain(STEP)], [caster, chain(WAIT, PLAGIARISM)]])
        // The step copied was played by the caster in its own facing, up, after the plagiarism.
        expect(caster.position.y).toBeLessThan(5)
    })

    test("nobody played around → nothing to copy", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        unit(on, 0, 0, { team: MONSTERS })
        play(on, [[caster, chain(PLAGIARISM)]])
        expect(on.events.some(event => event.type === "skipped" && event.reason === "rien à plagier")).toBe(true)
    })
})

describe("Exo-nerf", () => {
    test("the unit it sticks to plays each action of the shooter too, in its own facing", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const target = unit(on, 3, 3, { team: MONSTERS, direction: Vector2.LEFT })
        play(on, [[caster, chain(EXO_NERF, STEP)], [target, chain(WAIT, WAIT)]])
        expect(caster.position.y).toBeLessThan(6)
        expect(target.position.x).toBeLessThan(3)
    })

    test("nobody ahead → nobody copies", () => {
        const on = battle()
        const caster = unit(on, 3, 6)
        const far = unit(on, 0, 0, { team: MONSTERS })
        play(on, [[caster, chain(EXO_NERF, STEP)], [far, chain(WAIT, WAIT)]])
        expectAt(far, 0, 0)
    })

    test("two nerfs on each other → no endless echo", () => {
        const on = battle()
        const first = unit(on, 3, 6)
        const second = unit(on, 3, 3, { team: MONSTERS, direction: Vector2.DOWN })
        play(on, [[first, chain(EXO_NERF, STEP)], [second, chain(EXO_NERF, STEP)]])
        expect(first.alive && second.alive).toBe(true)
    })
})

describe("Stench", () => {
    test("after each step of the unit, the units close to it are pushed away", () => {
        const on = battle()
        const stinking = unit(on, 3, 2)
        const near = unit(on, 3, 3, { team: MONSTERS })
        on.applyStatus(stinking, STINKING, 2)
        play(on, [[stinking, chain(WAIT)], [near, chain(WAIT)]])
        expect(near.position.y).toBeGreaterThan(3)
    })

    test("a unit out of its reach is left where it stands", () => {
        const on = battle()
        const stinking = unit(on, 3, 1)
        const far = unit(on, 3, 5, { team: MONSTERS })
        on.applyStatus(stinking, STINKING, 1)
        play(on, [[stinking, chain(WAIT)], [far, chain(WAIT)]])
        expectAt(far, 3, 5)
    })

    test("a breath of carrion → every unit of the cone stinks, ally or enemy", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        const ally = unit(on, 3, 4)
        const foe = unit(on, 3, 3.5, { team: MONSTERS })
        const far = unit(on, 0, 0, { team: MONSTERS })
        const stinking: unknown[] = []
        on.signals.statusAdded.add(event => { if(event.type === STINKING) stinking.push(event.unit) })
        play(on, [[caster, chain(CARRION_BREATH)]])
        expect(stinking).toContain(ally)
        expect(stinking).toContain(foe)
        expect(stinking).not.toContain(far)
        expect(stinking).not.toContain(caster)
    })
})

describe("One mind", () => {
    /** The pairs of cards of the loot a one mind would change into each other, sharing two keywords at least. */
    function resembling(): [Card, Card][] {
        const pairs: [Card, Card][] = []
        for(const first of LOOT_CARDS){
            for(const second of LOOT_CARDS){
                if(first === second || first.input !== second.input || first.output !== second.output) continue
                const others = keywordsOf(second)
                if([...keywordsOf(first)].filter(keyword => others.has(keyword)).length >= 2) pairs.push([first, second])
            }
        }
        return pairs
    }

    test("the catalog holds cards that resemble each other, or the card would never change anything", () => {
        expect(resembling().length).toBeGreaterThan(0)
    })

    test("the unplayed cards of a unit in reach become the card given, those it played stay", () => {
        const on = battle()
        const target = unit(on, 3, 3, { team: MONSTERS })
        target.takeChain(chain(SHOT, SLASH, STEP))
        const changed = on.rewriteChain(target, card => card === SHOT, SLASH)
        expect(changed).toBe(1)
        expect(target.chain.cards).toEqual([SLASH, SLASH, STEP])
    })

    test("a card read already is left as it was", () => {
        const on = battle()
        const target = unit(on, 3, 3, { team: MONSTERS })
        target.takeChain(chain(SHOT, SHOT))
        target.chain.cursor = 1
        expect(on.rewriteChain(target, card => card === SHOT, SLASH)).toBe(1)
        expect(target.chain.cards).toEqual([SHOT, SLASH])
    })
})
