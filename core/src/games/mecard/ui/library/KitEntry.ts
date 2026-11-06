import type { Kit } from "../../sim/catalog/kits"
import { heroOf } from "../../sim/run/Hero"
import { stuffOf } from "../../sim/halt/subs/shown"
import { cardsOption, unitHead } from "../hud/ChoiceOptions"
import type { Entry, LibraryLook } from "./entries"

/** A kit in the catalogue: the adventurer it makes, with its hearts, its deck, its items and its usables. */
export function kitEntry(look: LibraryLook, kit: Kit): Entry {
    const hero = heroOf(kit)
    const text = stuffOf(hero)
    const view = cardsOption(look.theme, [...new Set(kit.cards)], text, {
        head: unitHead(look.theme, hero, look.sprites), onCardHover: look.onCard, perRow: look.perRow(),
    })
    return { view, text }
}
