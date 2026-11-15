import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { ALL_KITS } from "@game/core/mecard"
import { mergeTallies, planOf, run, sim, UsageError } from "@game/command_line/sim"
import type { Console, Matrix } from "@game/command_line/sim"

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

// --- Tests ---

describe("sim", () => {
    test("--help → the options, and a topic → its syntax", async() => {
        expect(await sim(["--help"])).toContain("--match <desc>")
        expect(await sim(["--help", "match"])).toContain("random:S")
        expect(await sim(["--help", "out"])).toContain("softlosses")
        expect(await sim(["--help", "define"])).toContain("item:Nom[*N]")
        expect(await sim(["--help", "ai"])).toContain("monster=deck")
        await expect(sim(["--help", "nope"])).rejects.toThrow("Sujets : match, out, define, ai.")
    })

    test("the table → a line for each fight described, a column for each statistic", async() => {
        const text = await sim(["--match", "{kit:Piquier}+{kit:Mage}/random:monsters", "--out", "winrate,n,total", "--games", "2", "--ai", "deck", "--quiet"], consoleOf())
        const lines = text.split("\n")
        expect(lines[0].trim().split(/\s+/)).toEqual(["winrate", "n"])
        expect(lines.slice(2).map(line => line.split(/\s+/)[0])).toEqual(["Piquier+Mage/random:monsters", "total"])
    })

    test("several threads → the same table as one", async() => {
        const args = ["--match", "{kit:Piquier}+kit:Mage/{[fight:cave,biome:forest]}", "--games", "3", "--out", "winrate,rounds"]
        const alone = await sim([...fast(args), "--jobs", "1", "--quiet"], consoleOf())
        const shared = await sim([...fast(args), "--jobs", "2", "--quiet"], consoleOf())
        expect(shared).toBe(alone)
    }, 120_000)

    test("the same seed → the same table, another seed → still a table", async() => {
        const args = ["--match", "{kit:Piquier}/random:monsters", "--games", "4"]
        expect(await sim([...fast(args), "--quiet"], consoleOf())).toBe(await sim([...fast(args), "--quiet"], consoleOf()))
        expect(await sim([...fast(args), "--seed", "2", "--quiet"], consoleOf())).toContain("Piquier")
    })

    test("a row → the same whatever the other rows are", async() => {
        const [alone] = await tablesOf("--match", "{kit:Piquier}/random:monsters", "--games", "5")
        const [among] = await tablesOf("--match", "{[kit:Mage,kit:Piquier]}/random:monsters", "--games", "5")
        expect(among.tallies[among.rows.indexOf("Piquier/random:monsters")]).toEqual(alone.tallies[0])
    })

    test("several descriptions → their rows one after the other, and total pools them all", async() => {
        const [matrix] = await tablesOf("--match", "kit:Piquier/random:monsters", "--match", "kit:Mage/random:monsters", "--games", "4")
        expect(matrix.rows).toEqual(["kit:Piquier/random:monsters", "kit:Mage/random:monsters"])
        const text = await sim(["--match", "kit:Piquier/random:monsters", "--match", "kit:Mage/random:monsters", "--games", "4", "--out", "n,total", "--ai", "deck", "--quiet"], consoleOf())
        expect(text.split("\n").pop()).toMatch(/^total\s+8$/)
        expect(mergeTallies(matrix.tallies).wins + mergeTallies(matrix.tallies).losses + mergeTallies(matrix.tallies).draws + mergeTallies(matrix.tallies).timeouts).toBe(8)
    })

    test("braces on kits → a row for each kit", async() => {
        const [matrix] = await tablesOf("--match", "{kits}/random:monsters", "--games", "1")
        expect(matrix.rows).toHaveLength(ALL_KITS.length)
    })

    test("several AIs → a table for each, titled", async() => {
        const matrices = await tablesOf("--match", "{kit:Piquier}/random:monsters", "--games", "2", "--ai", "deck,random")
        expect(matrices.map(matrix => matrix.title)).toEqual(["IA : deck", "IA : random"])
    })

    test("kits defined in place → written in the description, or in a file read as a source", async() => {
        const inPlace = await tablesOf("--match", "kit(Neuf=Avancer*2,Viser,Estoc*3,Esquive,item:Grimoire,usable:Cocaine)/random:monsters", "--games", "2")
        expect(inPlace[0].rows).toEqual(["kit(Neuf=Avancer*2,Viser,Estoc*3,Esquive,item:Grimoire,usable:Cocaine)/random:monsters"])
        const folder = mkdtempSync(join(tmpdir(), "sim-def-"))
        const file = join(folder, "mes-kits.def")
        writeFileSync(file, "# mes kits\n[\n  kit(Neuf=Avancer*2,Viser,Estoc*3,Esquive),\n  kit(Dix=@Piquier,Estoc)   # un Piquier changé\n]\n", "utf8")
        const [matrix] = await tablesOf("--match", `{@${file}}/random:monsters`, "--games", "2")
        expect(matrix.rows).toEqual(["Neuf/random:monsters", "Dix/random:monsters"])
    })

    test("a fighter defined in place → named in --ai, an unknown name told", async() => {
        const plan = await planOf(["--match", "{kit(Duel=Avancer,Estoc)}/random:monsters", "--ai", "deck,Duel=random", "--quiet"])
        expect(plan.variants[0].setup.ai.byName.get("duel")?.name).toBe("random")
        expect(await refused("--match", "{kit(Duel=Avancer,Estoc)}/random:monsters", "--ai", "Duell=random")).toContain("Nom inconnu « Duell »")
    })

    test("nothing is added to a team → a lone kit meets a lone kit, whatever the size of the team", async() => {
        const folder = mkdtempSync(join(tmpdir(), "sim-log-"))
        const log = join(folder, "combat.txt")
        await sim(["--match", "kit:Mage+kit:Archère/kit:Piquier", "--games", "1", "--ai", "deck", "--log", log, "--quiet"], consoleOf())
        const text = readFileSync(log, "utf8")
        expect(text).toMatch(/Alliés : Mage \(deck[^)]*\), Archère \(deck[^)]*\)/)
        expect(text).toMatch(/Adversaires : Piquier \(deck[^)]*\)\n/)
    })

    test("an encounter of named monsters → every battle counted once", async() => {
        const [matrix] = await tablesOf("--match", "kit:Piquier/encounter:Gobelin", "--games", "3")
        const result = matrix.tallies[0]
        expect(result.wins + result.losses + result.draws + result.timeouts).toBe(3)
    })
})

