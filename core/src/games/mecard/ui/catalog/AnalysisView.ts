import { Color } from "../../../../engine/math"
import { Box, Label, NineSlice, OverflowContainer, Panel, Paragraph } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"

import type {
    CardReading, ChainTrace, EffectsTrace, EffectUse, Explanation, IdentityTrace, RoundReading,
} from "../../sim/analysis"
import type { Card } from "../../sim/card/Card"
import { CardView } from "../hud/CardView"
import { Detail } from "../hud/Detail"
import { viewDetails } from "../hud/viewDetails"
import { CHOSEN_TEXT, DIM_TEXT, WARNING_TEXT } from "../look/theme"

import { measureLine, profileName } from "./profileText"

/** The space between the parts, in virtual pixels. */
const GAP = 4

/** How many runs rejected a list of runs tried shows at most. */
const REJECTED_SHOWN = 10

/** The frame around the cards a chain kept: the gold of what is chosen. */
const KEPT_COLOR = new Color(CHOSEN_TEXT.r, CHOSEN_TEXT.g, CHOSEN_TEXT.b, 0.9)

/** The color each profile is told in. */
const PROFILE_COLORS: Readonly<Record<string, Color>> = {
    run: new Color(0.45, 0.8, 0.5),
    bite: new Color(0.95, 0.4, 0.35),
    guard: new Color(0.45, 0.65, 1),
    aim: new Color(1, 0.85, 0.35),
    support: new Color(0.75, 0.55, 0.95),
    filler: new Color(0.6, 0.6, 0.6),
    main: new Color(1, 0.65, 0.3),
}

/** What the analysis view is made of: the component, and what its cards and rows tell when hovered. */
export interface AnalysisShown {
    readonly view: Component
    readonly detail: Detail
}

/** The color of a profile. */
function colorOf(id: string): Color {
    return PROFILE_COLORS[id] ?? DIM_TEXT
}

/**
 * What the analysis of a conversion read and decided, to be read: the steps of the algorithm, each card as
 * profiles read it, the rounds a monster plays, and how each chain was found. It builds nothing of its own
 * from the cards: it shows what the {@link Explanation} holds.
 */
export function analysisView(theme: Theme, explanation: Explanation): AnalysisShown {
    const details: Detail[] = []
    const column = new Box("column", { gap: GAP, align: "stretch" })
    const title = (text: string): void => {
        column.add(new Label(theme, text, { color: CHOSEN_TEXT }))
    }
    const para = (text: string, color: Color = theme.textColor): Paragraph => {
        const paragraph = new Paragraph(theme, text, { color })
        column.add(paragraph)
        return paragraph
    }

    title(`${explanation.sourceName} : ${explanation.source.label} → ${explanation.target.label}`)
    if(explanation.none !== null) para(`Rien n'est construit : ${explanation.none}.`, WARNING_TEXT)

    // Algorithme //
    title("Algorithme")
    for(const step of explanation.steps) para(step)

    // Cartes //
    title("Les cartes de la source et ce que les profils en font")
    for(const reading of explanation.cards) column.add(cardBlock(theme, reading, details))

    // Chaînes jouées //
    if(explanation.rounds.length > 0){
        const many = explanation.roundSize !== null
        title(many ? "Les chaînes que la source joue, round par round" : "La chaîne de la source")
        explanation.rounds.forEach((round, index) => {
            column.add(roundBlock(theme, many ? `Round ${index + 1}` : "Chaîne", round))
        })
    }
    if(explanation.madeRounds.length > 0){
        title("Les chaînes que le monstre obtenu jouera, round par round")
        explanation.madeRounds.forEach((round, index) => {
            column.add(roundBlock(theme, `Round ${index + 1}`, round))
        })
    }

    // Chaînes extraites //
    title("Les chaînes extraites")
    for(const [label, trace] of [
        ["Course", explanation.traces.run], ["Morsure", explanation.traces.bite],
        ["Chaîne principale", explanation.traces.main],
    ] as const){
        column.add(traceBlock(theme, label, trace))
    }

    // Identité, mélange et effets //
    title("La chaîne qui représente l'unité")
    column.add(identityBlock(theme, explanation.identity))
    title("Le mélange le plus identitaire")
    column.add(identityBlock(theme, explanation.melange))
    title("Les effets des cartes")
    column.add(effectsBlock(theme, explanation.effects))

    // Résultat //
    title("Corps et soutien")
    const body = explanation.roles.map(part => typeof part === "string" ? `<${part === "run" ? "course" : "morsure"}>` : part.name)
    para(`Corps : ${body.join(", ")}.`)
    para(`Soutien : ${explanation.support.length === 0 ? "aucune carte" : explanation.support.map(card => card.name).join(", ")}.`)

    return { view: column, detail: Detail.all(...details, ...viewDetails(column)) }
}

