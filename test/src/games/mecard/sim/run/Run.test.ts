import { describe, expect, test } from "vitest"
import {
    ARCHER_KIT, CaveFloor, CAVE_FLOOR, FOREST_FLOOR, GOBLIN, GOLEM, HELL_FLOOR, LAYERS, MINE_FLOOR, planFor,
    RED_HEART, Run, TROLL,
} from "@game/core/mecard"
import type { Battle, Monster, Place, PlaceKind } from "@game/core/mecard"
import { ScriptedPlayer } from "../../../../fixtures/haltFixtures"

// --- Fixture builders ---

/** Play a battle with bots on every side until it ends, or a long while. */
function playOut(fight: Battle): void {
    for(let round = 0; round < 60 && fight.phase !== "over"; round++){
        if(fight.waiting) fight.startRound()
        for(const fighter of fight.living) fight.commit(fighter, planFor(fighter))
        fight.endPreparation()
        fight.playRound()
    }
}

/** Kill every monster of a battle, then play the round out, so the party wins it. */
function win(run: Run, fight: Battle): void {
    for(const unit of fight.living) if(unit.team !== run.heroesTeam) unit.hearts.damage(unit.life, "physical", null)
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

/** Stand a party on a new place of a kind. */
function standOn(run: Run, kind: PlaceKind): Place {
    const place: Place = { kind, layer: 1, across: 0.5, next: [], exitTo: null, monsters: [] }
    run.travel.jump(place)
    return place
}

// --- Tests ---

describe("Run", () => {
    test("bots on both sides → the battle ends, with no error", () => {
        const run = new Run(1)
        const fight = fought(run)
        playOut(fight)
        expect(fight.events.filter(event => event.type === "error")).toEqual([])
        expect(fight.phase).toBe("over")
        run.endBattle()
        expect(run.rewards).toHaveLength(3)
    })
})

describe("Run.travel", () => {
    test("a place of the first layer, then one it leads to → the party goes deeper", () => {
        const run = new Run(1)
        const first = run.travel.next[0]
        walk(run, first)
        expect(run.travel.place).toBe(first)
        expect(run.travel.depth).toBe(1)
        walk(run, first.next[0])
        expect(run.travel.depth).toBe(2)
    })

    test("a place not reachable → an error", () => {
        const run = new Run(1)
        expect(() => walk(run, run.travel.journey.layers[2][0])).toThrow()
    })

    test("a new run → the first level of the cave", () => {
        const { floor } = new Run(1).travel
        expect(floor.type).toBe(CAVE_FLOOR)
        expect(floor.level).toBe(1)
    })

    test("entering a floor → it, a new map, the party before its first layer", () => {
        const run = new Run(1)
        const journey = run.travel.journey
        const forest = FOREST_FLOOR.create(2)
        walk(run, run.travel.next[0])
        run.travel.enterFloor(forest)
        expect(run.travel.floor).toBe(forest)
        expect(run.travel.journey).not.toBe(journey)
        expect(run.travel.place).toBeNull()
    })

    test("from the boss → its exits, none more deep", () => {
        const run = new Run(1)
        toBoss(run)
        const { depth } = run.travel
        expect(run.travel.next.map(place => place.kind)).toEqual(["exit", "exit"])
        walk(run, run.travel.next[0])
        expect(run.travel.depth).toBe(depth)
    })

    test("an exit cancelled → the other one open, and it can be taken", () => {
        const run = new Run(1)
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
        const run = new Run(1)
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
        const run = new Run(1)
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
        const run = new Run(1)
        const place = standOn(run, "chest")
        expect(run.travel.haltOf(place)).toBe(run.travel.haltOf(place))
    })

    test("two places of a kind → two halts", () => {
        const run = new Run(1)
        expect(run.travel.haltOf(standOn(run, "chest"))).not.toBe(run.travel.haltOf(standOn(run, "chest")))
    })

    test("a fight → an error", () => {
        const run = new Run(1)
        expect(() => run.travel.haltOf(standOn(run, "battle"))).toThrow()
    })

    test("another floor → new halts", () => {
        const run = new Run(1)
        const place = standOn(run, "chest")
        const halt = run.travel.haltOf(place)
        run.travel.enterFloor(FOREST_FLOOR.create(2))
        expect(run.travel.haltOf(place)).not.toBe(halt)
    })
})

describe("Run.returnable", () => {
    test("nowhere yet → none", () => {
        expect(new Run(1).travel.returnable).toBeNull()
    })

    test("a halt never entered → none, nothing drawn", () => {
        const run = new Run(1)
        const twin = new Run(1)
        standOn(run, "chest")
        expect(run.travel.returnable).toBeNull()
        expect(run.rng.next()).toBe(twin.rng.next())
    })

    test("a halt left with the run as it was → its place", () => {
        const run = new Run(1)
        const place = standOn(run, "chest")
        run.travel.haltOf(place).start(new ScriptedPlayer(run))
        expect(run.travel.returnable).toBe(place)
    })

    test("a halt that changed the run → none", () => {
        const run = new Run(1)
        const halt = run.travel.haltOf(standOn(run, "chest"))
        const player = new ScriptedPlayer(run)
        halt.start(player)
        player.play()
        expect(halt.hasImpact).toBe(true)
        expect(run.travel.returnable).toBeNull()
    })

    test("a place gone from → none", () => {
        const run = new Run(1)
        run.travel.haltOf(standOn(run, "chest"))
        standOn(run, "shop")
        expect(run.travel.returnable).toBeNull()
    })
})

describe("Run fights", () => {
    test("a won battle → gold", () => {
        const run = new Run(2)
        const gold = run.gold
        const fight = fought(run)
        win(run, fight)
        run.endBattle()
        expect(run.phase).toBe("rewards")
        expect(run.gold).toBeGreaterThan(gold)
    })

    test("the boss → leads its monsters", () => {
        const run = new Run(2)
        toBoss(run)
        expect(run.fight).toBe("boss")
        const fight = fought(run)
        const bosses = fight.units.filter(unit => unit.name.startsWith(GOLEM.name))
        expect(bosses).toHaveLength(1)
    })

    test("the boss of another floor → its own", () => {
        const run = new Run(2)
        run.travel.enterFloor(FOREST_FLOOR.create(2))
        toBoss(run)
        const fight = fought(run)
        expect(fight.units.filter(unit => unit.name.startsWith(TROLL.name))).toHaveLength(1)
    })

    test("a floor of a higher level → its monsters have more hearts", () => {
        const heartsAt = (level: number) => {
            const run = new Run(2)
            run.travel.enterFloor(new GoblinCave(level))
            walk(run, run.travel.next[0])
            const units = fought(run).units.filter(unit => unit.team === run.monstersTeam)
            return units[0].hearts.all.length
        }
        expect(heartsAt(3)).toBe(heartsAt(1) + 2)
    })

    test("a party of seven → every one in the arena, no two on the same spot", () => {
        const run = new Run(3)
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
        const run = new Run(5)
        run.tame(GOBLIN)
        const fight = fought(run)
        playOut(fight)
        expect(fight.events.filter(event => event.type === "error")).toEqual([])
    })
})

describe("Run party", () => {
    test("a kit hired twice → two names", () => {
        const run = new Run(1)
        const first = run.hire(ARCHER_KIT)
        const second = run.hire(ARCHER_KIT)
        expect(first.name).not.toBe(second.name)
    })

    test("two merged → one in place of the first", () => {
        const run = new Run(1)
        const [lancer, swordsman] = run.heroes
        const made = run.merge(lancer, swordsman)
        expect(run.heroes).toEqual([made])
    })

    test("one merged with itself → an error", () => {
        const run = new Run(1)
        expect(() => run.merge(run.heroes[0], run.heroes[0])).toThrow()
    })

    test("more spent than held → an error, the gold kept", () => {
        const run = new Run(1)
        expect(() => run.spend(run.gold + 1)).toThrow()
    })
})

describe("Run, its phases", () => {
    /** Kill every hero of a battle, then play the round out, so the party loses it. */
    function lose(run: Run, fight: Battle): void {
        for(const unit of fight.living) if(unit.team === run.heroesTeam) unit.hearts.damage(unit.life, "physical", null)
        fight.endPreparation()
        fight.playRound()
    }

    test("a whole fight → played by its methods alone, from the map back to the map", () => {
        const run = new Run(2)
        const { travel } = run
        const log: string[] = []
        run.phaseChanged.add(phase => log.push(phase))
        run.battleStarted.add(() => log.push("started"))
        run.rewardsOffered.add(rewards => log.push(`${rewards.length} rewards`))
        run.rewardClaimed.add(() => log.push("claimed"))
        travel.jump(travel.journey.layers[0][0])
        const fight = fought(run)
        expect(run.battle).toBe(fight)
        win(run, fight)
        expect(run.phase).toBe("battle")
        run.endBattle()
        expect(run.battle).toBeNull()
        const [reward] = run.rewards
        run.claim(reward, run.heroes[0])
        expect(log).toEqual(["battle", "started", "rewards", "3 rewards", "claimed", "travel"])
        expect(run.rewards).toEqual([])
        expect(travel.phase).toBe("map")
    })

    test("a fight reached → no battle until it is started", () => {
        const run = new Run(2)
        const { travel } = run
        const place: Place = { kind: "battle", layer: 1, across: 0.5, next: [], exitTo: null, monsters: [GOBLIN] }
        travel.jump(place)
        travel.journey.link(place, place)
        travel.go(place)
        travel.enter()
        expect(run.battle).toBeNull()
        run.startBattle()
        expect(run.battle).not.toBeNull()
        expect(run.phase).toBe("battle")
    })

    test("a lost battle → the run over, told, with no reward", () => {
        const run = new Run(2)
        const defeats: Run[] = []
        run.defeated.add(each => defeats.push(each))
        lose(run, fought(run))
        run.endBattle()
        expect(run.phase).toBe("over")
        expect(defeats).toEqual([run])
        expect(run.rewards).toEqual([])
    })

    test("a battle not over → cannot end", () => {
        const run = new Run(2)
        fought(run)
        expect(() => run.endBattle()).toThrow()
    })

    test("a battle during a battle → refused", () => {
        const run = new Run(2)
        run.startBattle()
        expect(() => run.startBattle()).toThrow()
    })

    test("out of the rewards → nothing to claim or skip", () => {
        const run = new Run(2)
        expect(() => run.skipReward()).toThrow()
        expect(() => run.claim({ kind: "heart", loot: { heart: RED_HEART, count: 2 } }, run.heroes[0])).toThrow()
    })

    test("a reward not offered → refused", () => {
        const run = new Run(2)
        win(run, fought(run))
        run.endBattle()
        expect(() => run.claim({ kind: "heart", loot: { heart: RED_HEART, count: 2 } }, run.heroes[0])).toThrow()
    })

    test("a reward skipped → back on the map, nothing gained", () => {
        const run = new Run(2)
        win(run, fought(run))
        run.endBattle()
        run.skipReward()
        expect(run.phase).toBe("travel")
    })

    test("back to the map → the visit left and the battle dropped", () => {
        const run = new Run(2)
        run.travel.visit("chest")
        run.startBattle()
        run.backToMap()
        expect(run.battle).toBeNull()
        expect(run.travel.halt).toBeNull()
        expect(run.phase).toBe("travel")
    })
})