describe("--ai", () => {
    test("by default → the kits play smart, the monsters and the pets as in the game", async() => {
        const { ai } = (await planOf(["--match", "kit:Mage/kit:Piquier", "--quiet"])).variants[0].setup
        expect(ai.kit.name).toMatch(/^smart\d+/)
        expect([ai.monster.name, ai.pet.name]).toEqual(["deck", "deck"])
        expect([ai.allies, ai.foes]).toEqual([null, null])
    })

    test("an AI alone → the one of the kits, and several → a table each", async() => {
        const plan = await planOf(["--match", "kit:Mage/kit:Piquier", "--ai", "deck,random", "--quiet"])
        expect(plan.variants.map(variant => variant.setup.ai.kit.name)).toEqual(["deck", "random"])
    })

    test("by type, by side and by name → each read", async() => {
        const { ai } = (await planOf(["--match", "kit:Mage/kit:Piquier", "--ai", "kit=deck,monster=smart2,pet=random,allies=smart3,foes=deck,Mage=random", "--quiet"])).variants[0].setup
        expect([ai.kit.name, ai.monster.name, ai.pet.name]).toEqual(["deck", "smart2:6", "random"])
        expect([ai.allies?.name, ai.foes?.name]).toEqual(["smart3:6", "deck"])
        expect(ai.byName.get("mage")?.name).toBe("random")
    })
})

