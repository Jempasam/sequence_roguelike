import { describe, expect, test } from "vitest"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { allFightTypes, fightTypeById } from "@game/core-src/games/mecard/sim/catalog/fightTypes"
import { ALL_FLOORS } from "@game/core-src/games/mecard/sim/catalog/floors"
import { ARCHER_KIT, LANCER_KIT, SWORDSMAN_KIT } from "@game/core-src/games/mecard/sim/catalog/kits"
import { BOSS_MONSTERS, GOBLIN, GOLEM } from "@game/core-src/games/mecard/sim/catalog/monsters"
import {
    AGGRESSION,
    ALL_FIGHT_CATEGORIES,
    AMBUSH,
    BATTLE,
    BOSS,
    ELITE,
    EMPTY_FIGHT,
} from "@game/core-src/games/mecard/sim/fight/fights"
import { fightType } from "@game/core-src/games/mecard/sim/fight/FightType"
import { GHOST_AMBUSH, GHOST_FIGHT, isGhostFight } from "@game/core-src/games/mecard/sim/fight/GhostFightType"
import { KitFightType } from "@game/core-src/games/mecard/sim/fight/KitFightType"
import { POWER } from "@game/core-src/games/mecard/sim/item/subs/stat/Power"
import { monsterStart } from "@game/core-src/games/mecard/sim/run/formation"
import { baseOf } from "@game/core-src/games/mecard/sim/run/Hero"
import { Journey } from "@game/core-src/games/mecard/sim/run/Journey"
import { Run } from "@game/core-src/games/mecard/sim/run/Run"
import { historyEntry, ghostOfEntry } from "@game/core-src/games/mecard/sim/save/historySave"
import type { Visual } from "@game/core-src/games/mecard/sim/base/Visual"
import type { FightType, Ghost } from "@game/core-src/games/mecard/sim/fight/FightType"
import { startedRun } from "../../../../fixtures/startedRun"
import { visual } from "../../../../../../core/src/games/mecard/sim/base/Visual"
import { laidIn } from "../../../../../../core/src/games/mecard/sim/floor/fights/designed"
import type { Laid } from "../../../../../../core/src/games/mecard/sim/floor/fights/designed"

const AT = { layer: 0, across: 0.5 }

describe("allFightTypes", () => {
    test("every fight → its own id, found by it", () => {
        const types = allFightTypes()
        expect(new Set(types.map(type => type.id)).size).toBe(types.length)
        for(const type of types) expect(fightTypeById(type.id)).toBe(type)
    })

    test("every fight → of a category of the catalog", () => {
        for(const type of allFightTypes()) expect(ALL_FIGHT_CATEGORIES).toContain(type.category)
    })

    test("an unknown id → refused", () => {
        expect(() => fightTypeById("inconnu")).toThrow("inconnu")
    })
})

