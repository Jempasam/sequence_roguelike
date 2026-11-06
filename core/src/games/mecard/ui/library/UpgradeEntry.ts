import { Label } from "../../../../engine/ui"
import { concat } from "../../../../semantic"
import type { CardUpgrade } from "../../sim/catalog/upgrades"
import type { Card } from "../../sim/card/Card"
import { ACTION, PREPARATION } from "../../sim/card/CardType"
import { MysteryCard } from "./MysteryCard"
import { FusionCard } from "../../sim/card/subs/composite/FusionCard"
import { MergedCard } from "../../sim/card/subs/composite/MergedCard"
import { cardsOption } from "../hud/ChoiceOptions"
import { CHOSEN_TEXT } from "../look/theme"
import type { Entry, LibraryLook } from "./entries"

/** Where an upgrade goes, said as it reads. */
const PLACEMENTS = { front: "devant", back: "derrière" }

/** How an upgrade joins its card, said as it reads. */
const FUSIONS = { fusion: "collage", merge: "mélange", random: "collage ou mélange" }

/**
 * The mystery card an upgrade reads with: in front of it, what the upgrade takes is what the card gives;
 * behind it, what the upgrade gives is what the card takes, unless it gives actions on its own.
 */
function mysteryFor(upgrade: CardUpgrade): Card {
    const { input, output } = upgrade.card
    if(upgrade.placement === "front") return new MysteryCard(input ?? ACTION)
    return output === ACTION || output === PREPARATION ? new MysteryCard() : new MysteryCard(ACTION, output)
}

/**
 * An upgrade as it is pictured: its card joined to a mystery card, in its place and in its way. A random
 * way is pictured as a fusion, the first it tries.
 */
function pictured(upgrade: CardUpgrade): Card {
    const mystery = mysteryFor(upgrade)
    const pair: [Card, Card] = upgrade.placement === "front" ? [upgrade.card, mystery] : [mystery, upgrade.card]
    return upgrade.fusion === "merge" ? new MergedCard(pair[0], pair[1]) : new FusionCard(pair)
}

/** An upgrade in the catalogue: its name, its card, and where and how it joins the card it improves. */
export function upgradeEntry(look: LibraryLook, upgrade: CardUpgrade): Entry {
    const text = concat(
        upgrade.name, " : ", upgrade.card, ", ", PLACEMENTS[upgrade.placement], " la carte, en ",
        FUSIONS[upgrade.fusion], ".",
    )
    const view = cardsOption(look.theme, [pictured(upgrade)], text, {
        head: new Label(look.theme, upgrade.name, { color: CHOSEN_TEXT }), onCardHover: look.onCard, perRow: look.perRow(),
    })
    return { view, text }
}
