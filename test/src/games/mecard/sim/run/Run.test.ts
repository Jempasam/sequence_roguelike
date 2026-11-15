import { describe, expect, test } from "vitest"
import {
    ARCHER_KIT, BATTLE, BATTLE_REWARD_HALT, BOSS, CaveFloor, CHEST_HALT, EXIT_HALT, SHOP_HALT, CAVE_FLOOR,
    FOREST_FLOOR, GOBLIN, GOLEM, HELL_FLOOR, isHalt, LAYERS, MINE_FLOOR, DeckAi, Run, TROLL,
} from "@game/core/mecard"
import type { Battle, FightType, Monster, Place, PlaceType } from "@game/core/mecard"
import { ScriptedPlayer } from "../../../../fixtures/haltFixtures"
import { startedRun } from "../../../../fixtures/startedRun"
import { DamageType } from "@game/core/mecard"

// --- Fixture builders ---

/** Play a battle with bots on every side until it ends, or a long while. */
function playOut(fight: Battle): void {
    for(let round = 0; round < 60 && fight.phase !== "over"; round++){
        if(fight.waiting) fight.startRound()
        for(const fighter of fight.living) fight.commit(fighter, new DeckAi().decide(fighter).chain)
        fight.endPreparation()
        fight.playRound()
    }
}

/** Kill every monster of a battle, then play the round out, so the party wins it. */
function win(run: Run, fight: Battle): void {
    for(const unit of fight.living){
        if(unit.team !== run.heroesTeam) unit.hearts.damage(unit.life, DamageType.PHYSICAL, null)
    }
    fight.endPreparation()
    fight.playRound()
}

/** A cave of nothing but goblins. */
class GoblinCave extends CaveFloor {
    protected override monsters(): Monster[] {
        return [GOBLIN]
    }
}

/** Walk a party to a place: in, and back out on the map. */
function walk(run: Run, place: Place): void {
    run.travel.go(place)
    run.travel.enter()
    run.travel.leave()
}

/** The fight of the current place, its first round started, as the screen starts it. */
function fought(run: Run): Battle {
    run.startBattle()
    const fight = run.battle
    if(!fight) throw new Error("No battle started.")
    fight.startRound()
    return fight
}

/** Walk a party down to the exits of its floor, standing on the boss. */
function toBoss(run: Run): void {
    for(let layer = 0; layer < LAYERS; layer++) walk(run, run.travel.next[0])
}

/** Stand a party on a new place of a sort. */
function standOn(run: Run, type: PlaceType): Place {
    const where = { layer: 1, across: 0.5, next: [], exitTo: null, monsters: [] }
    const place: Place = isHalt(type)
        ? { ...where, fight: null, halt: type }
        : { ...where, fight: type as FightType, halt: null }
    run.travel.jump(place)
    return place
}

// --- Tests ---

describe("Run", () => {
    test("bots on both sides → the battle ends, with no error", () => {
        const run = startedRun(1)
        const fight = fought(run)
        playOut(fight)
        expect(fight.events.filter(event => event.type === "error")).toEqual([])
        expect(fight.phase).toBe("over")
        run.endBattle()
        expect(["travel", "over"]).toContain(run.phase)
    })
})