describe("a fight made", () => {
    test("a boss fight of a floor → leads with a boss, in a battle of that fight", () => {
        const run = startedRun(1)
        const type = allFightTypes().find(each => each.category === BOSS)!
        const fight = type.create(run, { layer: 11, across: 0.5 })
        expect(fight.type).toBe(type)
        expect(BOSS_MONSTERS).toContain(fight.monsters[0])
        const foes = fight.battle.units.filter(unit => unit.team === run.monstersTeam)
        expect(foes).toHaveLength(fight.monsters.length)
    })

    test("a fight of its own → puts the monsters where it says", () => {
        const run = startedRun(1)
        const corner = new Vector2(1, 1)
        const type = fightType({
            id: "test-corner", name: "Coin", description: "Un gobelin dans un coin.", icon: BATTLE.icon,
            category: ELITE,
            populate: stage => {
                stage.add(GOLEM, { position: corner })
                stage.add(GOBLIN)
            },
        })
        const fight = type.create(run, AT)
        expect(fight.monsters).toEqual([GOLEM, GOBLIN])
        const [golem] = fight.battle.units.filter(unit => unit.team === run.monstersTeam)
        expect(golem.position).toEqual(corner)
    })

    test("a fight against kits → its ambush is its twin", () => {
        const run = startedRun(1)
        const type = new KitFightType({
            id: "test-kits", name: "Aventuriers", description: "Deux kits.", icon: BATTLE.icon, category: AGGRESSION,
            kits: [SWORDSMAN_KIT, ARCHER_KIT],
        })
        const { ambush } = type
        expect(ambush).toBe(type.ambush)
        expect(ambush.id).toBe("test-kits-embuscade")
        expect(ambush.category).toBe(AMBUSH)
        expect(ambush.icon).toBe(type.icon)
        expect(ambush.kits).toEqual(type.kits)
        expect(ambush.ambush).toBe(ambush)
        const foesOf = (fight: FightType) => fight.create(run, AT).battle.units.filter(unit => unit.team === run.monstersTeam)
        const shownOf = (fight: FightType) => foesOf(fight).map(unit => [unit.stats.showChain.value, unit.stats.showHand.value])
        expect(shownOf(type)).toEqual([[true, true], [true, true]])
        expect(shownOf(ambush)).toEqual([[false, true], [false, true]])
    })

    test("every fight against kits → has its ambush among the fights of the catalog", () => {
        const types = allFightTypes()
        const kitFights = types.filter((type): type is KitFightType => type instanceof KitFightType && !type.hiddenChains)
        expect(kitFights.length).toBeGreaterThan(0)
        for(const type of kitFights) expect(types).toContain(type.ambush)
    })

    test("a fight against kits → what its units show of their cards is kept through a save", () => {
        const run = startedRun(1)
        const type = new KitFightType({
            id: "test-kits", name: "Aventuriers", description: "Deux kits.", icon: BATTLE.icon, category: AGGRESSION,
            kits: [SWORDSMAN_KIT],
        }).ambush
        const { battle } = type.create(run, AT)
        const loaded = battle.clone()
        const foe = loaded.units.find(unit => unit.team.name === run.monstersTeam.name)!
        expect([foe.stats.showChain.value, foe.stats.showHand.value]).toEqual([false, true])
        for(const hero of loaded.units.filter(unit => unit.team.name !== run.monstersTeam.name)){
            expect([hero.stats.showChain.value, hero.stats.showHand.value]).toEqual([false, true])
        }
    })

    test("a fight against kits → a unit of the monsters' team for each, played by an AI of its own, no monster", () => {
        const run = startedRun(1)
        const type = new KitFightType({
            id: "test-kits", name: "Aventuriers", description: "Deux kits.", icon: BATTLE.icon, category: AGGRESSION,
            kits: [SWORDSMAN_KIT, ARCHER_KIT],
        })
        const fight = type.create(run, AT)
        const foes = fight.battle.units.filter(unit => unit.team === run.monstersTeam)
        expect(fight.monsters).toEqual([])
        expect(foes.map(unit => unit.name)).toEqual([SWORDSMAN_KIT.name, ARCHER_KIT.name])
        for(const foe of foes) expect(typeof foe.controller).toBe("object")
        expect(foes[0].controller).not.toBe(foes[1].controller)
    })

    test("a fight against kits on the fourth floor → its foes draw more cards and carry the power", () => {
        const run = startedRun(1)
        run.travel.enterFloor(ALL_FLOORS[0].create(4))
        const type = new KitFightType({
            id: "test-kits", name: "Aventuriers", description: "Un kit.", icon: BATTLE.icon, category: AGGRESSION,
            kits: [SWORDSMAN_KIT],
        })
        const { battle } = type.create(run, AT)
        const foe = battle.units.find(unit => unit.team === run.monstersTeam)!
        expect(foe.stats.draw.value).toBe(4)
        expect(foe.stats.chainSize.value).toBe(7)
        expect(foe.items.filter(item => item === POWER)).toHaveLength(1)
        for(const hero of battle.units.filter(unit => unit.team === run.heroesTeam)){
            expect(hero.items).not.toContain(POWER)
        }
    })

    test("a fight → hears the level of the floor and its layer", () => {
        const run = startedRun(1)
        const seen: number[] = []
        fightType({
            id: "test-seen", name: "Vu", description: "Compte.", icon: BATTLE.icon, category: BATTLE,
            populate: stage => { seen.push(stage.level, stage.layer) },
        }).create(run, { layer: 7, across: 0.5 })
        expect(seen).toEqual([run.travel.floor.level, 7])
    })
})