/** The cards of a list in a row, overlapping when the room is short, those of `marked` framed. */
function cardsRow(theme: Theme, cards: readonly Card[], marked: ReadonlySet<number> = new Set()): Component {
    const row = new OverflowContainer({ gap: 2 })
    cards.forEach((card, index) => {
        const view = new CardView(theme, card, "mini")
        if(!marked.has(index)){
            row.add(view)
            return
        }
        const background = NineSlice.flat(theme.white, KEPT_COLOR)
        const frame = new Panel(theme, { background, padding: 1, interactive: false })
        frame.content = view
        row.add(frame)
    })
    return row
}

/** One card as it was read: what it takes and gives, what it did alone, what each profile made of it. */
function cardBlock(theme: Theme, reading: CardReading, details: Detail[]): Component {
    const block = new Box("column", { gap: 1, align: "stretch" })
    const head = new Box("row", { gap: GAP, align: "center" })
    head.add(new CardView(theme, reading.card, "mini"))
    const kinds = `${reading.input ?? "rien"} → ${reading.output}`
    head.add(new Label(theme, `${reading.card.name}  (${kinds})`, { color: colorOf(reading.winner.id) }))
    block.add(head)
    const words = reading.keywords.length === 0 ? "aucun" : reading.keywords.join(", ")
    block.add(new Paragraph(theme, `Mots-clés : ${words}. Seule : ${measureLine(reading.measure)}.`, { color: DIM_TEXT }))
    const scores = reading.profiles
        .filter(each => each.score !== 0)
        .map(each => `${each.profile === reading.winner ? "★ " : ""}${profileName(each.profile.id)} ${each.score.toFixed(1)}`)
    block.add(new Paragraph(theme, `Scores : ${scores.join(" · ")}.`, { color: colorOf(reading.winner.id) }))
    const why = reading.profiles.flatMap(each => {
        if(each.contributions.length === 0) return []
        const terms = each.contributions.map(term => `${term.label} ${term.amount > 0 ? "+" : ""}${term.amount.toFixed(1)}`)
        return [`${profileName(each.profile.id)} : ${terms.join(", ")} (adéquation ${each.fit.toFixed(1)})`]
    })
    details.push(Detail.on(block, why.length === 0 ? "Aucun indice ne dit à quoi sert cette carte." : why))
    return block
}

/** A round of a deck as the chain reads it: its cards, each stretch's profile, the trees, what is greyed. */
function roundBlock(theme: Theme, title: string, round: RoundReading): Component {
    const block = new Box("column", { gap: 1, align: "stretch" })
    block.add(new Label(theme, title, { color: CHOSEN_TEXT }))
    block.add(cardsRow(theme, round.cards))
    const stretches = new Box("row", { gap: GAP, align: "center" })
    for(const segment of round.segments){
        const names = segment.cards.map(card => card.name).join(", ")
        stretches.add(new Label(theme, `${profileName(segment.profile.id)} : ${names}`, { color: colorOf(segment.profile.id) }))
    }
    block.add(stretches)
    const trees = round.roots.map(root => `${root.toString()}${root.active ? "" : " (grisée)"}`)
    block.add(new Paragraph(theme, `Lue : ${trees.join(" ; ")}.`, { color: theme.textColor }))
    if(round.greyed.length > 0){
        block.add(new Paragraph(theme, `Grisées : ${round.greyed.map(card => card.name).join(", ")}.`, { color: WARNING_TEXT }))
    }
    return block
}

