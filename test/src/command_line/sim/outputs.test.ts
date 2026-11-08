import { describe, expect, test } from "vitest"
import { ALL_KITS, GOBLIN } from "@game/core/mecard"
import { loadDefinitions, NO_DEFINITIONS, parseOutputs, Roster, UsageError } from "@game/command_line/sim"
import type { OutputColumn } from "@game/command_line/sim"

// --- Fixture builders ---

const ROSTER = new Roster(NO_DEFINITIONS)

/** The columns an `--out` gives. */
function columns(...items: string[]): OutputColumn[] {
    return parseOutputs(items, ROSTER)
}

/** What parsing an `--out` says when it refuses it. */
function refused(...items: string[]): string {
    try {
        parseOutputs(items, ROSTER)
    }
    catch(error){
        expect(error).toBeInstanceOf(UsageError)
        return (error as Error).message
    }
    throw new Error("The outputs were accepted.")
}

// --- Tests ---

describe("parseOutputs", () => {
    test("a team alone → against the monsters", () => {
        const [solo, team] = columns("solo", "team")
        expect(solo.atoms).toHaveLength(1)
        expect(solo.atoms[0]).toMatchObject({ team: { kind: "size", size: 1 }, opponent: { kind: "monsters" } })
        expect(team.atoms[0].team).toEqual({ kind: "size", size: 3 })
    })

    test("team:N → a team of N, from 1 to 6", () => {
        expect(columns("team:2")[0].atoms[0].team).toEqual({ kind: "size", size: 2 })
        expect(refused("team:7")).toContain("team:N attend N de 1 à 6")
        expect(refused("team:x")).toContain("team:N attend N")
    })

    test("an opponent alone → met by a team of one and a team of three, pooled", () => {
        const [cave] = columns("cave")
        expect(cave.atoms.map(atom => atom.team)).toEqual([{ kind: "size", size: 1 }, { kind: "size", size: 3 }])
        expect(cave.atoms[0].opponent).toMatchObject({ kind: "biome", floor: { name: "Grotte" } })
    })

    test("a biome → named in English or in French", () => {
        expect(columns("forest")[0].atoms[0].opponent).toMatchObject({ floor: { name: "Forêt" } })
        expect(columns("enfer")[0].atoms[0].opponent).toMatchObject({ floor: { name: "Enfer" } })
        expect(columns("mine")[0].atoms[0].opponent).toMatchObject({ floor: { name: "Mine" } })
    })

    test("team/opponent → one battle kind, the label as written", () => {
        const [column] = columns("team:2/kits")
        expect(column.label).toBe("team:2/kits")
        expect(column.atoms).toHaveLength(1)
        expect(column.atoms[0]).toMatchObject({ team: { kind: "size", size: 2 }, opponent: { kind: "kits", pool: "all" } })
    })

    test("with: → the partners named, and a group → a column for each of its members", () => {
        expect(columns("with:Mage")[0].atoms[0].team).toMatchObject({ kind: "with", partners: [{ name: "Mage" }] })
        expect(columns("with:Mage+Archère")[0].atoms[0].team).toMatchObject({ partners: [{ name: "Mage" }, { name: "Archère" }] })
        const everyone = columns("with:kits")
        expect(everyone.map(column => column.label)).toEqual(ALL_KITS.map(kit => `with:${kit.name}`))
        expect(columns("with:kits/cave")).toHaveLength(ALL_KITS.length)
    })

    test("kit: → a fixed opponent, and a group → a column for each kit", () => {
        expect(columns("solo/kit:Mage")[0].atoms[0].opponent).toMatchObject({ kind: "fixed", fighters: [{ name: "Mage" }] })
        expect(columns("kit:kits").map(column => column.label)).toEqual(ALL_KITS.map(kit => `kit:${kit.name}`))
    })

    test("encounter: → the monsters named, with counts", () => {
        const [column] = columns("solo/encounter:Gobelin*2+Archer")
        expect(column.atoms[0].opponent).toMatchObject({ kind: "encounter", monsters: [{ name: "Gobelin" }, { name: "Gobelin" }, { name: "Archer" }] })
        expect(column.atoms[0].opponent).toMatchObject({ monsters: [GOBLIN, GOBLIN, expect.anything()] })
    })

    test("total → pools the other columns, wherever it stands", () => {
        const all = columns("solo", "total", "cave")
        expect(all.map(column => column.label)).toEqual(["solo", "total", "cave"])
        expect(all[1]).toMatchObject({ total: true, atoms: [] })
    })

    test("the same atom named in two columns → the two share its key", () => {
        const [first, second] = columns("solo", "solo/monsters")
        expect(first.atoms[0].key).toBe(second.atoms[0].key)
    })

    test("what is wrong → told with the output and what exists", () => {
        expect(refused("caev")).toContain("« caev »")
        expect(refused("caev")).toContain("Vouliez-vous « cave »")
        expect(refused("team/caev")).toContain("« caev » (après le /) n'est pas un adversaire")
        expect(refused("kits/cave")).toContain("« kits » (avant le /) n'est pas une équipe")
        expect(refused("total")).toContain("total ne pool rien tout seul")
        expect(refused("solo", "solo")).toContain("« solo » est demandé deux fois")
        expect(refused("kits:custom")).toContain("aucun kit défini avec --def")
        expect(refused("kits:best")).toContain("kits:custom ou kits:official attendu")
        expect(refused("with:")).toContain("with: attend un combattant ou un groupe")
        expect(refused("with:Mage+Archère+Lancier+Épéiste+Bagarreur+Assassin")).toContain("6 combattants au plus")
        expect(refused("solo/encounter:Mage")).toContain("est un kit, pas un monstre")
        expect(refused("solo/encounter:Gobelin*9")).toContain("de 1 à 7 monstres, reçu 9")
        expect(refused("with:Mague")).toContain("--out : Nom inconnu « Mague » (combattant). Vouliez-vous « Mage » ?")
    })

    test("kits defined → named in kits:custom, and a group counts them", async() => {
        const roster = new Roster(await loadDefinitions(["Neuf=Avancer,Estoc"]))
        const [column] = parseOutputs(["solo/kits:custom"], roster)
        expect(column.atoms[0].opponent).toEqual({ kind: "kits", pool: "custom" })
        expect(parseOutputs(["kit:kits"], roster)).toHaveLength(ALL_KITS.length + 1)
    })
})