describe("sim command line", () => {
    test("what is wrong → told before any battle, with what to do", async() => {
        expect(await refused("--match", "kit:Mague/kit:Mage")).toContain("--match : Nom inconnu « Mague » (kit). Vouliez-vous « Mage »")
        expect(await refused("--match", "kit:Mage/kit:Mage", "--gmaes", "5")).toBe("Option inconnue --gmaes, vouliez-vous --games ?")
        expect(await refused("--match", "kit:Mage/kit:Mage", "--games", "abc")).toBe("--games : entier attendu, reçu « abc ».")
        expect(await refused("--match", "kit:Mage/kit:Mage", "--layer", "3-1")).toBe("--layer : « 3-1 » : a doit être ≤ b.")
        expect(await refused("--match", "kit:Mage/kit:Mage", "--fight", "war")).toContain("Valeurs permises : battle, elite, boss.")
        expect(await refused("--match", "kit:Mage/kit:Mage", "--format", "xml")).toContain("Valeurs permises : table, csv, json.")
        expect(await refused("--match", "kit:Mage/kit:Mage", "--out", "victories")).toContain("Colonnes : winrate, n, ci")
        expect(await refused("--match", "kit:Mage/kit:Mage", "--ai", "smart9")).toContain("IA disponibles : deck")
        expect(await refused("--match", "kit:Mage/kit:Mage", "--ai", "Mague=deck")).toContain("« Mage »")
        expect(await refused("--match", "kit:Mage/kit:Mage", "--top", "0")).toBe("--top : 0 ne garde aucune ligne.")
        expect(await refused("--match", "kit:Mage/kit:Mage", "--sort", "rounds")).toContain("Colonnes : name, winrate")
        expect(await refused("--match", "kit:Mage/fight:caev")).toContain("Vouliez-vous « cave »")
        expect(await refused("--match", "kit(X=Avancer,Estok)/kit:Mage")).toContain("Vouliez-vous « Estoc »")
        expect(await refused("Piquier")).toContain("toutes les options commencent par --")
    })

    test("no description → told with an example", async() => {
        expect(await refused()).toContain("--match : aucune description")
    })

    test("an option that no longer exists → told what replaces it", async() => {
        expect(await refused("--of", "Mage")).toContain("--of n'existe plus")
        expect(await refused("--pool", "kits")).toContain("random:kits")
        expect(await refused("--show", "n")).toContain("--out winrate,n,ci,rounds")
        expect(await refused("--def", "X=Avancer")).toContain("--match")
        expect(await refused("--def", "X=Avancer")).toContain("@mes-kits.def")
    })

    test("a fight no map of the floor holds → told with the floor, before any battle", async() => {
        expect(await refused("--match", "kit:Piquier/random:fight:cave", "--fight", "elite", "--layer", "0-1"))
            .toBe("--fight elite --layer 0-1 : aucun combat de ce genre dans « Grotte » (50 cartes tirées).")
        expect(await refused("--match", "kit:Piquier/random:fight:mine", "--fight", "boss")).toContain("--fight boss --layer 0-3")
    })

    test("an option that changes nothing → said on the error output, the table still given", async() => {
        const io = consoleOf()
        const text = await sim(["--match", "kit:Piquier/kit:Mage", "--layer", "2", "--games", "1", "--ai", "deck", "--quiet"], io)
        expect(text).toContain("Piquier/kit:Mage")
        expect(io.lines).toContain("sim : --layer ignoré : aucune description ne prend de combat ni de monstre d'un biome (fight:, biome:).")
    })

    test("a long run → announced, and not played when the answer is no", async() => {
        const io = { ...consoleOf(), confirm: async() => false }
        const text = await sim(["--match", "{kits}/{monsters}", "--games", "500"], io)
        expect(text).toBe("")
        expect(io.lines[0]).toMatch(/combats à jouer/)
    })
})
