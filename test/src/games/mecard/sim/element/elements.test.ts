import { describe, expect, test } from "vitest"
import {
    AURA, BRAMBLES, BURN, CONJURATION, CROSSED_SPELL, ECHO, FIRE, FIRE_ELEMENT, GRAND_RITUAL_CARD,
    Heart,
    LAVA, LIGHTNING, LIGHTNING_ELEMENT, loadBattle, MUD, PLANT, POISONED, reaction, REACTION, RED_HEART,
    RITUAL, ROOTED,
    saveBattle, SHIELD_HEART, SLOWED, SMALL_SPELL, SPELL, STEAM, STEP, STONE, STONE_ELEMENT, STORM, WAIT,
    WATER, WATER_ELEMENT,
    WIND, WIND_ELEMENT, Vector2,
} from "@game/core/mecard"
import type { Card, Unit } from "@game/core/mecard"

import { battle, chain, expectAt, MONSTERS, play, unit } from "../fixtures"

/** Hearts enough to count every one lost. */
function sturdy(): Heart[] {
    return Heart.many(RED_HEART, 12)
}

/** How many hearts a unit of {@link sturdy} hearts lost. */
function lost(target: Unit): number {
    return 12 - target.life
}

/** A hero at the bottom of the arena facing up, and a sturdy foe a little ahead of it, facing it. */
function duel(): { on: ReturnType<typeof battle>, hero: Unit, foe: Unit } {
    const on = battle()
    const hero = unit(on, 3, 5)
    const foe = unit(on, 3, 3, { team: MONSTERS, hearts: sturdy(), direction: Vector2.DOWN })
    return { on, hero, foe }
}

/** Play a chain for the hero of a duel. */
function cast(...cards: Card[]): { on: ReturnType<typeof battle>, hero: Unit, foe: Unit } {
    const fight = duel()
    play(fight.on, [[fight.hero, chain(...cards)]])
    return fight
}

// --- Tests ---

describe("SPELL", () => {
    test("fire → a wound, and a burn", () => {
        const { foe } = cast(SPELL, FIRE)
        expect(foe.statusOf(BURN)).toBeDefined()
    })

    test("water → a wound, and a slowness", () => {
        const { foe } = cast(SPELL, WATER)
        expect(foe.statusOf(SLOWED)).toBeDefined()
        expect(lost(foe)).toBe(1)
    })

    test("plant → a poison", () => {
        expect(cast(SPELL, PLANT).foe.statusOf(POISONED)).toBeDefined()
    })

    test("stone → its two hearts on top of the wound", () => {
        expect(lost(cast(SPELL, STONE).foe)).toBe(3)
    })

    test("wind → thrown two meters some way", () => {
        const { foe } = cast(SPELL, WIND)
        expect(foe.position.distance(new Vector2(3, 3))).toBeGreaterThan(0.5)
    })

    test("the description lists every element", () => {
        const text = JSON.stringify(SPELL.description)
        expect(text).toContain("Vent")
        expect(text).toContain("Électricité")
    })
})

describe("SMALL_SPELL", () => {
    test("reaches far, without a wound", () => {
        const on = battle()
        const hero = unit(on, 3, 6.5)
        const foe = unit(on, 3, 1, { team: MONSTERS, hearts: sturdy() })
        play(on, [[hero, chain(SMALL_SPELL, WATER)]])
        expect(foe.statusOf(SLOWED)).toBeDefined()
        expect(lost(foe)).toBe(0)
    })
})

