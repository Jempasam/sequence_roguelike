import { describe, expect, test } from "vitest"
import { Label } from "@game/core-src/engine/ui/widget/Label"
import { Panel } from "@game/core-src/engine/ui/widget/Panel"
import { Paragraph } from "@game/core-src/engine/ui/widget/Paragraph"
import { plainText } from "@game/core-src/semantic/Text"
import type { Component } from "@game/core-src/engine/ui/Component"
import { explain } from "@game/core-src/games/mecard/sim/analysis/explain"
import { BEAST_KIND, MONSTER_KIND, PET_KIND } from "@game/core-src/games/mecard/sim/analysis/Kinds"
import { ELEMENT_TARGET, FUSION_TARGET } from "@game/core-src/games/mecard/sim/analysis/Targets"
import { ALL_MONSTERS, GOBLIN } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { WOLF } from "@game/core-src/games/mecard/sim/catalog/pets"
import { CardView } from "@game/core/mecard/card-view"
import { analysisView } from "@game/core/mecard/analysis-view"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import { allUnder } from "./fixtures"

// --- Fixture builders ---

/** The texts of the labels and paragraphs under a component. */
function textsUnder(root: Component): string[] {
    return allUnder(root)
        .filter(component => component instanceof Label || component instanceof Paragraph)
        .map(component => plainText((component as Label|Paragraph).text))
}

// --- Tests ---

describe("analysisView", () => {
    test("a monster as a beast → a block for each round of its deck, each with its chain", () => {
        const { theme } = uiSetup()
        const explanation = explain(MONSTER_KIND, GOBLIN, BEAST_KIND)
        const { view } = analysisView(theme, explanation)
        const texts = textsUnder(view)
        const rounds = texts.filter(text => /^Round \d+$/.test(text))
        expect(rounds).toHaveLength(GOBLIN.cards.length / GOBLIN.draw)
        expect(texts.filter(text => text.startsWith("Lue : "))).toHaveLength(rounds.length)
    })

    test("a monster as a monster → the rounds the monster made will play are told too", () => {
        const { theme } = uiSetup()
        const { view } = analysisView(theme, explain(MONSTER_KIND, GOBLIN, MONSTER_KIND))
        expect(textsUnder(view)).toContain("Les chaînes que le monstre obtenu jouera, round par round")
    })

    test("a target that finds nothing → told first, and the analysis shown all the same", () => {
        const { theme } = uiSetup()
        const slime = ALL_MONSTERS.find(each => each.name === "Slime")!
        const { view } = analysisView(theme, explain(MONSTER_KIND, slime, ELEMENT_TARGET))
        const texts = textsUnder(view)
        expect(texts.some(text => text.startsWith("Rien n'est construit : aucun élément possible"))).toBe(true)
        expect(texts).toContain("Algorithme")
        expect(texts).toContain("Les effets des cartes")
    })

    test("a source → the chain that stands for it, the best mix and the effects of its cards are told", () => {
        const { theme } = uiSetup()
        const texts = textsUnder(analysisView(theme, explain(MONSTER_KIND, GOBLIN, FUSION_TARGET)).view)
        expect(texts).toContain("La chaîne qui représente l'unité")
        expect(texts).toContain("Le mélange le plus identitaire")
        expect(texts.some(text => text.startsWith("Retenue : "))).toBe(true)
        expect(texts.some(text => text.startsWith("Négatifs ("))).toBe(true)
        expect(texts.some(text => text.startsWith("Positifs ("))).toBe(true)
        expect(texts.some(text => text.startsWith("Neutres ("))).toBe(true)
    })

    test("the steps of the algorithm → told, with the values of the conversion", () => {
        const { theme } = uiSetup()
        const explanation = explain(MONSTER_KIND, GOBLIN, BEAST_KIND)
        const texts = textsUnder(analysisView(theme, explanation).view)
        for(const step of explanation.steps) expect(texts).toContain(step)
    })

    test("each card of the source → a block with the profile that won and what it did alone", () => {
        const { theme } = uiSetup()
        const explanation = explain(MONSTER_KIND, GOBLIN, BEAST_KIND)
        const { view } = analysisView(theme, explanation)
        const texts = textsUnder(view)
        expect(texts.filter(text => text.startsWith("Scores : "))).toHaveLength(explanation.cards.length)
        expect(texts.filter(text => text.startsWith("Mots-clés : "))).toHaveLength(explanation.cards.length)
    })

    test("the chains found → the cards kept are framed, as many as the chains hold", () => {
        const { theme } = uiSetup()
        const explanation = explain(MONSTER_KIND, GOBLIN, BEAST_KIND)
        const { view } = analysisView(theme, explanation)
        const { run, bite, main } = explanation.traces
        const framed = allUnder(view).filter(component => component instanceof Panel)
        expect(framed).toHaveLength(run.chosen.length + bite.chosen.length + main.chosen.length)
    })

    test("a run tried and not kept → told with why", () => {
        const { theme } = uiSetup()
        const texts = textsUnder(analysisView(theme, explain(MONSTER_KIND, GOBLIN, BEAST_KIND)).view)
        expect(texts.some(text => text.includes("rejetée : "))).toBe(true)
        expect(texts.some(text => text.endsWith("retenue"))).toBe(true)
    })

    test("a source with no order → no rounds, the cards taken one after the other told instead", () => {
        const { theme } = uiSetup()
        const texts = textsUnder(analysisView(theme, explain(PET_KIND, WOLF, BEAST_KIND)).view)
        expect(texts.some(text => /^Round \d+$/.test(text))).toBe(false)
        expect(texts.some(text => text.includes("(adéquation "))).toBe(true)
    })

    test("a view → a hover for what it holds, the cards among them", () => {
        const { theme } = uiSetup()
        const { view, detail } = analysisView(theme, explain(MONSTER_KIND, GOBLIN, BEAST_KIND))
        expect(detail).toBeDefined()
        expect(allUnder(view).filter(component => component instanceof CardView).length).toBeGreaterThan(0)
    })
})
