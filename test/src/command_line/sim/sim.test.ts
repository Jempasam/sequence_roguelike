import { describe, expect, test } from "vitest"
import { ALL_KITS } from "@game/core/mecard"
import { mergeTallies, planOf, run, sim, UsageError } from "@game/command_line/sim"
import type { Console, Matrix, Tally } from "@game/command_line/sim"

// --- Fixture builders ---

/** A console that keeps what is told on the error output. */
function consoleOf(): Console & { readonly lines: string[] } {
    const lines: string[] = []
    return { lines, error: message => { lines.push(message) }, interactive: false, confirm: async() => true }
}

/** The arguments, played by the AI of the game unless they choose one: much faster than the default. */
function fast(args: readonly string[]): string[] {
    return args.includes("--ai") ? [...args] : [...args, "--ai", "deck"]
}

/** The tables a command line gives, its battles few. */
async function tablesOf(...args: string[]): Promise<Matrix[]> {
    const plan = await planOf([...fast(args), "--quiet"])
    return (await run(plan, consoleOf())).matrices
}

/** What running `sim` says when it refuses a command line. */
async function refused(...args: string[]): Promise<string> {
    try {
        await sim([...args, "--quiet"], consoleOf())
    }
    catch(error){
        expect(error).toBeInstanceOf(UsageError)
        return (error as Error).message
    }
    throw new Error("The command line was accepted.")
}

function cell(matrix: Matrix, row: string, column: string): Tally|null {
    return matrix.cells[matrix.rows.indexOf(row)][matrix.columns.indexOf(column)]
}

// --- Tests ---

describe("sim", () => {
    test("--help → the options, and a topic → its syntax", async() => {
        expect(await sim(["--help"])).toContain("--out <liste>")
        expect(await sim(["--help", "out"])).toContain("encounter:Gobelin*3+Archer")
        expect(await sim(["--help", "def"])).toContain("item:Nom[*N]")
        expect(await sim(["--help", "ai"])).toContain("lookahead")
        await expect(sim(["--help", "nope"])).rejects.toThrow("Sujets : out, def, ai.")
    })

    test("the table → a line for each fighter, a column for each output", async() => {
        const text = await sim(["--of", "Lancier,Mage", "--out", "solo/cave,team/kits,total", "--games", "2", "--ai", "deck", "--quiet"], consoleOf())
        const lines = text.split("\n")
        expect(lines[0].trim().split(/\s+/)).toEqual(["solo/cave", "team/kits", "total"])
        expect(lines.slice(2).map(line => line.split(/\s+/)[0]).sort()).toEqual(["Lancier", "Mage"])
    })

    test("several threads → the same table as one", async() => {
        const args = ["--of", "Lancier,Mage", "--out", "solo/cave,team/kits", "--games", "3", "--show", "rounds"]
        const alone = await sim([...fast(args), "--jobs", "1", "--quiet"], consoleOf())
        const shared = await sim([...fast(args), "--jobs", "2", "--quiet"], consoleOf())
        expect(shared).toBe(alone)
    }, 120_000)

    test("the same seed → the same table, another seed → still a table", async() => {
        const args = ["--of", "Lancier", "--out", "solo/cave,solo/kits", "--games", "4"]
        expect(await sim([...fast(args), "--quiet"], consoleOf())).toBe(await sim([...fast(args), "--quiet"], consoleOf()))
        expect(await sim([...fast(args), "--seed", "2", "--quiet"], consoleOf())).toContain("Lancier")
    })

    test("a cell → the same whatever the other columns are", async() => {
        const [alone] = await tablesOf("--of", "Lancier", "--out", "solo/cave", "--games", "5")
        const [among] = await tablesOf("--of", "Lancier,Mage", "--out", "solo/forest,solo/cave", "--games", "5")
        expect(cell(among, "Lancier", "solo/cave")).toEqual(cell(alone, "Lancier", "solo/cave"))
    })

    test("total → every battle of the other columns, once", async() => {
        const [matrix] = await tablesOf("--of", "Lancier", "--out", "solo/cave,total,solo/forest", "--games", "4")
        expect(matrix.columns).toEqual(["solo/cave", "total", "solo/forest"])
        const parts = [cell(matrix, "Lancier", "solo/cave"), cell(matrix, "Lancier", "solo/forest")] as Tally[]
        expect(cell(matrix, "Lancier", "total")).toEqual(mergeTallies(parts))
    })

    test("a biome alone → a team of one and a team of three, their battles pooled", async() => {
        const [matrix] = await tablesOf("--of", "Lancier", "--out", "cave,solo/cave,team/cave", "--games", "3")
        const pooled = mergeTallies([cell(matrix, "Lancier", "solo/cave"), cell(matrix, "Lancier", "team/cave")] as Tally[])
        expect(cell(matrix, "Lancier", "cave")).toEqual(pooled)
    })

    test("a partner that is the subject → a cell that makes no sense, the others played", async() => {
        const [matrix] = await tablesOf("--of", "Mage,Lancier", "--out", "with:Mage/cave", "--games", "2")
        expect(cell(matrix, "Mage", "with:Mage/cave")).toBeNull()
        expect(cell(matrix, "Lancier", "with:Mage/cave")?.wins).toBeGreaterThanOrEqual(0)
    })

    test("a group of partners → a column for each, the subject's own left empty", async() => {
        const [matrix] = await tablesOf("--of", "Mage", "--out", "with:kits", "--games", "1")
        expect(matrix.columns).toHaveLength(ALL_KITS.length)
        expect(matrix.cells[0].filter(each => each === null)).toHaveLength(1)
    })

    test("several AIs → a table for each, titled", async() => {
        const matrices = await tablesOf("--of", "Lancier", "--out", "solo/cave", "--games", "2", "--ai", "deck,random")
        expect(matrices.map(matrix => matrix.title)).toEqual(["IA : deck", "IA : random"])
    })

    test("definitions → the fighters measured when --of is not given, usable as partners and opponents", async() => {
        const matrices = await tablesOf(
            "--def", "Neuf=Avancer*2,Viser,Estoc*3,Esquive,item:Grimoire,usable:Cocaine;Dix=@Lancier,Estoc",
            "--out", "solo/cave,team/kits:custom,with:Neuf/kits:custom", "--games", "2",
        )
        expect(matrices[0].rows).toEqual(["Neuf", "Dix"])
        expect(matrices[0].columns).toEqual(["solo/cave", "team/kits:custom", "with:Neuf/kits:custom"])
        expect(cell(matrices[0], "Neuf", "with:Neuf/kits:custom")).toBeNull()
    })

    test("a kit defined with a name of the game → replaces it", async() => {
        const plan = await planOf(["--def", "Lancier=Avancer,Estoc", "--of", "Lancier", "--quiet"])
        expect(plan.subjects).toHaveLength(1)
        expect(plan.subjects[0].custom).toBe(true)
    })

    test("an encounter of named monsters → every battle counted once", async() => {
        const [matrix] = await tablesOf("--of", "Lancier", "--out", "solo/encounter:Gobelin", "--games", "3")
        const result = cell(matrix, "Lancier", "solo/encounter:Gobelin")
        const battles = result === null ? 0 : result.wins + result.losses + result.draws + result.timeouts
        expect(battles).toBe(3)
    })
})