describe("AURA", () => {
    test("fire → the burn gone, and strength for the round", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 1, 1, { team: MONSTERS })
        on.applyStatus(hero, BURN, 3)
        on.startRound()
        hero.hand.push(AURA, FIRE, WAIT)
        on.commit(hero, chain(AURA, FIRE, WAIT))
        on.endPreparation()
        on.tick()
        expect(hero.statusOf(BURN)).toBeUndefined()
        expect(hero.stats.strength.value).toBe(1)
        on.playRound()
        expect(hero.stats.strength.value).toBe(0)
    })

    test("water → the negative statuses gone, the others kept", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 1, 1, { team: MONSTERS })
        on.applyStatus(hero, ROOTED, 9)
        play(on, [[hero, chain(AURA, WATER)]])
        expect(hero.statusOf(ROOTED)).toBeUndefined()
    })

    test("plant → a heart back", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 1, 1, { team: MONSTERS })
        hero.hearts.all[3].isEmpty = true
        play(on, [[hero, chain(AURA, PLANT)]])
        expect(hero.life).toBe(4)
    })

    test("stone → a shield heart", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(AURA, STONE)]])
        expect(hero.hearts.all.some(heart => heart.kind === SHIELD_HEART)).toBe(true)
    })

    test("wind → pushed straight ahead", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(AURA, WIND)]])
        expectAt(hero, 3, 3)
    })

    test("lightning → its next steps go farther, for the round", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(AURA, LIGHTNING, STEP)]])
        expectAt(hero, 3, 3)
        expect(hero.stats.move.value).toBe(1)
    })
})

describe("CONJURATION", () => {
    test("fire → flames for rounds, for whoever plays a step in them", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const foe = unit(on, 3, 4, { team: MONSTERS, hearts: sturdy() })
        play(on, [[hero, chain(CONJURATION, FIRE)]])
        expect(on.units.filter(body => body.sprite?.visual === "units/fire")).toHaveLength(1)
        expect(foe.statusOf(BURN)).toBeUndefined()
        play(on, [[foe, chain(WAIT)]])
        expect(foe.statusOf(BURN)).toBeDefined()
    })

    test("flames are gone after their rounds", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(CONJURATION, FIRE)]])
        play(on, [])
        play(on, [])
        expect(on.units.filter(body => body.sprite?.visual === "units/fire")).toEqual([])
    })

    test("wind → a whirlwind playing right after its caster", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        unit(on, 1, 1, { team: MONSTERS })
        on.startRound()
        hero.hand.push(CONJURATION, WIND)
        on.commit(hero, chain(CONJURATION, WIND))
        on.endPreparation()
        on.playRound()
        const whirlwind = on.units.find(body => body.sprite?.visual === "units/tornado")
        expect(whirlwind?.tangible).toBe(false)
        expect(whirlwind?.position.equals(new Vector2(3, 3.5))).toBe(false)
    })

    test("water → a wave going through bodies, carrying them along, each once", () => {
        const on = battle()
        const hero = unit(on, 3, 6.5)
        const foe = unit(on, 3, 3.5, { team: MONSTERS, hearts: sturdy() })
        play(on, [[hero, chain(CONJURATION, WATER)]])
        const wave = on.units.find(body => body.sprite?.visual === "units/wave")
        expect(wave?.radius).toBeGreaterThan(hero.radius)
        expect(foe.statusOf(SLOWED)).toBeDefined()
        expect(foe.position.y).toBeLessThan(3.5)
    })

    test("stone → a boulder in the way, whose touch hurts each unit once a round", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const foe = unit(on, 3, 2, { team: MONSTERS, direction: Vector2.DOWN, hearts: sturdy() })
        play(on, [[hero, chain(CONJURATION, STONE)]])
        expect(on.bodies.some(body => body.sprite?.visual === "units/rock")).toBe(true)
        play(on, [[foe, chain(STEP, STEP)]])
        expect(lost(foe)).toBe(2)
    })

    test("plant → a thorn, a wound and the negative", () => {
        const { foe } = cast(CONJURATION, PLANT)
        // The thorn, then two hearts of poison as the round ends.
        expect(lost(foe)).toBe(3)
        expect(foe.statusOf(POISONED)).toBeDefined()
    })

    test("lightning → an arc jumping from body to body, each once", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const first = unit(on, 3, 4.5, { team: MONSTERS, hearts: sturdy() })
        const second = unit(on, 3, 2.5, { team: MONSTERS, hearts: sturdy() })
        const out = unit(on, 6.5, 1, { team: MONSTERS, hearts: sturdy() })
        const stunned: Unit[] = []
        const stun = on.stun.bind(on)
        on.stun = target => {
            stunned.push(target)
            stun(target)
        }
        play(on, [[hero, chain(CONJURATION, LIGHTNING)]])
        expect(stunned).toEqual([first, second])
        expect(stunned).not.toContain(out)
    })

    test("a body the caller left comes back from a save with its element", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(CONJURATION, STONE)], [on.units[1], chain()]])
        const save = saveBattle(on)
        expect(saveBattle(loadBattle(save))).toEqual(save)
    })
})

