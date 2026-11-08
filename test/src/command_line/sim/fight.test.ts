import { describe, expect, test } from "vitest"
import { fight, loadDefinitions, NO_DEFINITIONS, parseStrategy, Roster } from "@game/command_line/sim"
import type { Combatant, Definitions, FightSpec } from "@game/command_line/sim"

// --- Fixture builders ---

const ROSTER = new Roster(NO_DEFINITIONS)

/** A fighter of the roster as someone who takes part in a battle. */
function combatantOf(roster: Roster, name: string, strategy = "deck", hostile = false): Combatant {
    return { name, body: roster.one(name, "test").body(), strategy: parseStrategy(strategy, "test"), hostile }
}

/** A battle between two sides of the roster, over as soon as it can be. */
function specOf(
    roster: Roster, allies: string[], foes: string[], seed: number, overrides: Partial<FightSpec> = {},
): FightSpec {
    const deck = parseStrategy("deck", "test")
    return {
        allies: allies.map(name => combatantOf(roster, name)),
        foes: foes.map(name => combatantOf(roster, name)),
        mirrored: false,
        seed,
        maxRounds: 40,
        stall: 0,
        softWin: false,
        defaults: { allies: deck, foes: deck },
        ...overrides,
    }
}

/** The roster once the definitions are loaded. */
async function rosterOf(...definitions: string[]): Promise<Roster> {
    const loaded: Definitions = await loadDefinitions(definitions)
    return new Roster(loaded)
}

// --- Tests ---

describe("fight", () => {
    test("seeds → every battle ends in one of the four ways, within the round limit", () => {
        for(let seed = 1; seed <= 6; seed++){
            for(const mirrored of [false, true]){
                const result = fight(specOf(ROSTER, ["Lancier"], ["Mage"], seed, { mirrored }))
                expect(["win", "loss", "draw", "timeout"], `seed ${seed}`).toContain(result.outcome)
                expect(result.rounds).toBeLessThanOrEqual(40)
                if(result.outcome === "timeout") expect(result.rounds).toBe(40)
            }
        }
    })

    test("a limit of one round → at most one round played", () => {
        const result = fight(specOf(ROSTER, ["Lancier", "Mage", "Archère"], ["Bagarreur", "Assassin", "Épéiste"], 3, { maxRounds: 1 }))
        expect(result.rounds).toBeLessThanOrEqual(1)
    })

    test("units that only wait → blocked after the rounds of stall, a timeout well before the round limit", async() => {
        const roster = await rosterOf("Passif=Attendre*5")
        const result = fight(specOf(roster, ["Passif"], ["Passif"], 1, { stall: 5, maxRounds: 40 }))
        expect(result).toMatchObject({ outcome: "timeout", rounds: 5 })
    })

    test("the soft win → only a timeout can change, to a win or a loss, never a battle that ended", () => {
        for(let seed = 1; seed <= 8; seed++){
            const spec = specOf(ROSTER, ["Lancier"], ["Mage"], seed, { maxRounds: 3 })
            const hard = fight(spec)
            const soft = fight({ ...spec, softWin: true })
            expect(soft.rounds, `seed ${seed}`).toBe(hard.rounds)
            if(hard.outcome !== "timeout") expect(soft).toMatchObject({ outcome: hard.outcome, soft: false })
            else if(soft.soft) expect(["win", "loss"]).toContain(soft.outcome)
            else expect(soft.outcome).toBe("timeout")
            expect(hard.soft).toBe(false)
        }
    })

    test("the soft win → a tie where nobody lost life stays a timeout", async() => {
        const roster = await rosterOf("Passif=Attendre*5")
        const result = fight(specOf(roster, ["Passif"], ["Passif"], 1, { stall: 5, maxRounds: 40, softWin: true }))
        expect(result).toMatchObject({ outcome: "timeout", soft: false })
    })

    test("a stall of none → the battle goes on to the round limit", async() => {
        const roster = await rosterOf("Passif=Attendre*5")
        const result = fight(specOf(roster, ["Passif"], ["Passif"], 1, { stall: 0, maxRounds: 12 }))
        expect(result).toMatchObject({ outcome: "timeout", rounds: 12 })
    })

    test("the same seed → the same battle", () => {
        const first = fight(specOf(ROSTER, ["Lancier", "Mage"], ["Assassin", "Archère"], 11))
        const second = fight(specOf(ROSTER, ["Lancier", "Mage"], ["Assassin", "Archère"], 11))
        expect(second).toEqual(first)
    })

    test("a random and a lookahead player → battles that end, with no effect failing", () => {
        for(const strategy of ["random", "lookahead:3"]){
            const spec = specOf(ROSTER, ["Lancier"], ["Archère"], 4)
            const result = fight({ ...spec, allies: [combatantOf(ROSTER, "Lancier", strategy)] })
            expect(result.errors, strategy).toEqual([])
            expect(result.rounds).toBeGreaterThan(0)
        }
    })

    test("a kit carrying usables → plays them, and the same kit without them can differ", async() => {
        const roster = await rosterOf("Dopé=Avancer*3,Viser,Estoc*3,Esquive,usable:Cocaine*3")
        const body = roster.one("Dopé", "test").body()
        expect(body.usables).toHaveLength(3)
        const spec = specOf(roster, ["Dopé"], ["Mage"], 5)
        const result = fight(spec)
        expect(result.errors).toEqual([])
        expect(spec.allies[0].body.usables.some(carried => carried.spent)).toBe(true)
    })
})

describe("Fighter.body", () => {
    test("two calls → two bodies, hearts, decks and usables of their own", async() => {
        const roster = await rosterOf("Dopé=Avancer,Estoc,usable:Cocaine")
        const fighter = roster.one("Dopé", "test")
        const first = fighter.body()
        const second = fighter.body()
        expect(second.hearts).not.toBe(first.hearts)
        expect(second.decks[0]).not.toBe(first.decks[0])
        expect(second.usables[0]).not.toBe(first.usables[0])
        expect(second.usables[0].usable).toBe(first.usables[0].usable)
    })
})
