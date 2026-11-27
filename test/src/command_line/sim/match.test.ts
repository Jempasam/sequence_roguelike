import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import { ALL_FLOORS } from "@game/core-src/games/mecard/sim/catalog/floors"
import { ALL_KITS } from "@game/core-src/games/mecard/sim/catalog/kits"
import { BATTLE } from "@game/core-src/games/mecard/sim/fight/fights"
import { checkSizes, fightsFinder, parseMatch, Roster, rowsOf, UsageError } from "@game/command_line/sim"
import type { Row, SourceDraw, SourceWorld } from "@game/command_line/sim"

// --- Fixture builders ---

const ROSTER = new Roster()
const FIGHTS = fightsFinder({ level: 1, layers: { from: 0, to: 3 }, fightType: BATTLE, seed: 1 })
const WORLD: SourceWorld = { roster: ROSTER, fightsOf: FIGHTS }

/** The rows a description gives. */
function rows(text: string): Row[] {
    return rowsOf(parseMatch(text, ROSTER), WORLD)
}

/** What reading a description says when it refuses it. */
function refused(text: string): string {
    try {
        rows(text)
    }
    catch(error){
        expect(error).toBeInstanceOf(UsageError)
        return (error as Error).message
    }
    throw new Error("The description was accepted.")
}

/** The names of the members a row's side plays, the draws coming from a seed. */
function membersOf(picks: Row["allies"], seed = 1): string[] {
    const taken = new Set<string>()
    const draw: SourceDraw = { ...WORLD, rng: new Rng(seed), taken, saved: new Map() }
    return picks.flatMap(({ source, index }) => {
        const members = source.get(index ?? 0, draw)
        for(const member of members) taken.add(`${member.kind}:${member.name}`)
        return members.map(member => member.name)
    })
}

const MONSTERS = ROSTER.group("monsters") ?? []

// --- Tests ---

describe("rows", () => {
    test("no braces → a single row, labelled as written", () => {
        const found = rows("kit:Mage/kit:Archère")
        expect(found).toHaveLength(1)
        expect(found[0].label).toBe("kit:Mage/kit:Archère")
    })

    test("braces on a group → a row for each of its members, named in the label", () => {
        const found = rows("{kits}/kit:Mage")
        expect(found).toHaveLength(ALL_KITS.length)
        expect(found.map(row => row.label)).toEqual(ALL_KITS.map(kit => `${kit.name}/kit:Mage`))
    })

    test("several braces → crossed, whatever the side they are on", () => {
        expect(rows("{kits}/{monsters}")).toHaveLength(ALL_KITS.length * MONSTERS.length)
        expect(rows("{kits}+{monsters}/kit:Mage")).toHaveLength(ALL_KITS.length * MONSTERS.length)
    })

    test("the rows of a description → the same whatever the others are, so a row keeps its seed", () => {
        const alone = rows("{kit:Mage}/random:monsters")
        const among = rows("{kits}/random:monsters").find(row => row.label.startsWith("Mage"))
        expect(among?.key).toBe(alone[0].key)
    })

    test("a source of several fights without braces nor random → refused, told what to write", () => {
        expect(refused("kits/kit:Mage")).toContain("l'entourer de { }")
        expect(refused("kits/kit:Mage")).toContain("random:kits")
    })

    test("braces inside a source → refused", () => {
        expect(refused("{kits}/random:{monsters}")).toContain("n'entoure qu'une source de la racine")
        expect(refused("{kits}/[{kits},kit:Mage]")).toContain("n'entoure qu'une source de la racine")
        expect(refused("{{kits}}/kit:Mage")).toContain("des accolades dans des accolades")
    })

    test("a description without foes, or with two slashes → refused", () => {
        expect(refused("kit:Mage")).toContain("alliés/adversaires")
        expect(refused("kit:Mage/kit:Archère/kit:Mage")).toContain("un seul /")
        expect(refused("kit:Mage/")).toContain("le côté des adversaires est vide")
    })

    test("more members than the arena holds → refused", () => {
        const found = rows("kit:Mage+kit:Archère+kit:Piquier+kit:Duelliste+kit:Berserker+kit:Assassin+kit:Chasseur/kit:Mage")
        expect(() => checkSizes(found, WORLD)).toThrow("7 alliés, 6 au plus")
    })

    test("an unknown name → told with the names that are close", () => {
        expect(refused("kit:Mague/kit:Mage")).toContain("Vouliez-vous « Mage »")
        expect(refused("{kits}/fight:caev")).toContain("Vouliez-vous « cave »")
    })
})

