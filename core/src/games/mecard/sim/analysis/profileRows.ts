import type { Card } from "../card/Card"

import type { Kind } from "./Kinds"
import { featuresOf } from "./CardFeatures"
import type { CardMeasure } from "./CardProbe"
import { profileOf } from "./Profile"
import type { Profile } from "./Profile"

/** How a card of a source was read: the profile it was told to be for, and what it did played alone. */
export interface ProfileRow {
    readonly card: Card
    readonly profile: Profile
    readonly measure: CardMeasure|null
}

/** How each card of a thing of a kind was read, each card once, in the order of its chain or its set. */
export function profileRows(kind: Kind<unknown>, value: unknown): ProfileRow[] {
    const anatomy = kind.anatomy(value)
    const cards = [...new Set(anatomy.ordered ? anatomy.chain : anatomy.parts)]
    return cards.map(card => ({ card, profile: profileOf(card), measure: featuresOf(card).measure }))
}