describe("Run.travel", () => {
    test("a place of the first layer, then one it leads to → the party goes deeper", () => {
        const run = startedRun(1)
        const first = run.travel.next[0]
        walk(run, first)
        expect(run.travel.place).toBe(first)
        expect(run.travel.depth).toBe(1)
        walk(run, first.next[0])
        expect(run.travel.depth).toBe(2)
    })

    test("a place not reachable → an error", () => {
        const run = startedRun(1)
        expect(() => walk(run, run.travel.journey.layers[2][0])).toThrow()
    })

    test("a new run → the first level of the cave", () => {
        const { floor } = startedRun(1).travel
        expect(floor.type).toBe(CAVE_FLOOR)
        expect(floor.level).toBe(1)
    })

    test("entering a floor → it, a new map, the party before its first layer", () => {
        const run = startedRun(1)
        const journey = run.travel.journey
        const forest = FOREST_FLOOR.create(2)
        walk(run, run.travel.next[0])
        run.travel.enterFloor(forest)
        expect(run.travel.floor).toBe(forest)
        expect(run.travel.journey).not.toBe(journey)
        expect(run.travel.place).toBeNull()
    })

    test("from the boss → its exits, none more deep", () => {
        const run = startedRun(1)
        toBoss(run)
        const { depth } = run.travel
        expect(run.travel.next.map(place => place.halt)).toEqual([EXIT_HALT, EXIT_HALT])
        walk(run, run.travel.next[0])
        expect(run.travel.depth).toBe(depth)
    })

    test("an exit cancelled → the other one open, and it can be taken", () => {
        const run = startedRun(1)
        toBoss(run)
        const [first, second] = run.travel.next
        walk(run, first)
        run.travel.haltOf(first).start(new ScriptedPlayer(run))
        expect(run.travel.returnable).toBe(first)
        expect(run.travel.next).toEqual([second])
        walk(run, second)
        expect(run.travel.place).toBe(second)
    })

    test("an exit taken → its floor, a level harder", () => {
        const run = startedRun(1)
        toBoss(run)
        const exit = run.travel.next[1]
        walk(run, exit)
        const player = new ScriptedPlayer(run)
        run.travel.haltOf(exit).start(player)
        player.play()
        expect(run.travel.floor.type).toBe(MINE_FLOOR)
        expect(run.travel.floor.level).toBe(2)
        expect(run.travel.place).toBeNull()
    })

    test("the exit of hell → the cave again, a level harder", () => {
        const run = startedRun(1)
        run.travel.enterFloor(HELL_FLOOR.create(3))
        toBoss(run)
        const [exit] = run.travel.next
        expect(run.travel.next).toHaveLength(1)
        walk(run, exit)
        const player = new ScriptedPlayer(run)
        run.travel.haltOf(exit).start(player)
        player.play()
        expect(run.travel.floor.type).toBe(CAVE_FLOOR)
        expect(run.travel.floor.level).toBe(4)
    })
})

describe("Run.haltOf", () => {
    test("asked twice → the same halt", () => {
        const run = startedRun(1)
        const place = standOn(run, CHEST_HALT)
        expect(run.travel.haltOf(place)).toBe(run.travel.haltOf(place))
    })

    test("two places of a kind → two halts", () => {
        const run = startedRun(1)
        expect(run.travel.haltOf(standOn(run, CHEST_HALT))).not.toBe(run.travel.haltOf(standOn(run, CHEST_HALT)))
    })

    test("a fight → an error", () => {
        const run = startedRun(1)
        expect(() => run.travel.haltOf(standOn(run, BATTLE))).toThrow()
    })

    test("another floor → new halts", () => {
        const run = startedRun(1)
        const place = standOn(run, CHEST_HALT)
        const halt = run.travel.haltOf(place)
        run.travel.enterFloor(FOREST_FLOOR.create(2))
        expect(run.travel.haltOf(place)).not.toBe(halt)
    })
})

describe("Run.returnable", () => {
    test("nowhere yet → none", () => {
        expect(startedRun(1).travel.returnable).toBeNull()
    })

    test("a halt never entered → none, nothing drawn", () => {
        const run = startedRun(1)
        const twin = startedRun(1)
        standOn(run, CHEST_HALT)
        expect(run.travel.returnable).toBeNull()
        expect(run.rng.next()).toBe(twin.rng.next())
    })

    test("a halt left with the run as it was → its place", () => {
        const run = startedRun(1)
        const place = standOn(run, CHEST_HALT)
        run.travel.haltOf(place).start(new ScriptedPlayer(run))
        expect(run.travel.returnable).toBe(place)
    })

    test("a halt that changed the run → none", () => {
        const run = startedRun(1)
        const halt = run.travel.haltOf(standOn(run, CHEST_HALT))
        const player = new ScriptedPlayer(run)
        halt.start(player)
        player.play()
        expect(halt.hasImpact).toBe(true)
        expect(run.travel.returnable).toBeNull()
    })

    test("a place gone from → none", () => {
        const run = startedRun(1)
        run.travel.haltOf(standOn(run, CHEST_HALT))
        standOn(run, SHOP_HALT)
        expect(run.travel.returnable).toBeNull()
    })
})

