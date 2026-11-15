import { concat, joinText } from "../../../../semantic"
import type { Kit } from "../../sim/catalog/kits"
import { heroOf } from "../../sim/run/Hero"
import { stuffOf } from "../../sim/halt/subs/shown"
import { unitOption } from "../hud/ChoiceOptions"
import type { Entry, LibraryLook } from "./entries"

/** A kit in the catalogue: the adventurer it makes, with its hearts, its deck, its items and its usables. */
export function kitEntry(look: LibraryLook, kit: Kit): Entry {
    const hero = heroOf(kit)
    const text = stuffOf(hero)
    const cards = [...new Set(kit.cards)]
    const view = unitOption(look.theme, hero, look.sprites, cards, text, {
        onCardHover: look.onCard, perRow: look.perRow(),
    })
    // What is searched: the name, the cards, the items and the usables, which the text alone does not name.
    const search = concat(
        hero, " ", text, " ", joinText(cards, ", "), " ", joinText(hero.items, ", "), " ", joinText(hero.usables, ", "),
    )
    return { view, text, search }
}
