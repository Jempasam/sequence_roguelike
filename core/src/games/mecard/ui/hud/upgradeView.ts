import type { Theme } from "../../../../engine/ui"
import { filterOf } from "../../sim/catalog/upgrades"
import type { CardUpgrade } from "../../sim/catalog/upgrades"
import type { Card } from "../../sim/card/Card"
import { ACTION, PREPARATION, SECRET } from "../../sim/card/CardType"
import { FusionCard } from "../../sim/card/subs/composite/FusionCard"
import { MergedCard } from "../../sim/card/subs/composite/MergedCard"
import { MysteryCard } from "./MysteryCard"
import { CardView } from "./CardView"

/**
 * The mystery card standing in a hole of an upgrade: the filter when there is one, else what its neighbours
 * ask: what the card before it takes is what it gives, what the card after it gives is what it takes.
 */
function mysteryAt(upgrade: CardUpgrade, index: number): Card {
    const filter = filterOf(upgrade)
    if(filter){
        return new MysteryCard(filter.output ?? SECRET, filter.input === undefined ? SECRET : filter.input)
    }
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

/** An upgrade as a card of a hand, its chain with a mystery card in each hole. */
export function upgradeView(theme: Theme, upgrade: CardUpgrade): CardView {
    return new CardView(theme, pictured(upgrade), "hand")
}