describe("sources", () => {
    test("a named fighter, with copies → one fight, its members repeated", () => {
        const [row] = rows("kit:Mage/monster:Gobelin*3")
        expect(membersOf(row.foes)).toEqual(["Gobelin", "Gobelin", "Gobelin"])
        expect(row.foes[0].source.count(WORLD)).toBe(1)
    })

    test("a group → its members one by one", () => {
        const [row] = rows("kit:Mage/{kits}")
        expect(row.foes[0].source.count(WORLD)).toBe(ALL_KITS.length)
        expect(row.foes[0].index).toBe(0)
    })

    test("random → one fight, the same for the same seed, others for others", () => {
        const [row] = rows("kit:Mage/random:monsters")
        expect(row.foes[0].source.count(WORLD)).toBe(1)
        expect(membersOf(row.foes, 3)).toEqual(membersOf(row.foes, 3))
        const seen = new Set(Array.from({ length: 30 }, (_, seed) => membersOf(row.foes, seed).join()))
        expect(seen.size).toBeGreaterThan(1)
    })

    test("random kits twice in a team → never the same kit, nor one already taken", () => {
        const [row] = rows("kit:Mage+random:kits+random:kits/kit:Archère")
        for(let seed = 1; seed <= 40; seed++){
            const names = membersOf(row.allies, seed)
            expect(new Set(names).size, `seed ${seed}`).toBe(3)
        }
    })

    test("cross → every pair, the members of the first then of the second", () => {
        const [row] = rows("kit:Mage/{cross([kit:Archère,kit:Piquier],[monster:Gobelin,monster:Archer])}")
        expect(row.foes[0].source.count(WORLD)).toBe(4)
        const pairs = Array.from({ length: 4 }, (_, index) => membersOf([{ source: row.foes[0].source, index }]))
        expect(pairs).toEqual([["Archère", "Gobelin"], ["Archère", "Archer"], ["Piquier", "Gobelin"], ["Piquier", "Archer"]])
    })

    test("a union → the fights of the first source, then of the second", () => {
        const found = rows("kit:Mage/{[kit:Archère,kit:Piquier,kit:Duelliste]}")
        expect(found.map(row => row.label)).toEqual(["kit:Mage/Archère", "kit:Mage/Piquier", "kit:Mage/Duelliste"])
    })

    test("random on a cross → one pair at random", () => {
        const [row] = rows("kit:Mage/random:cross(kits,monsters)")
        expect(membersOf(row.foes, 2)).toHaveLength(2)
        expect(row.foes[0].source.count(WORLD)).toBe(1)
    })

    test("fight: → a whole fight a source, biome: → a monster a source", () => {
        const cave = ALL_FLOORS.find(floor => floor.name === "Grotte")
        if(!cave) throw new Error("No cave floor.")
        const fights = FIGHTS(cave)
        const found = rows("kit:Mage/{fight:cave}")
        expect(found).toHaveLength(fights.length)
        expect(membersOf(found[0].foes)).toEqual(fights[0].map(monster => monster.name))
        const monsters = rows("kit:Mage/{biome:cave}")
        expect(monsters.length).toBeGreaterThan(0)
        expect(membersOf(monsters[0].foes)).toHaveLength(1)
    })

    test("encounter: → the monsters named, with counts, kits refused", () => {
        const [row] = rows("kit:Mage/encounter:Gobelin*2+Archer")
        expect(membersOf(row.foes)).toEqual(["Gobelin", "Gobelin", "Archer"])
        expect(refused("kit:Mage/encounter:Mage")).toContain("Nom inconnu « Mage » (monstre)")
    })
})

describe("defined in place", () => {
    test("a kit with a shuffled deck → a fighter of the kit with those cards", () => {
        const [row] = rows("kit(Duel=Avancer*2,Estoc*3,heart:rouge*4)/kit:Mage")
        const [member] = row.allies[0].source.get(0, { ...WORLD, rng: new Rng(1), taken: new Set(), saved: new Map() })
        expect(member).toMatchObject({ name: "Duel", kind: "kit", custom: true })
        expect(member.body().hearts).toHaveLength(4)
    })

    test("a monster with a sorted deck → its size is required, and its deck is kept in order", () => {
        expect(refused("kit:Mage/monster(Brut=draw:2,heart:rouge*3,Estoc,Esquive)")).toContain("demande size:N")
        const [row] = rows("kit:Mage/monster(Brut=size:2,draw:2,heart:rouge*3,Estoc,Esquive)")
        const [member] = row.foes[0].source.get(0, { ...WORLD, rng: new Rng(1), taken: new Set(), saved: new Map() })
        expect(member.monster).toMatchObject({ name: "Brut", size: 2 })
        expect(member.monster?.cards.map(card => card.name)).toEqual(["Estoc", "Esquive"])
    })

    test("a kit written as a monster, or the other way → told", () => {
        expect(refused("kit(X=Estoc,draw:2,heart:rouge*3)/kit:Mage")).toContain("utiliser monster(…)")
        expect(refused("kit:Mage/monster(Duel=Estoc,Avancer)")).toContain("définit un monstre")
    })

    test("commas inside the parentheses → not the separators of the description", () => {
        const [row] = rows("kit(Duel=Estoc,Avancer)+kit:Mage/kit:Archère")
        expect(membersOf(row.allies)).toEqual(["Duel", "Mage"])
    })
})

describe("files", () => {
    test("a source in a file → read on one line, without comments nor blanks", () => {
        const folder = mkdtempSync(join(tmpdir(), "sim-match-"))
        const file = join(folder, "foes.txt")
        writeFileSync(file, "# les adversaires\n[\n  kit:Archère,   # un\n  kit:Piquier\n]\n", "utf8")
        const found = rows(`kit:Mage/{@${file}}`)
        expect(found.map(row => row.label)).toEqual(["kit:Mage/Archère", "kit:Mage/Piquier"])
    })

    test("a name with spaces → found once the blanks are gone", () => {
        const folder = mkdtempSync(join(tmpdir(), "sim-match-"))
        const file = join(folder, "foe.txt")
        writeFileSync(file, "monster:Gobelin\n  cavalier\n", "utf8")
        expect(membersOf(rows(`kit:Mage/@${file}`)[0].foes)).toEqual(["Gobelin cavalier"])
    })

    test("a missing file, or an empty one → told", () => {
        expect(refused("kit:Mage/@nulle-part.txt")).toContain("introuvable")
        const folder = mkdtempSync(join(tmpdir(), "sim-match-"))
        const file = join(folder, "empty.txt")
        writeFileSync(file, "# rien\n", "utf8")
        expect(refused(`kit:Mage/@${file}`)).toContain("aucune source")
    })
})
