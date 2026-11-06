import { Hand, Label } from "../../../../engine/ui"
import { concat, joinText } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import type { Booster } from "../../sim/catalog/boosters"
import { CardView } from "../hud/CardView"
import { cardsOption } from "../hud/ChoiceOptions"
import { engineColor } from "../look/colors"
import type { Entry, LibraryLook } from "./entries"

/** What a booster holds, pool after pool: how many cards it draws from which cards. */
function poolsText(booster: Booster): Text {
    return concat(...booster.pools.flatMap(({ count, pool }, index) => {
        return [index === 0 ? "" : " · ", `${count} parmi `, joinText(pool, ", ")]
    }))
}

/**
 * A booster in the catalogue: its name in its color, its cards in one row that overlaps when the entry is too
 * narrow for them, each shown whole under the pointer, and what it draws.
 */
export function boosterEntry(look: LibraryLook, booster: Booster): Entry {
    const text = concat(booster.name, " : ", poolsText(booster))
    const hand = new Hand({ gap: 2 })
    for(const card of new Set([booster.icon, ...booster.pools.flatMap(({ pool }) => pool)])){
        const view = new CardView(look.theme, card, "hand")
        view.onHover = over => look.onCard(card, over)
        hand.add(view)
    }
    const view = cardsOption(look.theme, [], poolsText(booster), {
        head: new Label(look.theme, booster.name, { color: engineColor(booster.color) }), under: hand,
    })
    return { view, text }
}
