import { describe, expect, test } from "vitest"
import {
    Add, AIM, Arena, Battle, BLINK, BURN, Carried, CLONE, DODGE_CARD, FIRE_FLASK, FusionCard, GLASS_HEART,
    HEALING_POTION, Heart, HYPNOSIS, ModifierKey, PRAYER, RED_HEART, SHIELD_HEART, SHOT, SLASH, STEP,
    STUNNING_DASH, SWEEP, TASER, THORN_HEART, THRUST, TURN_RIGHT, UNIT_RADIUS, Vector2, WAIT,
} from "@game/core/mecard"
import type { Unit } from "@game/core/mecard"

import { battle, chain, expectAt, MONSTERS, play, unit, withPillars } from "../fixtures"

// --- Tests ---

describe("Battle.commit", () => {
    test("a chain → its cards leave the hand", () => {
        const on = battle()
        const planner = unit(on, 3, 3, { hand: [STEP, WAIT, SLASH] })
        unit(on, 0, 0, { team: MONSTERS })
        on.startRound()
        on.commit(planner, chain(STEP, WAIT))
        expect(planner.hand).toEqual([SLASH])
    })

    test("a card not in hand → refused", () => {
        const on = battle()
        const planner = unit(on, 3, 3)
        unit(on, 0, 0, { team: MONSTERS })
        on.startRound()
        expect(() => on.commit(planner, chain(BLINK))).toThrow()
    })
})

describe("Battle round", () => {
    test("two units → one step each in turn, the order shifting each round", () => {
        const on = battle()
        const a = unit(on, 1, 5)
        const b = unit(on, 5, 5, { team: MONSTERS })
        on.startRound()
        expect(on.initiative).toEqual([a, b])
        play(on, [[a, chain(STEP, STEP)], [b, chain(STEP)]])
        expectAt(a, 1, 1)
        expectAt(b, 5, 3)
        expect(on.initiative).toEqual([b, a])
    })

    test("a slash → the 3 cells ahead hit", () => {
        const on = battle()
        const attacker = unit(on, 3, 3)
        const left = unit(on, 2, 2, { team: MONSTERS })
        const right = unit(on, 4, 2, { team: MONSTERS })
        play(on, [[attacker, chain(SLASH)]])
        expect(left.life).toBe(2)
        expect(right.life).toBe(2)
    })

    test("a thrust → the 2 cells in line ahead hit", () => {
        const on = battle()
        const attacker = unit(on, 3, 3)
        const far = unit(on, 3, 1, { team: MONSTERS })
        const side = unit(on, 2, 2, { team: MONSTERS })
        play(on, [[attacker, chain(THRUST)]])
        expect(far.life).toBe(2)
        expect(side.life).toBe(4)
    })

    test("a sweep → the cell behind hit too", () => {
        const on = battle()
        const attacker = unit(on, 3, 3)
        const behind = unit(on, 3, 4, { team: MONSTERS })
        play(on, [[attacker, chain(SWEEP)]])
        expect(behind.life).toBe(2)
    })

    test("a shot → only the first unit in line hit", () => {
        const on = battle()
        const attacker = unit(on, 3, 6)
        const first = unit(on, 3, 3, { team: MONSTERS })
        const second = unit(on, 3, 2, { team: MONSTERS })
        play(on, [[attacker, chain(SHOT)]])
        expect(first.life).toBe(3)
        expect(second.life).toBe(4)
    })
})

