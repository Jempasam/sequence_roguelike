import { Label } from "../../../../engine/ui"
import { concat } from "../../../../semantic"
import type { CardUpgrade } from "../../sim/catalog/upgrades"
import { cardsOption } from "../hud/ChoiceOptions"
import { pictured } from "../hud/upgradeView"
import { CHOSEN_TEXT } from "../look/theme"
import type { Unkeyed, LibraryLook } from "./entries"

/** How an upgrade joins its card, said as it reads. */
const FUSIONS = { fusion: "collage", merge: "mélange", random: "collage ou mélange" }

/** An upgrade in the catalogue: its name, its chain (`_` for a hole), and how it joins the card it improves. */
export function upgradeEntry(look: LibraryLook, upgrade: CardUpgrade): Unkeyed {
    const chain = upgrade.chain.flatMap((held, index) => [index === 0 ? "" : " ", held ?? "_"])
    const text = concat(upgrade.name, " : ", ...chain, ", en ", FUSIONS[upgrade.fusion], ".")
    const view = cardsOption(look.theme, [pictured(upgrade)], text, {
        head: new Label(look.theme, upgrade.name, { color: CHOSEN_TEXT }), perRow: look.perRow(),
    })
    return { view, text }
}
