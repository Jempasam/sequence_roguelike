import { describe, expect, test } from "vitest"
import { ALL_KITS, GOBLIN, KIT_HEARTS } from "@game/core/mecard"
import { parseDefinition, UsageError } from "@game/command_line/sim"
import type { DefinedKit, DefinedMonster } from "@game/command_line/sim"

// --- Fixture builders ---

/** The kit a definition makes. */
function kitOf(text: string): DefinedKit {
    const made = parseDefinition(text, "--match")
    if(!("kit" in made)) throw new Error("A monster was made, not a kit.")
    return made
}

/** The monster a definition makes. */
function monsterOf(text: string): DefinedMonster {
    const made = parseDefinition(text, "--match")
    if("kit" in made) throw new Error("A kit was made, not a monster.")
    return made
}

/** The names of the cards of the kit a definition makes, in order. */
function cardsOf(text: string): string[] {
    return kitOf(text).kit.cards.map(card => card.name)
}

/** What parsing a definition says when it refuses it. */
function refused(text: string): string {
    try {
        parseDefinition(text, "--match")
    }
    catch(error){
        expect(error).toBeInstanceOf(UsageError)
        return (error as Error).message
    }
    throw new Error("The definition was accepted.")
}

// --- Tests ---

describe("parseDefinition", () => {
    test("cards with counts → in the order written, the kit named, the hearts of a kit", () => {
        const made = kitOf("Neuf=Avancer*2,Estoc*3,Esquive")
        expect(made.kit.name).toBe("Neuf")
        expect(cardsOf("Neuf=Avancer*2,Estoc*3,Esquive")).toEqual(["Avancer", "Avancer", "Estoc", "Estoc", "Estoc", "Esquive"])
        expect(made.hearts).toBe(KIT_HEARTS)
    })

    test("names with other case, accents or spaces → found", () => {
        expect(cardsOf("K = esquive, coup d'epee *2")).toEqual(["Esquive", "Coup d'épée", "Coup d'épée"])
        expect(cardsOf("K=esquive,coupd'epee")).toEqual(["Esquive", "Coup d'épée"])
    })

    test("a base → its cards first, then the others, its hearts kept", () => {
        const piquier = ALL_KITS.find(kit => kit.name === "Piquier")
        expect(cardsOf("Piquier+=@Piquier,Estoc*2")).toEqual([...(piquier?.cards ?? []).map(card => card.name), "Estoc", "Estoc"])
    })

    test("a removal → the first copies found go, and a card that is not there is told", () => {
        const cards = cardsOf("Piquier-=@Piquier,-Estoc,-Viser")
        expect(cards.filter(name => name === "Estoc")).toHaveLength(1)
        expect(cards).not.toContain("Viser")
        expect(refused("X=@Piquier,-Tir")).toContain("« Tir » n'est pas dans le deck de @Piquier")
        expect(refused("X=@Piquier,-Estoc*5")).toContain("il n'y en a que 2")
    })

    test("items and usables → carried by the kit, with counts, and removed from a base", () => {
        const first = kitOf("K=Avancer,item:Grimoire,usable:Cocaine*2")
        const second = kitOf("L=@kit:Piquier,usable:Cocaine*2,-usable:Cocaine,heart:rouge*3")
        expect(first.kit.items.map(item => item.name)).toEqual(["Grimoire"])
        expect(first.kit.usables.map(usable => usable.name)).toEqual(["Cocaïne", "Cocaïne"])
        expect(second.kit.usables.map(usable => usable.name)).toContain("Cocaïne")
        expect(first.hearts).toBe(KIT_HEARTS)
    })

    test("heart: → hearts of other kinds after the red ones, added up, and removed from a base", () => {
        const first = kitOf("K=Avancer,heart:rouge*4,heart:rose*3,heart:noir,heart:rose")
        expect(first.hearts).toBe(4)
        expect(first.bonus.map(group => [group.kind.name, group.count])).toEqual([["rose", 4], ["noir", 1]])
        const second = kitOf("L=Avancer,heart:rose*4,heart:noir,-heart:rose*2,-heart:noir")
        expect(second.bonus.map(group => [group.kind.name, group.count])).toEqual([["rose", 2]])
    })

    test("heart: alone → exactly those hearts, none red when none is named; none at all → refused", () => {
        const black = kitOf("K=Avancer,heart:noir*6")
        expect(black.hearts).toBe(0)
        expect(black.bonus.map(group => [group.kind.name, group.count])).toEqual([["noir", 6]])
        expect(refused("K=Avancer,heart:rouge,-heart:rouge")).toContain("aucun cœur")
    })

    test("heart: wrong → refused with what to do", () => {
        expect(refused("K=Avancer,heart:rsoe")).toContain("rose")
        expect(refused("K=Avancer,heart:rose,-heart:rose*2")).toContain("il n'y en a que 1")
        expect(refused("K=Avancer,heart:rouge,-heart:rouge*2")).toContain("il n'y en a que 1")
        expect(refused("M=Avancer,heart:rouge*3,draw:2,heart:rose")).toContain("monstre")
    })

    test("a base that is a monster → a monster, its hearts and draw kept, hearts changed", () => {
        const made = monsterOf("Gobelin+=@Gobelin,heart:rouge*2,Estoc")
        expect(made.hearts).toBe(GOBLIN.hearts + 2)
        expect(made.draw).toBe(GOBLIN.draw)
        expect(made.cards).toHaveLength(GOBLIN.cards.length + 1)
    })

    test("draw: without a base → a monster that needs its hearts and its draw", () => {
        expect(monsterOf("M=Avancer,Estoc,heart:rouge*3,draw:2").draw).toBe(2)
        expect(refused("M=Avancer,draw:2")).toContain("heart:rouge*N")
        expect(refused("M=Avancer,heart:rouge*3,size:2")).toContain("draw:N")
    })

    test("item and usable on a monster → carried, with counts", () => {
        const made = monsterOf("M=Avancer,heart:rouge*3,draw:1,item:Grimoire,usable:Cocaine*2")
        expect(made.items?.map(item => item.name)).toEqual(["Grimoire"])
        expect(made.usables.map(usable => usable.name)).toEqual(["Cocaïne", "Cocaïne"])
    })

    test("a monster base with items → kept, and one can be removed", () => {
        const kept = monsterOf("H+=@Hydre phénix,item:Grimoire")
        expect(kept.items?.map(item => item.name)).toEqual(["Cœur de phénix", "Grimoire"])
        expect(monsterOf("H-=@Hydre phénix,-item:Cœur de phénix").items).toEqual([])
    })

    test("a name of the game → a definition of its own, it does not replace the one of the game", () => {
        expect(kitOf("Piquier=Avancer,Estoc").kit.cards).toHaveLength(2)
        expect(ALL_KITS.find(kit => kit.name === "Piquier")?.cards.length).toBeGreaterThan(2)
    })

    test("what is wrong → told with the definition, the thing at fault, and what to do", () => {
        expect(refused("T=Avancer,Estok")).toBe("--match « T » : Nom inconnu « Estok » (carte). Vouliez-vous « Estoc » ?")
        expect(refused("T=Avancer,item:Grimiore")).toContain("« Grimoire »")
        expect(refused("T=Avancer,usable:Cocane")).toContain("« Cocaïne »")
        expect(refused("T=@Piquer")).toContain("« Piquier »")
        expect(refused("T=Avancer*0")).toContain("après * un nombre entre 1 et 99")
        expect(refused("T=Avancer,,Estoc")).toContain("élément vide")
        expect(refused("T=@Piquier,@Mage")).toContain("une seule base @")
        expect(refused("Avancer,Estoc")).toContain("le = manque")
        expect(refused("=Avancer")).toContain("le nom avant le = est vide")
        expect(refused("T=-Avancer")).toContain("n'est pas dans le deck de la définition")
        expect(refused("T=item:Grimoire")).toContain("le deck est vide")
    })
})
