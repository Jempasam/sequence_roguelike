import { Label, OverflowContainer } from "../../../../engine/ui"
import { concat } from "../../../../semantic"
import { boosterPoolsText as poolsText } from "../../sim/catalog/boosters"
import type { Booster } from "../../sim/catalog/boosters"
import { CardView } from "../hud/CardView"
import { cardsOption } from "../hud/ChoiceOptions"
import { engineColor } from "../look/colors"
import type { Unkeyed, LibraryLook } from "./entries"

/**
 * A booster in the catalogue: its name in its color, its cards in one row that overlaps when the entry is too
 * narrow for them, each shown whole under the pointer, and what it draws.
 */
export function boosterEntry(look: LibraryLook, booster: Booster): Unkeyed {
    const text = concat(booster, " : ", poolsText(booster))
    const hand = new OverflowContainer({ gap: 2 })
    for(const card of new Set([booster.icon, ...booster.pools.flatMap(({ pool }) => pool)])){
        const view = new CardView(look.theme, card, "hand")
        hand.add(view)
    }
    const view = cardsOption(look.theme, [], poolsText(booster), {
        head: new Label(look.theme, booster.name, { color: engineColor(booster.color) }), under: hand,
    })
    return { view, text }
}
