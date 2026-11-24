import type { Card } from "../card/Card"
import type { CardNode } from "../card/CardNode"
import type { BodyPart } from "../card/CardType"
import { read } from "../card/Reading"
import type { Monster } from "../catalog/monsters"

import { analysisOf } from "./analysisOf"
import { featuresOf } from "./CardFeatures"
import type { CardMeasure } from "./CardProbe"
import type { EffectsTrace, EffectUse } from "./effects"
import type { Kind, Target } from "./Kinds"
import { NoResultError } from "./NoResult"
import { rounds, segments } from "./OrderedChains"
import type { Segment } from "./OrderedChains"
import { fitOf, MAIN_PROFILE, profileOf, PROFILES } from "./Profile"
import type { Contribution, Profile } from "./Profile"
import type { Sizes } from "./Sizes"
import type { ChainTrace, IdentityTrace, Traces } from "./Trace"

/** What one profile makes of a card: its score, how well the card fits it among the others, and why. */
export interface ProfileReading {
    readonly profile: Profile
    readonly score: number
    readonly fit: number
    readonly contributions: readonly Contribution[]
}

/** Everything that tells what a card is for, and what the profiles made of it. */
export interface CardReading {
    readonly card: Card

    /** What the card takes, by the name of its type, none when it takes nothing. */
    readonly input: string|null

    /** What the card gives, by the name of its type. */
    readonly output: string

    /** The notions its description names. */
    readonly keywords: readonly string[]

    /** What it did played alone, none when it could not be seen. */
    readonly measure: CardMeasure|null

    /** What each profile made of it, the main profile last. */
    readonly profiles: readonly ProfileReading[]

    /** The profile it is for the most. */
    readonly winner: Profile
}

/** A row of cards as the chain reads it, which is how a monster plays a round of its deck. */
export interface RoundReading {
    readonly cards: readonly Card[]

    /** The trees the cards make: each head with what it takes. */
    readonly roots: readonly CardNode[]

    /** Does each card play, rather than being greyed out? */
    readonly active: readonly boolean[]

    /** The cards greyed out. */
    readonly greyed: readonly Card[]

    /** The cards told by the profile they are for the most, those next to each other gathered. */
    readonly segments: readonly Segment[]
}

/** What the analysis read in a thing, and how: the same functions as the conversion, with their traces. */
export interface Explanation {
    readonly source: Kind<unknown>
    readonly target: Target<unknown>
    readonly sourceName: string

    /** Is the source made of cards in order? */
    readonly ordered: boolean

    /** The lengths asked of each chain. */
    readonly sizes: Sizes

    /** What was built: the same as the conversion gives, none when the target found nothing to build. */
    readonly made: unknown|null

    /** Why nothing was built, none when something was. */
    readonly none: string|null

    /** Every card of the source, each once. */
    readonly cards: readonly CardReading[]

    /** How many cards a round of the source takes, none when the source is read as one chain. */
    readonly roundSize: number|null

    /** The rounds of the source as its chain reads them, none for a source with no order. */
    readonly rounds: readonly RoundReading[]

    /** The rounds of what was built, when it is a monster: what it will play. */
    readonly madeRounds: readonly RoundReading[]

    /** How the run, the bite and the main chain were found. */
    readonly traces: Traces

    /** How the chain that stands for the unit was found. */
    readonly identity: IdentityTrace

    /** How the most telling chain that merges into one card was found. */
    readonly melange: IdentityTrace

    /** The effects the cards give, by polarity. */
    readonly effects: EffectsTrace

    /** The cards that are for neither the run nor the bite. */
    readonly support: readonly Card[]

    /** The chain of a body, the places of its run and its bite named. */
    readonly roles: readonly BodyPart[]

    /** The steps of the algorithm, in words, with the values of this conversion. */
    readonly steps: readonly string[]
}

/** How one card was read. */
export function readCard(card: Card): CardReading {
    const features = featuresOf(card)
    const profiles = [...PROFILES, MAIN_PROFILE].map(profile => ({
        profile,
        score: profile.score(features),
        fit: fitOf(card, profile),
        contributions: profile.explain(features),
    }))
    return {
        card,
        input: features.signature.input?.name ?? null,
        output: features.signature.output.name,
        keywords: [...features.keywords].map(word => word.name),
        measure: features.measure,
        profiles,
        winner: profileOf(card),
    }
}

/** How a row of cards reads as a round: the trees, what is greyed out, and the profile of each card. */
export function readRound(cards: readonly Card[]): RoundReading {
    const { roots, active, greyed } = read(cards)
    return { cards, roots, active, greyed, segments: segments(cards) }
}

/** The names of some cards, in a line. */
function line(cards: readonly Card[]): string {
    return cards.length === 0 ? "aucune carte" : cards.map(card => card.name).join(", ")
}

/** What a chain found says of how it was found, in a sentence. */
function traceText(label: string, trace: ChainTrace): string {
    const wished = trace.size.min === trace.size.max ? `${trace.size.max}` : `${trace.size.min} à ${trace.size.max}`
    const how = trace.windows.length > 0
        ? `${trace.windows.length} suites essayées`
        : trace.steps.length > 0 ? `${trace.steps.length} cartes examinées` : "rien à chercher"
    const fallback = trace.fallbacks.length > 0 ? ` (${trace.fallbacks.join(", ")})` : ""
    return `${label} (${wished} cartes voulues, ${how}) : ${line(trace.chosen)}${fallback}.`
}

