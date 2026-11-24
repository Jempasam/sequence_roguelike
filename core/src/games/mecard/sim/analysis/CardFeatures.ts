import type { Keyword } from "../../../../semantic"
import type { Card } from "../card/Card"
import { signatureOf } from "../card/CardChain"
import type { Signature } from "../card/CardChain"
import { keywordsOf } from "../card/describe"

import { probe } from "./CardProbe"
import type { CardEffects, CardMeasure } from "./CardProbe"

/** Everything that tells what a card is for, each hint maybe missing: none alone decides. */
export interface CardFeatures {
    readonly card: Card

    /** What the card takes and gives, as the chain reads it. */
    readonly signature: Signature

    /** The notions its description names. */
    readonly keywords: ReadonlySet<Keyword>

    /** What it does played alone, none when it cannot be seen. */
    readonly measure: CardMeasure|null

    /** What it put on the dummy and on the unit played alone, none when nothing was seen. */
    readonly effects: CardEffects|null
}

const KNOWN = new WeakMap<Card, CardFeatures>()

/** The hints of a card, found once for each card. */
export function featuresOf(card: Card): CardFeatures {
    const known = KNOWN.get(card)
    if(known) return known
    const { measure, effects } = probe(card)
    const features: CardFeatures = {
        card,
        signature: signatureOf(card),
        keywords: keywordsOf(card),
        measure,
        effects,
    }
    KNOWN.set(card, features)
    return features
}