describe("sim command line", () => {
    test("what is wrong → told before any battle, with what to do", async() => {
        expect(await refused("--of", "Lancer")).toContain("--of : Nom inconnu « Lancer » (combattant). Vouliez-vous « Lancier »")
        expect(await refused("--gmaes", "5")).toBe("Option inconnue --gmaes, vouliez-vous --games ?")
        expect(await refused("--games", "abc")).toBe("--games : entier attendu, reçu « abc ».")
        expect(await refused("--layer", "3-1")).toBe("--layer : « 3-1 » : a doit être ≤ b.")
        expect(await refused("--fight", "war")).toContain("Valeurs permises : battle, elite, boss.")
        expect(await refused("--format", "xml")).toContain("Valeurs permises : table, csv, json.")
        expect(await refused("--show", "victories")).toContain("Valeurs permises : n, ci, draws, timeouts, rounds, errors, wins, softwins, losses, softlosses.")
        expect(await refused("--ai", "smart")).toContain("IA disponibles : deck")
        expect(await refused("--ai", "Mague=deck")).toContain("« Mage »")
        expect(await refused("--top", "0")).toBe("--top : 0 ne garde aucune ligne.")
        expect(await refused("--sort", "grotte")).toContain("Colonnes : name, total, solo")
        expect(await refused("--out", "team/caev")).toContain("« caev » (après le /) n'est pas un adversaire")
        expect(await refused("--def", "X=Avancer,Estok")).toContain("Vouliez-vous « Estoc »")
        expect(await refused("Lancier")).toContain("toutes les options commencent par --")
    })

    test("a fight no map of the floor holds → told with the floor, before any battle", async() => {
        expect(await refused("--of", "Lancier", "--out", "solo/cave", "--fight", "elite", "--layer", "0-1"))
            .toBe("--fight elite --layer 0-1 : aucun combat de ce genre dans « Grotte » (50 cartes tirées).")
        expect(await refused("--of", "Lancier", "--out", "solo/mine", "--fight", "boss")).toContain("--fight boss --layer 0-3")
    })

    test("a pool too small to complete a team → told with what is missing", async() => {
        expect(await refused("--of", "Lancier", "--out", "team", "--pool", "Mage")).toBe(
            "--pool : 1 combattant(s) pour compléter l'équipe de « Lancier » (2 nécessaire(s) pour une équipe de 3). Élargir --pool.",
        )
    })

    test("an option that changes nothing → said on the error output, the table still given", async() => {
        const io = consoleOf()
        const text = await sim(["--of", "Lancier", "--out", "solo/kits", "--layer", "2", "--pool", "kits", "--games", "1", "--ai", "deck", "--quiet"], io)
        expect(text).toContain("Lancier")
        expect(io.lines).toContain("sim : --layer ignoré : aucune sortie ne combat les monstres d'un biome.")
        expect(io.lines).toContain("sim : --pool ignoré : aucune sortie ne tire de coéquipiers (team, team:N).")
    })

    test("a long run → announced, and not played when the answer is no", async() => {
        const io = { ...consoleOf(), confirm: async() => false }
        const text = await sim(["--of", "kits", "--out", "total,solo,team,cave,forest,mine,hell,kits", "--games", "500"], io)
        expect(text).toBe("")
        expect(io.lines[0]).toMatch(/combats à jouer/)
    })

    test("the default outputs → the full comparison", async() => {
        const plan = await planOf(["--quiet"])
        expect(plan.columns.map(column => column.label)).toEqual(["total", "solo", "team", "cave", "forest", "mine", "hell", "kits"])
        expect(plan.subjects).toHaveLength(ALL_KITS.length)
    })
})