describe("the fights of the floors", () => {
    const RADIUS = 0.35

    /** Where each monster of a fight stands, with its radius, as the fight stands them at a level. */
    function standing(type: FightType, level: number, layer: number): { at: Vector2, radius: number }[] {
        const stood: { at: Vector2, radius: number }[] = []
        type.populate({
            rng: new Rng(1), level, layer,
            addKit: (_kit, pose) => {
                stood.push({ at: pose?.position ?? monsterStart(stood.length), radius: RADIUS })
            },
            addHero: (_hero, pose) => {
                stood.push({ at: pose?.position ?? monsterStart(stood.length), radius: RADIUS })
            },
            add: (monster, pose) => {
                stood.push({ at: pose?.position ?? monsterStart(stood.length), radius: RADIUS * (monster.size ?? 1) })
            },
        })
        return stood
    }

    test("every floor → a fight for each place of its map, whatever the seed", () => {
        for(const floor of ALL_FLOORS){
            for(let seed = 1; seed <= 30; seed++){
                const map = new Journey(new Rng(seed))
                floor.create(1).fillMap(map)
                const fights = map.places.flatMap(place => place.fight ? [place.fight.category] : [])
                expect(fights).toContain(BATTLE)
                expect(fights.at(-1)).toBe(BOSS)
            }
        }
    })

    test.each(allFightTypes().filter(type => type !== EMPTY_FIGHT && !isGhostFight(type)).map(type => ({ id: type.id, type })))(
        "$id → monsters stand apart and in the top rows of the arena, whatever the level",
        ({ type }) => {
            for(let level = 1; level <= 4; level++){
                const stood = standing(type, level, 5)
                expect(stood.length).toBeGreaterThan(0)
                expect(stood.length).toBeLessThanOrEqual(14)
                for(const { at, radius } of stood){
                    expect(at.x - radius).toBeGreaterThanOrEqual(0)
                    expect(at.x + radius).toBeLessThanOrEqual(9)
                    expect(at.y - radius).toBeGreaterThanOrEqual(0)
                    expect(at.y + radius).toBeLessThanOrEqual(3.5)
                }
                for(const [index, one] of stood.entries()) for(const other of stood.slice(index + 1)){
                    expect(one.at.distance(other.at)).toBeGreaterThanOrEqual(one.radius + other.radius - 1e-9)
                }
            }
        },
    )
})

describe("the hazards of the fights of the floors", () => {
    const fights = allFightTypes().filter(type => type !== EMPTY_FIGHT && !isGhostFight(type)).map(type => ({ id: type.id, type }))

    test.each(fights)("$id → some hazards laid, and not too many acting", ({ type }) => {
        const hazards = type.hazards ?? []
        expect(hazards.length).toBeGreaterThanOrEqual(1)
        expect(hazards.length).toBeLessThanOrEqual(4)
        // The machines, which move and strike on their own, are few: a hole or a puddle only waits for what comes in.
        const machines = hazards.filter(each => {
            return each.type.bodies.some(body => (body.body.cards ?? []).length > 0 && body.ground === undefined)
        })
        expect(machines.length).toBeLessThanOrEqual(2)
    })

    test.each(fights)("$id → laid out in the arena, off the units, whatever the party and the level", ({ type }) => {
        for(const heroes of [1, 3, 4]){
            const run = startedRun(1)
            while(run.heroes.length < heroes) run.hire(LANCER_KIT)
            const fight = type.create(run, { layer: 5, across: 0.5 })
            const scenery = fight.battle.units.filter(unit => !unit.decisive && unit.team.name === "Décor")
            expect(scenery.length).toBeGreaterThanOrEqual((type.hazards ?? []).length)
            expect(fight.battle.units.filter(unit => unit.team.name === "Décor").every(unit => !unit.decisive)).toBe(true)
            for(const unit of scenery){
                const { x, y } = unit.position
                expect(x).toBeGreaterThan(-5)
                expect(x).toBeLessThan(14)
                expect(y).toBeGreaterThan(-5)
                expect(y).toBeLessThan(14)
            }
            // Nobody stands inside what blocks: no unit of a side overlaps a body that takes room.
            const bodies = fight.battle.bodies
            for(const [index, one] of bodies.entries()) for(const other of bodies.slice(index + 1)){
                expect(one.hitbox.gap(one, other.hitbox, other), `${one.name} / ${other.name}`).toBeGreaterThanOrEqual(-1e-9)
            }
        }
    })

    test.each(fights)("$id → a battle that plays through to its end, whatever the hazards do", ({ type }) => {
        const run = startedRun(1)
        const fight = type.create(run, { layer: 5, across: 0.5 })
        const { battle } = fight
        battle.startRound()
        for(let round = 0; round < 60 && battle.phase !== "over"; round++){
            if(battle.waiting) battle.startRound()
            for(const unit of battle.living.filter(each => each.controller === "player")){
                battle.commitPlan(unit, battle.planAsBot(unit))
            }
            battle.endPreparation()
            battle.playRound()
        }
        expect(battle.events.filter(event => event.type === "error")).toEqual([])
    })
})