describe("Collisions", () => {
    /** A battle with a pillar 0.5 m wide at (3.5, 3). */
    function pillared(): Battle {
        return withPillars(new Battle(new Arena(7, 7), 1), { center: new Vector2(3.5, 3), radius: 0.5 })
    }

    test("brushing past a pillar → goes on", () => {
        const on = pillared()
        // Its path passes 0.8 m from the pillar: 0.05 m inside the true circles, within the slack.
        const walker = unit(on, 4.3, 5)
        const gone = on.travel(walker, walker.position, Vector2.UP, 4)
        expect(gone.distance).toBeCloseTo(4)
    })

    test("straight into a pillar → stops at the true contact", () => {
        const on = pillared()
        const walker = unit(on, 3.5, 5)
        const gone = on.travel(walker, walker.position, Vector2.UP, 3)
        const gap = gone.to.distance(new Vector2(3.5, 3))
        expect(gap).toBeGreaterThanOrEqual(0.5 + walker.radius)
        expect(gap).toBeLessThan(0.5 + walker.radius + 0.06)
    })

    test("a little inside a pillar, going further in → backs out to the true contact", () => {
        const on = pillared()
        const walker = unit(on, 3.5, 3.82)
        const gone = on.travel(walker, walker.position, Vector2.UP, 1)
        expect(gone.to.distance(new Vector2(3.5, 3))).toBeGreaterThanOrEqual(0.5 + walker.radius)
    })

    test("against a pillar, leaving along it → moves", () => {
        const on = pillared()
        const walker = unit(on, 3.5, 3.82)
        const gone = on.travel(walker, walker.position, new Vector2(1, 0), 1)
        expect(gone.distance).toBeCloseTo(1)
    })

    test("a pillar → a body of the battle, off the order of play, never aimed at nor touched", () => {
        const on = pillared()
        const hero = unit(on, 1, 5)
        const pillar = on.units.find(each => each.sprite?.visual === "units/pillar") as Unit
        expect(pillar.decisive).toBe(false)
        expect(pillar.radius).toBeCloseTo(0.5)
        expect(on.bodies).toContain(pillar)
        expect(on.touchables).not.toContain(pillar)
        expect(on.enemiesOf(hero)).not.toContain(pillar)
        expect(on.free(new Vector2(3.5, 3), null)).toBe(false)
        on.startRound()
        expect(on.initiative).toEqual([hero])
    })

    test("a ray into a pillar → stops there, hitting nobody", () => {
        const on = pillared()
        const shooter = unit(on, 3.5, 5)
        const hit = on.ray(shooter, 6, { position: shooter.position, direction: Vector2.UP })
        expect(hit.unit).toBeNull()
        expect(hit.end.y).toBeCloseTo(3.5)
    })

    test("a push → leaves a pillar where it stands", () => {
        const on = pillared()
        const pusher = unit(on, 1, 5)
        const pillar = on.units.find(each => each.sprite?.visual === "units/pillar") as Unit
        on.push(pillar, Vector2.RIGHT, 1, pusher)
        expect(pillar.position.equals(new Vector2(3.5, 3))).toBe(true)
    })

    test("a pillar playing a step itself → moves", () => {
        const on = pillared()
        const pillar = on.units.find(each => each.sprite?.visual === "units/pillar") as Unit
        expect(on.move(pillar, Vector2.RIGHT, 1).distance).toBeGreaterThan(0)
    })

    test("a pillar → saved and loaded back, once", () => {
        const on = pillared()
        unit(on, 1, 5)
        const loaded = Battle.restore(on.state())
        expect(loaded.units.filter(each => each.sprite?.visual === "units/pillar")).toHaveLength(1)
    })

    test("straight into a body → the body is struck, the true contact kept", () => {
        const on = battle()
        const walker = unit(on, 3, 5)
        const target = unit(on, 3, 3, { team: MONSTERS })
        const gone = on.travel(walker, walker.position, Vector2.UP, 3)
        expect(gone.struck).toBe(target)
        expect(gone.to.distance(target.position)).toBeGreaterThanOrEqual(walker.radius + target.radius)
    })

    test("a move against a wall → the wall stays exact", () => {
        const on = battle()
        const walker = unit(on, 3, 1)
        const gone = on.travel(walker, walker.position, Vector2.UP, 3)
        expect(gone.to.y).toBeGreaterThanOrEqual(walker.radius)
    })
})

