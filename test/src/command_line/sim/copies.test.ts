import { describe, expect, test } from "vitest"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import { BATTLE } from "@game/core-src/games/mecard/sim/fight/fights"
import { checkSizes, fightsFinder, parseMatch, Roster, rowsOf, UsageError } from "@game/command_line/sim"
import type { Row, SourceDraw, SourceWorld } from "@game/command_line/sim"

// --- Fixture builders ---

const ROSTER = new Roster()
const WORLD: SourceWorld = {
    roster: ROSTER,
    fightsOf: fightsFinder({ level: 1, layers: { from: 0, to: 3 }, fightType: BATTLE, seed: 1 }),
}
const KITS = (ROSTER.group("kits") ?? []).map(kit => kit.name)
const MONSTERS = (ROSTER.group("monsters") ?? []).map(monster => monster.name)

function rows(text: string): Row[] {
    return rowsOf(parseMatch(text, ROSTER), WORLD)
}

/** What reading a description says when it refuses it. */
function refused(text: string): string {
    try {
        checkSizes(rows(text), WORLD)
    }
    catch(error){
        expect(error).toBeInstanceOf(UsageError)
        return (error as Error).message
    }
    throw new Error("The description was accepted.")
}

/** Who plays on each side of a row in a battle from a seed: the allies, then the foes, as the game resolves them. */
function battleOf(row: Row, seed = 1): { allies: string[], foes: string[] } {
    const taken = new Set<string>()
    const draw: SourceDraw = { ...WORLD, rng: new Rng(seed), taken, saved: new Map() }
    const side = (picks: Row["allies"]): string[] => picks.flatMap(({ source, index }) => {
        const members = source.get(index ?? 0, draw)
        for(const member of members) if(member.kind !== "monster") taken.add(`${member.kind}:${member.name}`)
        return members.map(member => member.name)
    })
    const allies = side(row.allies)
    return { allies, foes: side(row.foes) }
}

// --- Tests ---

describe("set: and get:", () => {
    test("a monster with a copy of itself → a row for each monster, each twice", () => {
        const found = rows("{set:m:monsters}+get:m/kit:Pêcheur")
        expect(found).toHaveLength(MONSTERS.length)
        found.forEach((row, index) => {
            expect(battleOf(row).allies).toEqual([MONSTERS[index], MONSTERS[index]])
            expect(battleOf(row).foes).toEqual(["Pêcheur"])
        })
    })

    test("a name kept by the allies → read by the foes, a kit against itself", () => {
        const found = rows("{set:k:kits}/get:k")
        expect(found).toHaveLength(KITS.length)
        found.forEach((row, index) => expect(battleOf(row)).toEqual({ allies: [KITS[index]], foes: [KITS[index]] }))
    })

    test("several names → each its own, as many as wanted", () => {
        const [row] = rows("set:a:random:kits+set:b:random:kits+get:b+get:a/kit:Mage")
        for(let seed = 1; seed <= 30; seed++){
            const [first, second, again, back] = battleOf(row, seed).allies
            expect(first, `seed ${seed}`).not.toBe(second)
            expect([again, back]).toEqual([second, first])
        }
    })

    test("random under a set → what is read is what is played, the kits already taken avoided", () => {
        const [row] = rows("kit:Mage+set:a:random:kits+get:a/kit:Archère")
        for(let seed = 1; seed <= 40; seed++){
            const [mage, kept, copy] = battleOf(row, seed).allies
            expect(mage).toBe("Mage")
            expect(kept, `seed ${seed}`).not.toBe("Mage")
            expect(copy).toBe(kept)
        }
    })

    test("a name → never shared from a battle to the next", () => {
        const [row] = rows("set:a:random:kits+get:a/kit:Mage")
        const draws = new Set(Array.from({ length: 30 }, (_, seed) => battleOf(row, seed).allies[0]))
        expect(draws.size).toBeGreaterThan(1)
    })

    test("what is wrong → told before any battle, with what to write", () => {
        expect(refused("get:x/kit:Mage")).toContain("aucun set:x avant")
        expect(refused("get:k/set:k:random:kits")).toContain("aucun set:k avant")
        expect(refused("set:a:random:kits+set:a:random:kits/kit:Mage")).toContain("set:a est déjà défini")
        expect(refused("kit:Mage/[set:a:kit:Mage,kit:Archère]")).toContain("set: dans une union")
        expect(refused("set:a b:random:kits/kit:Mage")).toContain("ne prend que des lettres")
        expect(refused("set:a/kit:Mage")).toContain("set:NOM:source attendu")
        expect(refused("get:/kit:Mage")).toContain("get:NOM attendu")
    })

    test("get inside a union → allowed, it reads what came before", () => {
        const found = rows("set:a:kit:Mage+{[get:a,kit:Archère]}/kit:Piquier")
        expect(found).toHaveLength(2)
        expect(battleOf(found[0]).allies).toEqual(["Mage", "Mage"])
        expect(battleOf(found[1]).allies).toEqual(["Mage", "Archère"])
    })
})

