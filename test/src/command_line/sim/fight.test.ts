import { describe, expect, test } from "vitest"
import { UNLIMITED_CARDS } from "@game/core/mecard"
import { fight, kitFighter, parseDefinition, parseStrategy, Roster } from "@game/command_line/sim"
import type { Combatant, DefinedKit, Fighter, FightSpec } from "@game/command_line/sim"

// --- Fixture builders ---

const ROSTER = new Roster()

/** A fighter of the game. */
function fighterOf(name: string): Fighter {
    return ROSTER.one(name, "test")
}

/** A kit defined from its text, as a description defines one in place. */
function kitOf(text: string): Fighter {
    const made = parseDefinition(text, "test") as DefinedKit
    return kitFighter(made.kit, made.hearts, made.bonus, true)
}

/** A fighter as someone who takes part in a battle. */
function combatantOf(fighter: Fighter, strategy = "deck", hostile = false): Combatant {
    return { name: fighter.name, body: fighter.body(), strategy: parseStrategy(strategy, "test"), hostile }
}

/** A battle between two sides, over as soon as it can be. */
function specOf(
    allies: Fighter[], foes: Fighter[], seed: number, overrides: Partial<FightSpec> = {},
): FightSpec {
    const deck = parseStrategy("deck", "test")
    return {
        allies: allies.map(each => combatantOf(each)),
        foes: foes.map(each => combatantOf(each)),
        mirrored: false,
        seed,
        maxRounds: 40,
        stall: 0,
        softWin: false,
        defaults: { allies: deck, foes: deck },
        ...overrides,
    }
}

const PIQUIER = fighterOf("Piquier")
const MAGE = fighterOf("Mage")
const ARCHERE = fighterOf("Archère")

// --- Tests ---

describe("fight", () => {
    test("seeds → every battle ends in one of the four ways, within the round limit", () => {
        for(let seed = 1; seed <= 6; seed++){
            for(const mirrored of [false, true]){
                const result = fight(specOf([PIQUIER], [MAGE], seed, { mirrored }))
                expect(["win", "loss", "draw", "timeout"], `seed ${seed}`).toContain(result.outcome)
                expect(result.rounds).toBeLessThanOrEqual(40)
                if(result.outcome === "timeout") expect(result.rounds).toBe(40)
            }
        }
    })

    test("a limit of one round → at most one round played", () => {
        const allies = [PIQUIER, MAGE, ARCHERE]
        const foes = ["Bagarreur", "Assassin", "Duelliste"].map(fighterOf)
        const result = fight(specOf(allies, foes, 3, { maxRounds: 1 }))
        expect(result.rounds).toBeLessThanOrEqual(1)
    })

    test("units that only wait → blocked after the rounds of stall, a timeout well before the round limit", () => {
        const passive = kitOf("Passif=Attendre*5")
        const result = fight(specOf([passive], [passive], 1, { stall: 5, maxRounds: 40 }))
        expect(result).toMatchObject({ outcome: "timeout", rounds: 5 })
    })

    test("the soft win → only a timeout can change, to a win or a loss, never a battle that ended", () => {
        for(let seed = 1; seed <= 8; seed++){
            const spec = specOf([PIQUIER], [MAGE], seed, { maxRounds: 3 })
            const hard = fight(spec)
            const soft = fight({ ...spec, softWin: true })
            expect(soft.rounds, `seed ${seed}`).toBe(hard.rounds)
            if(hard.outcome !== "timeout") expect(soft).toMatchObject({ outcome: hard.outcome, soft: false })
            else if(soft.soft) expect(["win", "loss"]).toContain(soft.outcome)
            else expect(soft.outcome).toBe("timeout")
            expect(hard.soft).toBe(false)
        }
    })

    test("the soft win → a tie where nobody lost life stays a timeout", () => {
        const passive = kitOf("Passif=Attendre*5")
        const result = fight(specOf([passive], [passive], 1, { stall: 5, maxRounds: 40, softWin: true }))
        expect(result).toMatchObject({ outcome: "timeout", soft: false })
    })

    test("a stall of none → the battle goes on to the round limit", () => {
        const passive = kitOf("Passif=Attendre*5")
        const result = fight(specOf([passive], [passive], 1, { stall: 0, maxRounds: 12 }))
        expect(result).toMatchObject({ outcome: "timeout", rounds: 12 })
    })

    test("the same seed → the same battle", () => {
        const first = fight(specOf([PIQUIER, MAGE], [fighterOf("Assassin"), ARCHERE], 11))
        const second = fight(specOf([PIQUIER, MAGE], [fighterOf("Assassin"), ARCHERE], 11))
        expect(second).toEqual(first)
    })

    test("a random and a smart3 player → battles that end, with no effect failing", () => {
        for(const strategy of ["random", "smart3:3"]){
            const spec = specOf([PIQUIER], [ARCHERE], 4)
            const result = fight({ ...spec, allies: [combatantOf(PIQUIER, strategy)] })
            expect(result.errors, strategy).toEqual([])
            expect(result.rounds).toBeGreaterThan(0)
        }
    })

    test("a kit carrying usables → plays them, and the same kit without them can differ", () => {
        const doped = kitOf("Dopé=Avancer*3,Viser,Estoc*3,Esquive,usable:Cocaine*3")
        expect(doped.body().usables).toHaveLength(3)
        const spec = specOf([doped], [MAGE], 5)
        const result = fight(spec)
        expect(result.errors).toEqual([])
        expect(spec.allies[0].body.usables.some(carried => carried.spent)).toBe(true)
    })
})

describe("smart3 and the usables", () => {
    test("a staff with no ritual to draw from → never used, whatever the seed", () => {
        const sorcerer = kitOf("Sorcier=Avancer*3,Viser,Estoc*3,Esquive,usable:Bâton de Sorcier")
        for(let seed = 1; seed <= 4; seed++){
            const spec = specOf([sorcerer], [ARCHERE], seed, { maxRounds: 10 })
            const allies = [combatantOf(sorcerer, "smart3:2")]
            const result = fight({ ...spec, allies })
            expect(result.errors).toEqual([])
            expect(allies[0].body.usables.some(carried => carried.spent), `seed ${seed}`).toBe(false)
        }
    })

    test("smart3 → chooses its usables, smart2 leaves them to the fight", () => {
        expect(parseStrategy("smart3", "test").choosesUsables).toBe(true)
        expect(parseStrategy("smart3-usables", "test").choosesUsables).toBeFalsy()
        expect(parseStrategy("smart2", "test").choosesUsables).toBeFalsy()
    })
})

describe("Fighter.body", () => {
    test("two calls → two bodies, hearts, decks and usables of their own", () => {
        const fighter = kitOf("Dopé=Avancer,Estoc,usable:Cocaine")
        const first = fighter.body()
        const second = fighter.body()
        expect(second.hearts).not.toBe(first.hearts)
        expect(second.decks[0]).not.toBe(first.decks[0])
        expect(second.usables[0]).not.toBe(first.usables[0])
        expect(second.usables[0].usable).toBe(first.usables[0].usable)
    })

    test("a kit → plays the step and the turns unlimited, as a hero of the game; a monster → none", () => {
        expect(kitOf("Dopé=Avancer,Estoc").body().unlimited).toEqual(UNLIMITED_CARDS)
        for(const monster of ROSTER.group("monsters")!) expect(monster.body().unlimited).toEqual([])
    })
})