describe("CROSSED_SPELL", () => {
    test("calls the first element, applying the negative of the second", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const foe = unit(on, 3, 2, { team: MONSTERS, direction: Vector2.DOWN, hearts: sturdy() })
        play(on, [[hero, chain(CROSSED_SPELL, STONE, WATER)]])
        expect(on.bodies.some(body => body.sprite?.visual === "units/rock")).toBe(true)
        play(on, [[foe, chain(STEP, STEP)]])
        expect(foe.statusOf(SLOWED)).toBeDefined()
        expect(lost(foe)).toBe(0)
    })
})

describe("reaction", () => {
    test("two elements → their compound, in either order", () => {
        expect(reaction(FIRE_ELEMENT, WATER_ELEMENT)).toBe(STEAM)
        expect(reaction(WATER_ELEMENT, FIRE_ELEMENT)).toBe(STEAM)
        expect(reaction(FIRE_ELEMENT, STONE_ELEMENT)).toBe(LAVA)
        expect(reaction(WIND_ELEMENT, LIGHTNING_ELEMENT)).toBe(STORM)
        expect(reaction(STONE_ELEMENT, WATER_ELEMENT)).toBe(MUD)
    })

    test("two elements that do not react → none", () => {
        expect(reaction(WATER_ELEMENT, WIND_ELEMENT)).toBeNull()
    })

    test("a compound does what both do", () => {
        expect(BRAMBLES.first.name).toBe("Plante")
        const { foe } = cast(REACTION, FIRE, WATER, WAIT)
        expect(lost(foe)).toBe(0)
    })
})

describe("REACTION", () => {
    test("in a spell → the compound it gives", () => {
        const { foe } = cast(SPELL, REACTION, FIRE, WATER)
        expect(foe.statusOf(BURN)).toBeDefined()
        expect(foe.statusOf(SLOWED)).toBeDefined()
    })

    test("no reaction → the first element goes on alone", () => {
        const { foe } = cast(SPELL, REACTION, WATER, WIND)
        expect(foe.statusOf(SLOWED)).toBeDefined()
    })
})

describe("RITUAL and ECHO", () => {
    test("an echo meets the ritual of the round", () => {
        const { on, hero, foe } = duel()
        hero.stats.chainSize.base = 5
        play(on, [[hero, chain(RITUAL, FIRE, SPELL, ECHO, WATER)]])
        expect(foe.statusOf(BURN)).toBeDefined()
        expect(foe.statusOf(SLOWED)).toBeDefined()
        expect(hero.processes).toEqual([])
    })

    test("no ritual → the element as it is", () => {
        const { foe } = cast(SPELL, ECHO, WATER)
        expect(foe.statusOf(BURN)).toBeUndefined()
        expect(foe.statusOf(SLOWED)).toBeDefined()
    })

    test("a grand ritual lasts rounds, and comes back from a save", () => {
        const fight = cast(GRAND_RITUAL_CARD, FIRE)
        const again = loadBattle(saveBattle(fight.on))
        const hero = again.units[0]
        play(again, [[hero, chain(SPELL, ECHO, WATER)]])
        expect(again.units[1].statusOf(BURN)).toBeDefined()
    })
})

describe("every element", () => {
    test("is named by its card", () => {
        expect(FIRE.name).toBe(FIRE_ELEMENT.name)
    })
})