describe("Free positions", () => {
    test("aim at an enemy off the axes → faces it exactly, then a step goes straight at it", () => {
        const on = battle()
        const aimer = unit(on, 1, 5)
        // 4 m away, along (0.6, -0.8): just in reach of the aim.
        unit(on, 3.4, 1.8, { team: MONSTERS })
        play(on, [[aimer, chain(AIM, STEP)]])
        expect(aimer.direction.x).toBeCloseTo(0.6)
        expect(aimer.direction.y).toBeCloseTo(-0.8)
        expect(aimer.position.x).toBeCloseTo(2.2)
        expect(aimer.position.y).toBeCloseTo(3.4)
    })

    test("a dash into a body → stops at contact, the other unit stunned", () => {
        const on = battle()
        const dasher = unit(on, 3, 5)
        const target = unit(on, 3, 3.5, { team: MONSTERS })
        play(on, [[dasher, chain(STUNNING_DASH)]])
        expect(target.position.distance(dasher.position)).toBeGreaterThanOrEqual(2 * UNIT_RADIUS)
        expect(target.position.distance(dasher.position)).toBeLessThan(2 * UNIT_RADIUS + 0.1)
        expect(on.events.some(event => event.type === "status" && event.text === "étourdi")).toBe(true)
    })

    test("a move factor of ×1.5 → a step goes 3 m instead of 2", () => {
        const on = battle()
        const walker = unit(on, 3, 6)
        unit(on, 0, 0, { team: MONSTERS })
        walker.stats.move.add(new ModifierKey("bottes"), new Add(0.5))
        play(on, [[walker, chain(STEP)]])
        expectAt(walker, 3, 3)
    })

    test("a pillar between → the shot stops on it", () => {
        const on = withPillars(new Battle(new Arena(7, 7), 1), { center: new Vector2(3, 3), radius: 0.45 })
        const shooter = unit(on, 3, 6)
        const behind = unit(on, 3, 1, { team: MONSTERS })
        play(on, [[shooter, chain(SHOT)]])
        expect(behind.life).toBe(4)
    })
})

describe("Battle.damage", () => {
    test("a shield heart → lost before the red ones", () => {
        const on = battle()
        const hearts = [...Heart.many(RED_HEART, 2), ...Heart.many(SHIELD_HEART, 2)]
        const target = unit(on, 3, 3, { hearts })
        target.hearts.damage(2, "physical", null)
        expect(target.hearts.all.map(heart => heart.kind)).toEqual([RED_HEART, RED_HEART])
        expect(target.life).toBe(2)
    })

    test("a glass heart → broken with the other one by a hit of 1, the rest untouched", () => {
        const on = battle()
        const hearts = [...Heart.many(RED_HEART, 2), ...Heart.many(GLASS_HEART, 2)]
        const target = unit(on, 3, 3, { hearts })
        target.hearts.damage(1, "physical", null)
        expect(target.life).toBe(2)
    })

    test("thorn hearts broken → the attacker wounded once per heart", () => {
        const on = battle()
        const attacker = unit(on, 3, 4)
        const hearts = [...Heart.many(RED_HEART, 2), ...Heart.many(THORN_HEART, 2)]
        const target = unit(on, 3, 3, { team: MONSTERS, hearts })
        target.hearts.damage(2, "physical", attacker)
        expect(attacker.life).toBe(2)
    })

    test("two thorn hearts against each other → stops at the depth limit, no loop", () => {
        const on = battle()
        const thorns = () => Heart.many(THORN_HEART, 20)
        const hearts = () => [...Heart.many(RED_HEART, 2), ...thorns()]
        const a = unit(on, 3, 4, { hearts: hearts() })
        const b = unit(on, 3, 3, { team: MONSTERS, hearts: hearts() })
        b.hearts.damage(1, "physical", a)
        expect(on.events.some(event => event.type === "error")).toBe(true)
    })

    test("a dodge → the physical attack misses", () => {
        const on = battle()
        const attacker = unit(on, 3, 3, { team: MONSTERS, direction: Vector2.DOWN })
        const dodger = unit(on, 3, 4)
        on.startRound()
        play(on, [[dodger, chain(DODGE_CARD)], [attacker, chain(WAIT, SLASH)]])
        expect(dodger.life).toBe(4)
    })
})