describe("*N", () => {
    test("a name → copies of the fighter", () => {
        expect(battleOf(rows("kit:Mage*2/monster:Gobelin*3")[0])).toEqual({
            allies: ["Mage", "Mage"], foes: ["Gobelin", "Gobelin", "Gobelin"],
        })
    })

    test("a walked group → each member in copies", () => {
        const found = rows("{monsters*2}/kit:Mage")
        expect(found).toHaveLength(MONSTERS.length)
        expect(battleOf(found[0]).allies).toEqual([MONSTERS[0], MONSTERS[0]])
    })

    test("a source read back, or drawn → copies of the same fighters, one draw", () => {
        expect(battleOf(rows("set:a:kit:Mage+get:a*2/kit:Archère")[0]).allies).toEqual(["Mage", "Mage", "Mage"])
        for(let seed = 1; seed <= 20; seed++){
            const [first, second] = battleOf(rows("random:kits*2/kit:Mage")[0], seed).allies
            expect(first).toBe(second)
        }
    })

    test("a number out of 1 to 7, or more than the arena holds → told", () => {
        expect(refused("kit:Mage*0/kit:Archère")).toContain("*N attend N de 1 à 7")
        expect(refused("kit:Mage*8/kit:Archère")).toContain("*N attend N de 1 à 7")
        expect(refused("kit:Mage*7/kit:Archère")).toContain("7 alliés, 6 au plus")
    })

    test("the elements of a definition in place → keep their own *", () => {
        const [row] = rows("kit(Duel=Estoc*3,Avancer,heart:rouge*4)/kit:Mage")
        const [duel] = row.allies[0].source.get(0, { ...WORLD, rng: new Rng(1), taken: new Set(), saved: new Map() })
        expect(duel.body().decks[0]).toHaveLength(4)
    })
})

describe("sum", () => {
    test("side by side → the fight n of each, the shortest starting again", () => {
        const found = rows("{sum(kits,monsters)}/kit:Mage")
        expect(found).toHaveLength(Math.max(KITS.length, MONSTERS.length))
        expect(battleOf(found[0]).allies).toEqual([KITS[0], MONSTERS[0]])
        expect(battleOf(found[MONSTERS.length]).allies).toEqual([KITS[MONSTERS.length], MONSTERS[0]])
    })

    test("a source of one fight → goes with all the others", () => {
        const found = rows("{sum(kits,monster:Gobelin)}/kit:Mage")
        expect(found).toHaveLength(KITS.length)
        found.forEach((row, index) => expect(battleOf(row).allies).toEqual([KITS[index], "Gobelin"]))
    })

    test("two lists written by hand → paired", () => {
        const found = rows("{sum([kit:Mage,kit:Archère],[monster:Gobelin,monster:Archer])}/kit:Piquier")
        expect(found.map(row => battleOf(row).allies)).toEqual([["Mage", "Gobelin"], ["Archère", "Archer"]])
    })

    test("the same source twice → the same fighter twice, unlike cross", () => {
        const found = rows("{sum(kits,kits)}/kit:Mage")
        expect(found).toHaveLength(KITS.length)
        found.forEach((row, index) => expect(battleOf(row).allies).toEqual([KITS[index], KITS[index]]))
        expect(rows("{cross(kits,kits)}/kit:Mage")).toHaveLength(KITS.length ** 2)
        for(let seed = 1; seed <= 20; seed++){
            const [first, second] = battleOf(rows("random:sum(kits,kits)/kit:Mage")[0], seed).allies
            expect(first).toBe(second)
        }
    })

    test("what is wrong → told", () => {
        expect(refused("sum(kits)/kit:Mage")).toContain("sum( ) attend au moins deux sources")
        expect(refused("{sum(kits,[])}/kit:Mage")).toContain("source vide")
    })
})
