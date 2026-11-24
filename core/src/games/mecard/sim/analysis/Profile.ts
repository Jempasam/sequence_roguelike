import type { Keyword } from "../../../../semantic"
import { ALLONGE, DISTANCE, FORCE, HEAL, INVOCATION, PORTEE } from "../base/keywords"
import type { Card } from "../card/Card"

import { featuresOf } from "./CardFeatures"
import type { CardFeatures } from "./CardFeatures"

/** A term of the score of a card for a profile: what said it, and how much it adds. */
export interface Contribution {
    readonly label: string
    readonly amount: number
}

/** What a card is for in a chain, and how well a card is for it: the hints of the card, added up. */
export interface Profile {
    readonly id: string

    /** Each term of its score for a card, in the order they are added: none for a hint that says nothing. */
    explain(features: CardFeatures): Contribution[]

    /** How much a card is for it: higher is more, 0 when nothing says so. The sum of what `explain` gives. */
    score(features: CardFeatures): number
}

/** A profile written by its id and the terms of its score. */
function profile(id: string, explain: (features: CardFeatures) => Contribution[]): Profile {
    return {
        id,
        explain,
        score: features => explain(features).reduce((sum, term) => sum + term.amount, 0),
    }
}

/** A term for what a card did played alone: none when it did nothing of the kind. */
function measured(label: string, amount: number): Contribution[] {
    return amount === 0 ? [] : [{ label: `mesure : ${label}`, amount }]
}

/** A term for a hint of the description: none when the description does not name it. */
function named(features: CardFeatures, weight: number, ...words: readonly Keyword[]): Contribution[] {
    const found = words.filter(word => features.keywords.has(word))
    return found.length === 0 ? [] : [{ label: `mot-clé : ${found.map(word => word.name).join(", ")}`, amount: weight }]
}

/** Gets the card to a place: its step, its dash. */
export const RUN_PROFILE = profile("run", features => {
    const { measure } = features
    return [
        ...measured("déplacement", measure ? measure.moved * 2 : 0),
        ...measured("dégâts (contre la course)", measure ? -measure.damage : 0),
        ...named(features, 0.5, DISTANCE),
    ]
})

/** Hurts what stands in front of it. */
export const BITE_PROFILE = profile("bite", features => {
    const { measure } = features
    return [...measured("dégâts", measure ? measure.damage * 2 : 0), ...named(features, 0.5, FORCE, PORTEE, ALLONGE)]
})

/** Keeps the unit alive: shields and cures. */
export const GUARD_PROFILE = profile("guard", features => {
    const { measure } = features
    return [
        ...measured("bouclier", measure ? measure.shield * 2 : 0),
        ...measured("soin", measure ? measure.healed * 2 : 0),
        ...named(features, 0.5, HEAL),
    ]
})

/** Turns the unit toward what it fights, and nothing else. */
export const AIM_PROFILE = profile("aim", ({ measure }) => {
    return measure && measure.damage === 0 && measure.moved < 0.5 ? measured("rotation seule", measure.turned * 2) : []
})

/** Calls bodies, and the cards that only change other cards: no hint of what they do alone. */
export const SUPPORT_PROFILE = profile("support", features => {
    const { measure } = features
    const takes: Contribution[] = features.signature.input ? [{ label: "prend une entrée", amount: 1 }] : []
    return [...measured("invocations", measure ? measure.summoned * 2 : 0), ...takes, ...named(features, 0.5, INVOCATION)]
})

/** Nothing in particular: what a card is when it is nothing else. */
export const FILLER_PROFILE = profile("filler", () => [{ label: "valeur de base", amount: 0.25 }])

/** What a chain leads to, whatever its kind: the weight of what its cards do to the fight. */
export const MAIN_PROFILE = profile("main", ({ measure }) => {
    if(!measure) return []
    return [
        ...measured("dégâts", measure.damage * 2),
        ...measured("invocations", measure.summoned * 1.5),
        ...measured("bouclier", measure.shield),
        ...measured("soin", measure.healed),
        ...measured("déplacement", measure.moved * 0.5),
    ]
})

/** The profiles a card is told apart by, MAIN_PROFILE left out: it overlaps all of them. */
export const PROFILES: readonly Profile[] = [
    RUN_PROFILE, BITE_PROFILE, GUARD_PROFILE, AIM_PROFILE, SUPPORT_PROFILE, FILLER_PROFILE,
]

/** How much a card is for a profile. */
export function scoreOf(card: Card, of: Profile): number {
    return of.score(featuresOf(card))
}

/** The profile a card is for the most, the first of the profiles on a tie. */
export function profileOf(card: Card, among: readonly Profile[] = PROFILES): Profile {
    let best = among[0]
    let top = scoreOf(card, best)
    for(const each of among.slice(1)){
        const score = scoreOf(card, each)
        if(score > top){
            best = each
            top = score
        }
    }
    return best
}

/**
 * How well a card fits a profile in a chain: its score, less the best score the card has for another profile
 * of the list, so that a card that is rather something else weighs against the chain. The main profile has
 * no rival.
 */
export function fitOf(card: Card, of: Profile, among: readonly Profile[] = PROFILES): number {
    const score = scoreOf(card, of)
    if(of === MAIN_PROFILE) return score
    const rivals = among.filter(each => each !== of).map(each => scoreOf(card, each))
    return score - Math.max(0, ...rivals)
}