describe("Steps of others", () => {
    test("a stunning dash → the unit hit plays its steps one step late", () => {
        const on = battle()
        const dasher = unit(on, 3, 5)
        const target = unit(on, 3, 3, { team: MONSTERS })
        play(on, [[dasher, chain(STUNNING_DASH)], [target, chain(TURN_RIGHT, TURN_RIGHT)]])
        expect(target.direction).toEqual(Vector2.DOWN)
        expect(on.events.some(event => event.type === "skipped" && event.reason === "étourdi")).toBe(true)
    })

    test("a taser → the next step of the target lost for good", () => {
        const on = battle()
        const taser = unit(on, 3, 4)
        const target = unit(on, 3, 3, { team: MONSTERS })
        play(on, [[taser, chain(TASER)], [target, chain(TURN_RIGHT, TURN_RIGHT)]])
        expect(target.direction).toEqual(Vector2.RIGHT)
    })

    test("a hypnosis of a step → the target walks, in its own facing", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        const target = unit(on, 3, 2, { team: MONSTERS, direction: Vector2.LEFT })
        play(on, [[caster, chain(HYPNOSIS, STEP)]])
        expectAt(target, 1, 2)
    })

    test("a hypnosis → reaches off its axis, within the cone", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        const target = unit(on, 4, 3, { team: MONSTERS, direction: Vector2.LEFT })
        play(on, [[caster, chain(HYPNOSIS, STEP)]])
        expectAt(target, 2, 3)
    })

    test("a hypnosis → the closest unit in the cone, not the one straight ahead", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        const near = unit(on, 4, 3, { team: MONSTERS, direction: Vector2.LEFT })
        const ahead = unit(on, 3, 2, { team: MONSTERS, direction: Vector2.LEFT })
        play(on, [[caster, chain(HYPNOSIS, STEP)]])
        expectAt(near, 2, 3)
        expectAt(ahead, 3, 2)
    })

    test("a hypnosis → goes through a pillar", () => {
        const on = withPillars(new Battle(new Arena(7, 7), 1), { center: new Vector2(3.5, 3.5), radius: 0.5 })
        const caster = unit(on, 3, 5)
        const target = unit(on, 3, 2, { team: MONSTERS, direction: Vector2.LEFT })
        play(on, [[caster, chain(HYPNOSIS, STEP)]])
        expectAt(target, 1, 2)
    })

    test("a hypnosis → nobody touched out of the cone or of its reach", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        const side = unit(on, 1, 5, { team: MONSTERS, direction: Vector2.UP })
        const far = unit(on, 3, 0, { team: MONSTERS, direction: Vector2.LEFT })
        play(on, [[caster, chain(HYPNOSIS, STEP)]])
        expectAt(side, 1, 5)
        expectAt(far, 3, 0)
        expect(on.events.some(event => event.type === "skipped" && event.reason === "personne à hypnotiser")).toBe(true)
    })

    test("a hypnosis previewed → the cone, then the arrow to the target", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        unit(on, 4, 3, { team: MONSTERS })
        const [root] = chain(HYPNOSIS, STEP).preview(on, caster)
        expect(root.preview?.indicators.slice(0, 2).map(indicator => indicator.kind)).toEqual(["polygon", "arrow"])
    })

    test("a clone → plays the rest of the chain too, then vanishes", () => {
        const on = battle()
        const maker = unit(on, 3, 5)
        unit(on, 0, 0, { team: MONSTERS })
        play(on, [[maker, chain(CLONE, STEP)]])
        const clone = on.events.find(event => event.type === "spawned")
        expect(clone).toBeDefined()
        expectAt(maker, 3, 3)
        expect(on.units).toHaveLength(2)
    })

    test("a clone → carries a vanishing process and counts for no team, gone at the round's end", () => {
        const on = battle()
        const maker = unit(on, 3, 5)
        unit(on, 0, 0, { team: MONSTERS })
        on.startRound()
        const clone = on.clone(maker, [new Heart(RED_HEART), new Heart(RED_HEART)]) as Unit
        expect(clone.vanishing).toBe(true)
        expect(clone.decisive).toBe(false)
        const gone: Unit[] = []
        on.signals.vanished.add(({ unit: each }) => gone.push(each))
        play(on, [])
        expect(gone).toEqual([clone])
        expect(on.units).not.toContain(clone)
    })

    test("a burn → a heart at the end of the round", () => {
        const on = battle()
        const target = unit(on, 3, 3)
        unit(on, 0, 0, { team: MONSTERS })
        on.startRound()
        on.applyStatus(target, BURN, 1)
        play(on, [])
        expect(target.life).toBe(3)
        expect(target.statuses.size).toBe(0)
    })
})

