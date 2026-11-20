import { describe, expect, test } from "vitest"
import {
    AGGRESSION, ALL_FIGHT_CATEGORIES, ALL_FLOORS, allFightTypes, AMBUSH, ARCHER_KIT, BATTLE, BOSS, BOSS_MONSTERS, ELITE, EMPTY_FIGHT,
    fightType, fightTypeById, GOBLIN, GOLEM, Journey, KitFightType, LANCER_KIT, monsterStart, Rng, SWORDSMAN_KIT, Vector2,
} from "@game/core/mecard"
import type { FightType, Visual } from "@game/core/mecard"
import { startedRun } from "../../../../fixtures/startedRun"

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
        for(const fight of [type, ambush]){
            const shown = foesOf(fight).map(unit => [unit.stats.showChain.value, unit.stats.showHand.value])
            expect(shown).toEqual([[true, true], [true, true]])
        }
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
        expect([foe.stats.showChain.value, foe.stats.showHand.value]).toEqual([true, true])
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

    test.each(allFightTypes().filter(type => type !== EMPTY_FIGHT).map(type => ({ id: type.id, type })))(
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
    const fights = allFightTypes().filter(type => type !== EMPTY_FIGHT).map(type => ({ id: type.id, type }))

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
    test.each(allFightTypes().filter(type => type !== EMPTY_FIGHT).map(type => ({ id: type.id, type })))(
        "$id → the sprite of one of its monsters",
        ({ type }) => {
            const sprites: Visual[] = []
            type.populate({
                rng: new Rng(1), level: 1, layer: 0,
                add: monster => { sprites.push(monster.sprite) },
                addKit: kit => { sprites.push(kit.sprite) },
            })
            expect(sprites).toContainEqual(type.icon)
        },
    )
})
