import { Label } from "../../../../engine/ui"
import { concat } from "../../../../semantic"
import { filterOf } from "../../sim/catalog/upgrades"
import type { CardUpgrade } from "../../sim/catalog/upgrades"
import type { Card } from "../../sim/card/Card"
import { ACTION, PREPARATION, SECRET } from "../../sim/card/CardType"
import { MysteryCard } from "./MysteryCard"
import { FusionCard } from "../../sim/card/subs/composite/FusionCard"
import { MergedCard } from "../../sim/card/subs/composite/MergedCard"
import { cardsOption } from "../hud/ChoiceOptions"
import { CHOSEN_TEXT } from "../look/theme"
import type { Entry, LibraryLook } from "./entries"

/** How an upgrade joins its card, said as it reads. */
const FUSIONS = { fusion: "collage", merge: "mélange", random: "collage ou mélange" }

/**
 * The mystery card standing in a hole of an upgrade: the filter when there is one, else what its neighbours
 * ask: what the card before it takes is what it gives, what the card after it gives is what it takes.
 */
function mysteryAt(upgrade: CardUpgrade, index: number): Card {
    const filter = filterOf(upgrade)
    if(filter) return new MysteryCard(filter.output ?? SECRET, filter.input === undefined ? SECRET : filter.input)
    const before = upgrade.chain[index - 1]
    const after = upgrade.chain[index + 1]
    const gives = after?.output
    const takes = gives === undefined || gives === ACTION || gives === PREPARATION ? null : gives
    return new MysteryCard(before?.input ?? ACTION, takes)
}

/**
 * An upgrade as it is pictured: its chain with a mystery card in each hole, joined in its way. A random
 * way is pictured as a fusion, the first it tries.
 */
export function pictured(upgrade: CardUpgrade): Card {
    const cards = upgrade.chain.map((held, index) => held ?? mysteryAt(upgrade, index))
    return upgrade.fusion === "merge" ? new MergedCard(cards) : new FusionCard(cards)
}

/** An upgrade in the catalogue: its name, its chain (`_` for a hole), and how it joins the card it improves. */
export function upgradeEntry(look: LibraryLook, upgrade: CardUpgrade): Entry {
    const chain = upgrade.chain.flatMap((held, index) => [index === 0 ? "" : " ", held ?? "_"])
    const text = concat(upgrade.name, " : ", ...chain, ", en ", FUSIONS[upgrade.fusion], ".")
    const view = cardsOption(look.theme, [pictured(upgrade)], text, {
        head: new Label(look.theme, upgrade.name, { color: CHOSEN_TEXT }), onCardHover: look.onCard, perRow: look.perRow(),
    })
    return { view, text }
}