/** How the chain that stands for a unit was found: what was tried, what each was worth, what was kept. */
function identityBlock(theme: Theme, trace: IdentityTrace): Component {
    const block = new Box("column", { gap: 1, align: "stretch" })
    for(const note of trace.notes) block.add(new Paragraph(theme, note, { color: DIM_TEXT }))
    block.add(new Paragraph(theme, `Retenue : ${trace.chosen.map(card => card.name).join(", ") || "aucune chaîne"}.`, {
        color: CHOSEN_TEXT,
    }))
    const kept = trace.candidates.filter(each => each.status === "chosen")
    const rejected = trace.candidates
        .filter(each => each.status === "rejected")
        .sort((first, second) => second.total - first.total)
    for(const each of [...kept, ...rejected.slice(0, REJECTED_SHOWN)]){
        const cards = each.cards.map(card => card.name).join(", ")
        const verdict = each.status === "chosen" ? "retenue" : `rejetée : ${each.reason}`
        const seen = `jouée ${each.occurrences} fois, force ${each.strength.toFixed(1)}, rareté ${each.distinct.toFixed(1)}`
        block.add(new Paragraph(theme, `[${cards}] total ${each.total.toFixed(1)} (${seen}) : ${verdict}`, {
            color: each.status === "chosen" ? CHOSEN_TEXT : DIM_TEXT,
        }))
    }
    if(rejected.length > REJECTED_SHOWN){
        block.add(new Label(theme, `… et ${rejected.length - REJECTED_SHOWN} autres chaînes rejetées`, { color: DIM_TEXT }))
    }
    return block
}

/** The effects the cards give, the negative ones then the positive ones, each with the cards that give it. */
function effectsBlock(theme: Theme, effects: EffectsTrace): Component {
    const block = new Box("column", { gap: 1, align: "stretch" })
    const side = (label: string, scope: string, uses: readonly EffectUse[]): void => {
        block.add(new Label(theme, `${label} (${scope})`, { color: CHOSEN_TEXT }))
        if(uses.length === 0) block.add(new Paragraph(theme, "Aucun effet.", { color: DIM_TEXT }))
        for(const { effect, cards } of uses){
            const what = effect.kind === "status" ? effect.type.name : `${effect.count} cœurs ${effect.heart.name}`
            block.add(new Paragraph(theme, `${what} : ${cards.map(card => card.name).join(", ")}`, {
                color: theme.textColor,
            }))
        }
    }
    side("Négatifs", effects.negativeScope, effects.negative)
    side("Positifs", effects.positiveScope, effects.positive)
    side("Neutres", effects.neutralScope, effects.neutral)
    return block
}

/** How a chain was found: the cards searched, those kept framed, then each run tried or card taken. */
function traceBlock(theme: Theme, label: string, trace: ChainTrace): Component {
    const block = new Box("column", { gap: 1, align: "stretch" })
    const wished = trace.size.min === trace.size.max ? `${trace.size.max}` : `${trace.size.min} à ${trace.size.max}`
    const name = profileName(trace.profile.id)
    block.add(new Label(theme, `${label} (profil ${name}, ${wished} cartes voulues)`, { color: colorOf(trace.profile.id) }))
    const kept = new Set<number>()
    const chosen = trace.windows.find(each => each.status === "chosen")
    if(chosen){
        for(let at = chosen.at; at < chosen.at + chosen.length; at++) kept.add(at)
    }
    else {
        trace.searched.forEach((card, index) => {
            if(trace.chosen.includes(card)) kept.add(index)
        })
    }
    block.add(cardsRow(theme, trace.searched, kept))
    const fallback = trace.fallbacks.length > 0 ? ` Repli : ${trace.fallbacks.join(", ")}.` : ""
    block.add(new Paragraph(theme, `Retenue : ${trace.chosen.map(card => card.name).join(", ") || "aucune carte"}.${fallback}`, {
        color: CHOSEN_TEXT,
    }))
    const rejected = trace.windows
        .filter(each => each.status === "rejected")
        .sort((first, second) => second.total - first.total)
    const shown = [...trace.windows.filter(each => each.status === "chosen"), ...rejected.slice(0, REJECTED_SHOWN)]
    for(const each of shown){
        const cards = trace.searched.slice(each.at, each.at + each.length).map(card => card.name).join(", ")
        const verdict = each.status === "chosen" ? "retenue" : `rejetée : ${each.reason}`
        block.add(new Paragraph(theme, `[${cards}] somme ${each.total.toFixed(1)} : ${verdict}`, {
            color: each.status === "chosen" ? CHOSEN_TEXT : DIM_TEXT,
        }))
    }
    if(rejected.length > REJECTED_SHOWN){
        block.add(new Label(theme, `… et ${rejected.length - REJECTED_SHOWN} autres suites rejetées`, { color: DIM_TEXT }))
    }
    for(const step of trace.steps){
        const row = step.row && step.row.length > 1 ? ` avec ${step.row.slice(1).map(card => card.name).join(", ")}` : ""
        block.add(new Paragraph(theme, `${step.card.name} (adéquation ${step.fit.toFixed(1)}) : ${step.reason}${row}`, {
            color: step.kept ? CHOSEN_TEXT : DIM_TEXT,
        }))
    }
    return block
}