describe("Run.bot", () => {
    test("by default → the AI of the game, given to every battle", () => {
        const run = startedRun(2)
        expect(run.bot).toBeInstanceOf(DeckAi)
        expect(run.newBattle().bot).toBe(run.bot)
        run.startBattle()
        expect(run.battle?.bot).toBe(run.bot)
    })

    test("changed → the battles that follow play their bots with it", () => {
        const run = startedRun(2)
        const other = new DeckAi()
        run.bot = other
        expect(run.newBattle().bot).toBe(other)
        const played = run.newBattle()
        run.playBattle(played)
        expect(played.bot).toBe(other)
    })
})

describe("Run fights", () => {
    test("a won fight → the halt of its place, which knows the fight and pays once a prize is taken", () => {
        const run = startedRun(2)
        const { travel } = run
        const gold = run.gold
        const place = travel.next[0]
        travel.go(place)
        travel.enter()
        expect(travel.phase).toBe("fight")
        expect(travel.fight?.monsters).toEqual(place.monsters)
        run.startBattle()
        const fight = run.battle!
        fight.startRound()
        win(run, fight)
        run.endBattle()
        expect(run.phase).toBe("travel")
        expect(travel.phase).toBe("visit")
        expect(travel.halt?.type).toBe(BATTLE_REWARD_HALT)
        expect(travel.fight?.monsters).toEqual(place.monsters)
        expect(run.gold).toBe(gold)
    })

    test("a visit that follows a fight, left → the map, the fight forgotten", () => {
        const run = startedRun(2)
        const { travel } = run
        travel.go(travel.next[0])
        travel.enter()
        run.startBattle()
        run.battle!.startRound()
        win(run, run.battle!)
        run.endBattle()
        travel.leave()
        expect(travel.phase).toBe("map")
        expect(travel.fight).toBeNull()
    })

    test("a fight that lays no halt → the map once won", () => {
        const run = startedRun(2)
        const { travel } = run
        const place: Place = { fight: BATTLE, halt: null, layer: 1, across: 0.5, next: [], exitTo: null, monsters: [GOBLIN] }
        travel.jump(place)
        travel.journey.link(place, place)
        travel.go(place)
        travel.enter()
        run.startBattle()
        run.battle!.startRound()
        win(run, run.battle!)
        run.endBattle()
        expect(travel.phase).toBe("map")
        expect(run.phase).toBe("travel")
    })

    test("a place with a fight and a halt → the halt visited once the fight is won, and not fought again", () => {
        const run = startedRun(2)
        const { travel } = run
        const place: Place = { fight: BATTLE, halt: CHEST_HALT, layer: 1, across: 0.5, next: [], exitTo: null, monsters: [GOBLIN] }
        travel.jump(place)
        travel.journey.link(place, place)
        travel.go(place)
        travel.enter()
        run.startBattle()
        run.battle!.startRound()
        win(run, run.battle!)
        run.endBattle()
        expect(travel.halt?.type).toBe(CHEST_HALT)
        expect(run.gold).toBe(30)
        travel.leave()
        // The halt left as it was: going back into it opens it, not the fight.
        expect(travel.returnable).toBe(place)
        travel.go(place)
        travel.enter()
        expect(travel.phase).toBe("visit")
    })

    test("the boss → leads its monsters", () => {
        const run = startedRun(2)
        toBoss(run)
        expect(run.travel.place?.fight).toBe(BOSS)
        const fight = fought(run)
        const bosses = fight.units.filter(unit => unit.name.startsWith(GOLEM.name))
        expect(bosses).toHaveLength(1)
    })

    test("the boss of another floor → its own", () => {
        const run = startedRun(2)
        run.travel.enterFloor(FOREST_FLOOR.create(2))
        toBoss(run)
        const fight = fought(run)
        expect(fight.units.filter(unit => unit.name.startsWith(TROLL.name))).toHaveLength(1)
    })

    test("a floor of a higher level → its monsters have more hearts", () => {
        const heartsAt = (level: number) => {
            const run = startedRun(2)
            run.travel.enterFloor(new GoblinCave(level))
            walk(run, run.travel.next[0])
            const units = fought(run).units.filter(unit => unit.team === run.monstersTeam)
            return units[0].hearts.all.length
        }
        expect(heartsAt(3)).toBe(heartsAt(1) + 2)
    })

    test("a party of seven → every one in the arena, no two on the same spot", () => {
        const run = startedRun(3)
        for(let i = 0; i < 5; i++) run.tame(GOBLIN)
        const fight = fought(run)
        const party = fight.units.filter(unit => unit.team === run.heroesTeam)
        expect(party).toHaveLength(7)
        for(const unit of party){
            expect(unit.position.x).toBeGreaterThan(0)
            expect(unit.position.x).toBeLessThan(7)
            for(const other of party){
                if(other !== unit) expect(unit.position.distance(other.position)).toBeGreaterThan(0.7)
            }
        }
    })

    test("an ally → plays its battle as a bot, with no error", () => {
        const run = startedRun(5)
        run.tame(GOBLIN)
        const fight = fought(run)
        playOut(fight)
        expect(fight.events.filter(event => event.type === "error")).toEqual([])
    })
})

