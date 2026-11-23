import { concat, joinText } from "../../../../semantic"
import type { Kit } from "../../sim/catalog/kits"
import { heroOf } from "../../sim/run/Hero"
import { stuffOf } from "../../sim/halt/subs/shown"
import { unitView } from "../hud/unitView"
import type { Unkeyed, LibraryLook } from "./entries"

/** A kit in the catalogue: the adventurer it makes, with its hearts, its deck, its items and its usables. */
export function kitEntry(look: LibraryLook, kit: Kit): Unkeyed {
    const hero = heroOf(kit)
    const text = stuffOf(hero)
    const view = unitView(look.theme, look.sprites, hero, { perRow: look.perRow() })
    // What is searched: the name, the cards, the items and the usables, which the text alone does not name.
    const search = concat(
        hero, " ", text, " ", joinText([...new Set(kit.cards)], ", "), " ", joinText(hero.items, ", "), " ",
        joinText(hero.usables, ", "),
    )
    return { view, text, search }
}
