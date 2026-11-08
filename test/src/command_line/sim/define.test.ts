import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { GOBLIN, KIT_HEARTS, LANCER_KIT } from "@game/core/mecard"
import { loadDefinitions, UsageError } from "@game/command_line/sim"
import type { Definitions } from "@game/command_line/sim"

// --- Fixture builders ---

/** The names of the cards of the first kit defined, in order. */
function cardsOf(definitions: Definitions): string[] {
    return definitions.kits[0].kit.cards.map(card => card.name)
}

/** What loading definitions says when it refuses them. */
async function refused(...values: string[]): Promise<string> {
    try {
        await loadDefinitions(values)
    }
    catch(error){
        expect(error).toBeInstanceOf(UsageError)
        return (error as Error).message
    }
    throw new Error("The definitions were accepted.")
}

/** A file with a text in it, in a directory of its own. */
async function fileOf(name: string, text: string): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), "sim-define-"))
    const path = join(directory, name)
    await writeFile(path, text)
    return path
}

// --- Tests ---

describe("loadDefinitions", () => {
    test("cards with counts → in the order written, the kit named, the hearts of a kit", async() => {
        const definitions = await loadDefinitions(["Neuf=Avancer*2,Estoc*3,Esquive"])
        expect(definitions.kits[0].kit.name).toBe("Neuf")
        expect(cardsOf(definitions)).toEqual(["Avancer", "Avancer", "Estoc", "Estoc", "Estoc", "Esquive"])
        expect(definitions.kits[0].hearts).toBe(KIT_HEARTS)
        expect(definitions.monsters).toEqual([])
    })

    test("names with other case, accents or spaces → found", async() => {
        const definitions = await loadDefinitions(["K = esquive, coup d'epee *2"])
        expect(cardsOf(definitions)).toEqual(["Esquive", "Coup d'épée", "Coup d'épée"])
    })

    test("a base → its cards first, then the others, its hearts kept", async() => {
        const definitions = await loadDefinitions(["Lancier+=@Lancier,Estoc*2"])
        expect(cardsOf(definitions)).toEqual([...LANCER_KIT.cards.map(card => card.name), "Estoc", "Estoc"])
    })

    test("a removal → the first copies found go, and a card that is not there is told", async() => {
        const definitions = await loadDefinitions(["Lancier-=@Lancier,-Avancer*2,-Viser"])
        const cards = cardsOf(definitions)
        expect(cards.filter(name => name === "Avancer")).toHaveLength(1)
        expect(cards).not.toContain("Viser")
        expect(await refused("X=@Lancier,-Tir")).toContain("« Tir » n'est pas dans le deck de @Lancier")
        expect(await refused("X=@Lancier,-Avancer*5")).toContain("il n'y en a que 3")
    })

    test("items and usables → carried by the kit, with counts, and removed from a base", async() => {
        const definitions = await loadDefinitions(["K=Avancer,item:Grimoire,usable:Cocaine*2;L=@K,-usable:Cocaine,heart:rouge*3"])
        const [first, second] = definitions.kits
        expect(first.kit.items.map(item => item.name)).toEqual(["Grimoire"])
        expect(first.kit.usables.map(usable => usable.name)).toEqual(["Cocaïne", "Cocaïne"])
        expect(second.kit.items.map(item => item.name)).toEqual(["Grimoire"])
        expect(second.kit.usables).toHaveLength(1)
        expect(first.hearts).toBe(KIT_HEARTS)
        expect(second.hearts).toBe(KIT_HEARTS + 3)
    })

    test("heart: → hearts of other kinds after the red ones, added up, inherited and removed from a base", async() => {
        const definitions = await loadDefinitions(["K=Avancer,heart:rouge*4,heart:rose*3,heart:noir,heart:rose;L=@K,-heart:rose*2,-heart:noir"])
        const [first, second] = definitions.kits
        expect(first.hearts).toBe(4)
        expect(first.bonus.map(group => [group.kind.name, group.count])).toEqual([["rose", 4], ["noir", 1]])
        expect(second.bonus.map(group => [group.kind.name, group.count])).toEqual([["rose", 2]])
    })

    test("heart: alone → exactly those hearts, none red when none is named; none at all → refused", async() => {
        const [black] = (await loadDefinitions(["K=Avancer,heart:noir*6"])).kits
        expect(black.hearts).toBe(0)
        expect(black.bonus.map(group => [group.kind.name, group.count])).toEqual([["noir", 6]])
        expect(await refused("K=Avancer,heart:rouge,-heart:rouge")).toContain("aucun cœur")
    })

    test("heart: wrong → refused with what to do", async() => {
        expect(await refused("K=Avancer,heart:rsoe")).toContain("rose")
        expect(await refused("K=Avancer,heart:rose,-heart:rose*2")).toContain("il n'y en a que 1")
        expect(await refused("K=Avancer,heart:rouge,-heart:rouge*2")).toContain("il n'y en a que 1")
        expect(await refused("M=Avancer,heart:rouge*3,draw:2,heart:rose")).toContain("monstre")
    })

    test("several definitions in a value, or in several → in order, one can start from another", async() => {
        const definitions = await loadDefinitions(["A=Avancer;B=@A,Estoc", "C=@B,Tir"])
        expect(definitions.kits.map(defined => defined.kit.name)).toEqual(["A", "B", "C"])
        expect(definitions.kits[2].kit.cards.map(card => card.name)).toEqual(["Avancer", "Estoc", "Tir"])
    })

    test("a base that is a monster → a monster, its hearts and draw kept, hearts changed", async() => {
        const definitions = await loadDefinitions(["Gobelin+=@Gobelin,heart:rouge*2,Estoc"])
        const [made] = definitions.monsters
        expect(definitions.kits).toEqual([])
        expect(made.hearts).toBe(GOBLIN.hearts + 2)
        expect(made.draw).toBe(GOBLIN.draw)
        expect(made.cards).toHaveLength(GOBLIN.cards.length + 1)
    })

    test("draw: without a base → a monster that needs its hearts and its draw", async() => {
        expect((await loadDefinitions(["M=Avancer,Estoc,heart:rouge*3,draw:2"])).monsters[0].draw).toBe(2)
        expect(await refused("M=Avancer,draw:2")).toContain("heart:rouge*N")
        expect(await refused("M=Avancer,heart:rouge*3,size:2")).toContain("draw:N")
    })

    test("what is wrong → told with the definition, the thing at fault, and what to do", async() => {
        expect(await refused("T=Avancer,Estok")).toBe("--def « T » : Nom inconnu « Estok » (carte). Vouliez-vous « Estoc » ?")
        expect(await refused("T=Avancer,item:Grimiore")).toContain("« Grimoire »")
        expect(await refused("T=Avancer,usable:Cocane")).toContain("« Cocaïne »")
        expect(await refused("T=@Lancer")).toContain("« Lancier »")
        expect(await refused("T=@Gobelin,item:Grimoire")).toContain("item: refusé sur un monstre")
        expect(await refused("T=Avancer*0")).toContain("après * un nombre entre 1 et 99")
        expect(await refused("T=Avancer,,Estoc")).toContain("élément vide")
        expect(await refused("T=@Lancier,@Mage")).toContain("une seule base @")
        expect(await refused("Avancer,Estoc")).toContain("le = manque")
        expect(await refused("=Avancer")).toContain("le nom avant le = est vide")
        expect(await refused("T=-Avancer")).toContain("n'est pas dans le deck de la définition")
        expect(await refused("T=item:Grimoire")).toContain("le deck est vide")
        expect(await refused("T=Avancer;T=Estoc")).toContain("« T » est déjà défini")
    })

    test("a file of text → one definition per line, comments and blank lines left out, the line told on a mistake", async() => {
        const path = await fileOf("kits.txt", "# mes kits\nA = Avancer, Estoc\n\nB = @A, Tir\n")
        const definitions = await loadDefinitions([`@${path}`])
        expect(definitions.kits.map(defined => defined.kit.name)).toEqual(["A", "B"])
        const broken = await fileOf("broken.txt", "A = Avancer\nB = Estok\n")
        expect(await refused(`@${broken}`)).toMatch(/ligne 2 « B » : Nom inconnu « Estok »/)
    })

    test("a file that is not there → told with its path", async() => {
        expect(await refused("@/chemin/qui/n/existe/pas.txt")).toContain("fichier introuvable")
    })

    test("a module → its kits and monsters", async() => {
        const path = await fileOf("custom.mjs", "export const kits = [{ name: \"Module\", cards: [] }]\n")
        const definitions = await loadDefinitions([`@${path}`])
        expect(definitions.kits[0].kit.name).toBe("Module")
        expect(definitions.kits[0].hearts).toBe(KIT_HEARTS)
    })
})