describe("Run party", () => {
    test("a kit hired twice → two names", () => {
        const run = startedRun(1)
        const first = run.hire(ARCHER_KIT)
        const second = run.hire(ARCHER_KIT)
        expect(first.name).not.toBe(second.name)
    })

    test("two merged → one in place of the first", () => {
        const run = startedRun(1)
        const [lancer, swordsman] = run.heroes
        const made = run.merge(lancer, swordsman)
        expect(run.heroes).toEqual([made])
    })

    test("one merged with itself → an error", () => {
        const run = startedRun(1)
        expect(() => run.merge(run.heroes[0], run.heroes[0])).toThrow()
    })

    test("more spent than held → an error, the gold kept", () => {
        const run = startedRun(1)
        expect(() => run.spend(run.gold + 1)).toThrow()
    })
})

describe("Run, its phases", () => {
    /** Kill every hero of a battle, then play the round out, so the party loses it. */
    function lose(run: Run, fight: Battle): void {
        for(const unit of fight.living){
            if(unit.team === run.heroesTeam) unit.hearts.damage(unit.life, DamageType.PHYSICAL, null)
        }
        fight.endPreparation()
        fight.playRound()
    }

    test("a whole fight → played by its methods alone, from the map to the halt of its place", () => {
        const run = startedRun(2)
        const { travel } = run
        const log: string[] = []
        run.phaseChanged.add(phase => log.push(phase))
        run.battleStarted.add(() => log.push("started"))
        travel.go(travel.next[0])
        travel.enter()
        run.startBattle()
        const fight = run.battle!
        fight.startRound()
        expect(run.battle).toBe(fight)
        win(run, fight)
        expect(run.phase).toBe("battle")
        run.endBattle()
        expect(run.battle).toBeNull()
        expect(log).toEqual(["battle", "started", "travel"])
        expect(travel.phase).toBe("visit")
    })

    test("a fight reached → no battle until it is started", () => {
        const run = startedRun(2)
        const { travel } = run
        const place: Place = { fight: BATTLE, halt: null, layer: 1, across: 0.5, next: [], exitTo: null, monsters: [GOBLIN] }
        travel.jump(place)
        travel.journey.link(place, place)
        travel.go(place)
        travel.enter()
        expect(run.battle).toBeNull()
        run.startBattle()
        expect(run.battle).not.toBeNull()
        expect(run.phase).toBe("battle")
    })

    test("a lost battle → the run over, told", () => {
        const run = startedRun(2)
        const defeats: Run[] = []
        run.defeated.add(each => defeats.push(each))
        lose(run, fought(run))
        run.endBattle()
        expect(run.phase).toBe("over")
        expect(defeats).toEqual([run])
    })

    test("a battle not over → cannot end", () => {
        const run = startedRun(2)
        fought(run)
        expect(() => run.endBattle()).toThrow()
    })

    test("a battle during a battle → refused", () => {
        const run = startedRun(2)
        run.startBattle()
        expect(() => run.startBattle()).toThrow()
    })

    test("back to the map → the visit left and the battle dropped", () => {
        const run = startedRun(2)
        run.travel.visit(CHEST_HALT)
        run.startBattle()
        run.backToMap()
        expect(run.battle).toBeNull()
        expect(run.travel.halt).toBeNull()
        expect(run.phase).toBe("travel")
    })
})