describe("Battle.tick", () => {
    test("a step → a little of the way at each tick, the whole way at the end", () => {
        const on = battle()
        const walker = unit(on, 3, 5, { hand: [STEP] })
        unit(on, 0, 0, { team: MONSTERS })
        on.startRound()
        on.commit(walker, chain(STEP))
        on.endPreparation()
        on.tick()
        expect(walker.position.y).toBeGreaterThan(3)
        expect(walker.position.y).toBeLessThan(5)
        on.playRound()
        expectAt(walker, 3, 3)
    })

    test("a slash → shows its arc before it lands", () => {
        const on = battle()
        const attacker = unit(on, 3, 3, { hand: [SLASH] })
        const target = unit(on, 3, 2, { team: MONSTERS })
        on.startRound()
        on.commit(attacker, chain(SLASH))
        on.endPreparation()
        const shown: string[] = []
        on.signals.effect.add(effect => shown.push(...effect.frame(0).map(each => each.kind)))
        on.tick()
        expect(shown).toEqual(["polygon"])
        expect(target.life).toBe(4)
        on.playRound()
        expect(target.life).toBe(2)
    })
})

describe("Battle, fusions", () => {
    test("a fusion of two thrusts → both played, the fusion kept whole in the deck", () => {
        const on = battle()
        const attacker = unit(on, 3, 3)
        const hearts = Heart.many(RED_HEART, 6)
        const target = unit(on, 3, 2, { team: MONSTERS, hearts })
        const fusion = new FusionCard([THRUST, THRUST])
        play(on, [[attacker, chain(fusion)]])
        expect(target.life).toBe(2)
        // Discarded whole at the end of the round, then drawn back at the start of the next.
        expect([...attacker.hand, ...attacker.decks.all[0].discard]).toEqual([fusion])
    })

    test("a prayer fused to a fusion of two thrusts → the shield given, both thrusts played", () => {
        const on = battle()
        const attacker = unit(on, 3, 3)
        const hearts = Heart.many(RED_HEART, 6)
        const target = unit(on, 3, 2, { team: MONSTERS, hearts })
        play(on, [[attacker, chain(new FusionCard([PRAYER, new FusionCard([THRUST, THRUST])]))]])
        expect(attacker.hearts.all.map(heart => heart.kind)).toContain(SHIELD_HEART)
        expect(target.life).toBe(2)
    })
})