/** What an effect is, as a few words. */
function effectText({ effect }: EffectUse): string {
    return effect.kind === "status" ? effect.type.name : `${effect.count} cœurs ${effect.heart.name}`
}

/** The effects of a side, in a line. */
function effectsLine(uses: readonly EffectUse[]): string {
    return uses.length === 0 ? "aucun" : uses.map(use => `${effectText(use)} (${line(use.cards)})`).join(", ")
}

/** The steps that tell how the chains only the fusion, the mix and the element read were found. */
function readingSteps(
    target: string, identity: IdentityTrace, melange: IdentityTrace, effects: EffectsTrace,
): string[] {
    switch(target){
        case "fusion": return [
            `Chaîne d'identité (${identity.candidates.length} chaînes essayées) : ${line(identity.chosen)}.`,
        ]
        case "merged": return [
            `Mélange le plus identitaire (${melange.candidates.length} suites essayées) : ${line(melange.chosen)}.`,
        ]
        case "element": return [
            `Chaîne d'identité : ${line(identity.chosen)}.`,
            `Effets négatifs (${effects.negativeScope}) : ${effectsLine(effects.negative)}.`,
            `Effets positifs (${effects.positiveScope}) : ${effectsLine(effects.positive)}.`,
            `Effets neutres (${effects.neutralScope}) : ${effectsLine(effects.neutral)}.`,
        ]
        default: return []
    }
}

/** The steps of the algorithm for a conversion, in words, with its values. */
function stepsOf(
    ordered: boolean, cards: readonly CardReading[], sizes: Sizes, roundSize: number|null, traces: Traces,
    support: readonly Card[], roles: readonly BodyPart[],
): string[] {
    const probed = cards.filter(reading => reading.measure !== null).length
    const parts = roles.map(part => typeof part === "string" ? `<${part === "run" ? "course" : "morsure"}>` : part.name)
    return [
        `1. La source est ${ordered ? "ordonnée" : "sans ordre"} : ${cards.length} cartes distinctes`
            + `${roundSize ? `, lues par rounds de ${roundSize}` : ""}.`,
        `2. Chaque carte est jouée seule contre un mannequin : ${probed} ont un effet visible, `
            + `${cards.length - probed} sont classées par type et description seulement.`,
        "3. Chaque profil donne un score à chaque carte, somme de ses indices ; l'adéquation est ce score moins "
            + "le meilleur score d'un autre profil (la chaîne principale n'a pas de rival).",
        ordered
            ? "4. Pour chaque chaîne, toutes les suites de cartes voisines sont essayées : la première et la dernière "
                + "doivent coller au profil, la suite doit se lire en entier, sa longueur être voulue ; "
                + "la plus forte somme d'adéquation est retenue."
            : "4. Pour chaque chaîne, les cartes sont prises de la mieux adaptée à la moins adaptée, chacune avec les "
                + "cartes dont elle a besoin pour se lire, tant que la taille voulue le permet.",
        `5. ${traceText("Course", traces.run)}`,
        `6. ${traceText("Morsure", traces.bite)}`,
        `7. ${traceText("Chaîne principale", traces.main)}`,
        `8. Soutien : ${line(support)}.`,
        `9. Corps : ${parts.join(", ")}.`,
        `Tailles de la cible : course ${sizes.run.min} à ${sizes.run.max}, morsure ${sizes.bite.min} à `
            + `${sizes.bite.max}, principale ${sizes.main.min} à ${sizes.main.max}, pool ${sizes.pool}.`,
    ]
}

/**
 * What the analysis reads in a thing of a kind and how, for building a thing of another: each card as the
 * profiles read it, the rounds the chain of a monster plays, and how each chain was found. It runs the same
 * functions as {@link convert}, so what it tells is what the conversion does.
 */
export function explain<A, B>(
    source: Kind<A>, value: A, target: Target<B>, sizes: Sizes = target.defaults,
): Explanation {
    const anatomy = source.anatomy(value)
    const analysis = analysisOf(anatomy)
    let made: B|null = null
    let none: string|null = null
    try {
        made = target.build(anatomy, analysis, sizes)
    }
    catch(error){
        if(!(error instanceof NoResultError)) throw error
        none = error.why
    }
    const traces = analysis.traces(sizes)
    const identity = analysis.identity(sizes)
    const melange = analysis.melange(sizes)
    const effects = analysis.effects(sizes)
    const support = analysis.support(sizes)
    const roles = analysis.roles(sizes)
    const own = anatomy.ordered ? anatomy.chain : anatomy.parts
    const cards = [...new Set(own)].map(readCard)
    const roundSize = anatomy.ordered ? anatomy.roundSize : null
    const asRounds = anatomy.ordered ? rounds(anatomy.chain, roundSize ?? anatomy.chain.length) : []
    const monster = target.id === "monster" && made !== null ? made as Monster : null
    return {
        source: source as Kind<unknown>,
        target: target as Target<unknown>,
        sourceName: anatomy.name,
        ordered: anatomy.ordered,
        sizes,
        made,
        none,
        cards,
        roundSize,
        rounds: asRounds.map(readRound),
        madeRounds: monster ? rounds(monster.cards, monster.draw).map(readRound) : [],
        traces,
        identity,
        melange,
        effects,
        support,
        roles,
        steps: [
            ...stepsOf(anatomy.ordered, cards, sizes, roundSize, traces, support, roles),
            ...readingSteps(target.id, identity, melange, effects),
        ],
    }
}