describe("the picture of a fight of a floor", () => {
    test.each(allFightTypes().filter(type => type !== EMPTY_FIGHT && !isGhostFight(type)).map(type => ({ id: type.id, type })))(
        "$id → the sprite of one of its monsters",
        ({ type }) => {
            const sprites: Visual[] = []
            type.populate({
                rng: new Rng(1), level: 1, layer: 0,
                add: monster => { sprites.push(monster.sprite) },
                addKit: kit => { sprites.push(kit.sprite) },
                addHero: hero => { if(hero.sprite) sprites.push(hero.sprite) },
            })
            expect(sprites).toContainEqual(type.icon)
        },
    )
})

describe("the ghost fight", () => {
    /** A game of the past that went `depth` places far, its party the one of a started run. */
    function ghostOf(depth: number): Ghost {
        const past = startedRun(depth)
        past.travel.depth = depth
        return ghostOfEntry(historyEntry(past, depth, 0))
    }

    /** Three other fights of the category, laid in every layer. */
    function aggressions(): Laid[] {
        return ["a", "b", "c"].map(id => ({
            type: fightType({
                id, name: id, description: id, icon: visual("units/ghost"), category: AGGRESSION, populate: () => {},
            }),
            from: 0,
            to: 9,
        }))
    }

    test("no game kept → never laid, whatever the seed", () => {
        for(let seed = 1; seed <= 30; seed++){
            const map = new Journey(new Rng(seed))
            ALL_FLOORS[0].create(1).fillMap(map)
            expect(map.places.some(place => place.fight === GHOST_FIGHT)).toBe(false)
        }
    })

    test("available → only for a game at most three places further than the place", () => {
        const ghosts = [ghostOf(10)]
        expect(GHOST_FIGHT.available?.({ depth: 7, ghosts })).toBe(true)
        expect(GHOST_FIGHT.available?.({ depth: 6, ghosts })).toBe(false)
        expect(GHOST_FIGHT.available?.({ depth: 20, ghosts })).toBe(true)
        expect(GHOST_FIGHT.available?.({ depth: 1, ghosts: [] })).toBe(false)
    })

    test("a game kept in reach → laid on a map drawn from the run, in the layers of the elites", () => {
        const laid = new Set<number>()
        for(let seed = 1; seed <= 60; seed++){
            const map = new Journey(new Rng(seed))
            map.fights = { depth: 5, ghosts: [ghostOf(7)] }
            ALL_FLOORS[0].create(1).fillMap(map)
            for(const place of map.places) if(place.fight === GHOST_FIGHT) laid.add(place.layer)
        }
        expect(laid.size).toBeGreaterThan(0)
        expect([...laid].every(layer => layer >= 4 && layer <= 9)).toBe(true)
    })

    test("a game in reach and other fights → the ghosts are drawn about half of the time", () => {
        const context = { depth: 5, ghosts: [ghostOf(7)] }
        const rng = new Rng(1)
        const draws = 2000
        let ghosts = 0
        for(let i = 0; i < draws; i++){
            if(laidIn(aggressions(), AGGRESSION, 5, rng, context) === GHOST_FIGHT) ghosts++
        }
        expect(ghosts / draws).toBeGreaterThan(0.4)
        expect(ghosts / draws).toBeLessThan(0.6)
    })

    test("a game in reach → the ghosts are drawn as an ambush only for the ambushes", () => {
        const context = { depth: 5, ghosts: [ghostOf(7)] }
        const rng = new Rng(1)
        let ambushes = 0
        for(let i = 0; i < 300; i++){
            expect(laidIn(aggressions(), AGGRESSION, 5, rng, context)).not.toBe(GHOST_AMBUSH)
            if(laidIn(aggressions(), AMBUSH, 5, rng, context) === GHOST_AMBUSH) ambushes++
        }
        expect(ambushes).toBeGreaterThan(0)
    })

    test("saved by id → the ambush of the ghosts is found again", () => {
        expect(fightTypeById("ghost-embuscade")).toBe(GHOST_AMBUSH)
        expect(GHOST_AMBUSH.category).toBe(AMBUSH)
    })

    test("no game in reach → the ghosts are never drawn", () => {
        const rng = new Rng(1)
        for(let i = 0; i < 300; i++){
            expect(laidIn(aggressions(), AGGRESSION, 5, rng)).not.toBe(GHOST_FIGHT)
        }
    })

    test("made → the party of the game stands against ours, and ours is untouched", () => {
        const run = startedRun(1, undefined, undefined, [ghostOf(2)])
        const fight = GHOST_FIGHT.create(run, { layer: 5, across: 0.5 })
        const foes = fight.battle.units.filter(unit => unit.team === run.monstersTeam)
        expect(foes.map(unit => unit.name)).toEqual(run.ghosts[0].party().map(hero => hero.name))
        expect(run.heroes).toHaveLength(2)
    })

    test("made on a high floor → the ghosts stand as they fell, with no power", () => {
        const run = startedRun(1, undefined, undefined, [ghostOf(2)])
        run.travel.enterFloor(ALL_FLOORS[0].create(9))
        run.travel.depth = 2
        const fight = GHOST_FIGHT.create(run, { layer: 5, across: 0.5 })
        const foes = fight.battle.units.filter(unit => unit.team === run.monstersTeam)
        expect(foes.length).toBeGreaterThan(0)
        for(const foe of foes) expect(foe.items).not.toContain(POWER)
        expect(foes.map(foe => foe.stats.draw.base)).toEqual(run.ghosts[0].party().map(hero => baseOf(hero, "draw")))
    })

    test("made as a fight → the chains of the ghosts are shown, hidden as an ambush", () => {
        const run = startedRun(1, undefined, undefined, [ghostOf(2)])
        const shownOf = (type: FightType) => type.create(run, { layer: 5, across: 0.5 }).battle.units
            .filter(unit => unit.team === run.monstersTeam)
            .map(unit => unit.stats.showChain.value)
        expect(shownOf(GHOST_FIGHT).every(shown => shown)).toBe(true)
        expect(shownOf(GHOST_AMBUSH).some(shown => shown)).toBe(false)
    })

    test("a run made with a game in reach → its first map already holds ghosts", () => {
        const maps = (ghosts: readonly Ghost[]) => Array.from({ length: 80 }, (_, seed) => {
            const run = new Run(seed + 1, undefined, undefined, ghosts)
            return run.travel.journey.places.filter(place => place.fight && isGhostFight(place.fight)).length
        })
        expect(maps([ghostOf(2)]).some(count => count > 0)).toBe(true)
        expect(maps([]).every(count => count === 0)).toBe(true)
    })

    test("made with no game in reach → an empty fight rather than a broken one", () => {
        const run = startedRun(1)
        const fight = GHOST_FIGHT.create(run, { layer: 5, across: 0.5 })
        expect(fight.monsters).toEqual([])
    })
})