describe("Battle.activate", () => {
    test("a potion chosen → used at the start of the execution, out of the belt", () => {
        const on = battle()
        const drinker = unit(on, 3, 3)
        unit(on, 0, 0, { team: MONSTERS })
        const potion = new Carried(HEALING_POTION)
        drinker.usables.push(potion)
        on.startRound()
        drinker.hearts.damage(3, "physical", null)
        on.activate(drinker, [potion])
        expect(drinker.life).toBe(1)
        on.endPreparation()
        expect(drinker.life).toBe(4)
        expect(drinker.usables).toEqual([])
    })

    test("nothing chosen → nothing used, the belt kept", () => {
        const on = battle()
        const carrier = unit(on, 3, 3)
        const enemy = unit(on, 3, 1, { team: MONSTERS })
        const flask = new Carried(FIRE_FLASK)
        carrier.usables.push(flask)
        play(on, [])
        expect(enemy.statuses.size).toBe(0)
        expect(carrier.usables).toEqual([flask])
    })

    test("one chosen twice, or one not carried → refused", () => {
        const on = battle()
        const carrier = unit(on, 3, 3)
        const potion = new Carried(HEALING_POTION)
        carrier.usables.push(potion)
        on.startRound()
        expect(() => on.activate(carrier, [potion, potion])).toThrow()
        expect(() => on.activate(carrier, [new Carried(HEALING_POTION)])).toThrow()
    })

    test("during the execution → refused", () => {
        const on = battle()
        const carrier = unit(on, 3, 3)
        unit(on, 3, 0, { team: MONSTERS })
        const potion = new Carried(HEALING_POTION)
        carrier.usables.push(potion)
        on.startRound()
        on.commit(carrier, chain())
        carrier.hand.push(STEP)
        on.commit(carrier, chain(STEP))
        on.endPreparation()
        expect(() => on.activate(carrier, [potion])).toThrow()
    })
})

describe("Battle.unblock", () => {
    test("leaves a unit with room alone", () => {
        const on = battle()
        const free = unit(on, 3, 3)
        on.unblock(free)
        expectAt(free, 3, 3)
        expect(free.life).toBe(4)
    })

    test("throws a unit off a body it lies in, for a heart", () => {
        const on = battle()
        const stuck = unit(on, 3, 3)
        unit(on, 3.1, 3, { team: MONSTERS })
        on.unblock(stuck)
        expect(on.free(stuck.position, stuck)).toBe(true)
        expect(stuck.life).toBe(3)
    })

    test("throws a unit off a pillar", () => {
        const on = withPillars(new Battle(new Arena(7, 7), 1), { center: new Vector2(3, 3), radius: 0.45 })
        const stuck = unit(on, 3, 3)
        on.unblock(stuck)
        expect(on.free(stuck.position, stuck)).toBe(true)
    })

    test("gets out of a crowd, a heart for each throw", () => {
        const on = battle()
        const stuck = unit(on, 3, 3, { hearts: Heart.many(RED_HEART, 20) })
        for(let x = 1.6; x < 4.5; x += 0.7){
            for(let y = 1.6; y < 4.5; y += 0.7) unit(on, x, y, { team: MONSTERS })
        }
        on.unblock(stuck)
        expect(on.free(stuck.position, stuck)).toBe(true)
        expect(stuck.life).toBeLessThan(20)
    })
})

describe("Battle.leap", () => {
    test("lands past a wall → back within the walls, for one heart", () => {
        const on = battle()
        const hero = unit(on, 3, 1)
        unit(on, 6, 6, { team: MONSTERS })
        on.leap(hero, new Vector2(3, -2))
        on.unblock(hero)
        expect(hero.life).toBe(3)
        expect(on.free(hero.position, hero)).toBe(true)
    })
})

describe("Unit.feverish", () => {
    test("as many hearts empty as full → not yet; one more → feverish", () => {
        const on = battle()
        const hero = unit(on, 3, 3)
        hero.hearts.all[3].isEmpty = true
        hero.hearts.all[2].isEmpty = true
        expect(hero.feverish).toBe(false)
        hero.hearts.all[1].isEmpty = true
        expect(hero.feverish).toBe(true)
    })
})

describe("Unit size", () => {
    test("makes its body bigger, so it is stopped sooner", () => {
        const on = battle()
        const big = unit(on, 1, 6)
        big.stats.size.base = 2
        expect(big.radius).toBeCloseTo(2 * UNIT_RADIUS)
        unit(on, 1, 3, { team: MONSTERS })
        play(on, [[big, chain(STEP)]])
        expect(big.position.y).toBeCloseTo(3 + 3 * UNIT_RADIUS, 1)
    })
})
