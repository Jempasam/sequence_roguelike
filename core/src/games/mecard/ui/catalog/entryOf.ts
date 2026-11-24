import { concat } from "../../../../semantic"
import type { Kind, Target } from "../../sim/analysis"
import type { Card } from "../../sim/card/Card"
import type { Booster } from "../../sim/catalog/boosters"
import type { Kit } from "../../sim/catalog/kits"
import type { Monster } from "../../sim/catalog/monsters"
import { allyOf, foeOf } from "../../sim/run/Hero"
import { cardsOption } from "../hud/ChoiceOptions"
import { boosterEntry } from "../library/BoosterEntry"
import { monsterEntry } from "../library/entries"
import type { Entry, LibraryLook } from "../library/entries"
import { kitEntry } from "../library/KitEntry"

/** The name of what a target built: a kind knows how, what is only built is a card, named as cards are. */
export function nameOfMade(target: Target<unknown>, value: unknown): string {
    return "nameOf" in target ? (target as Kind<unknown>).nameOf(value) : (value as Card).name
}

/**
 * How a thing a conversion built looks in a list: the entry the catalogue makes of a monster, a pet, a kit or
 * a booster, a card for a module, a beast, a fusion, a mix or an element. Its key is its name.
 */
export function entryOf(look: LibraryLook, kind: Target<unknown>, value: unknown): Entry {
    const name = nameOfMade(kind, value)
    switch(kind.id){
        case "monster": {
            const monster = value as Monster
            return monsterEntry(look, monster, foeOf(monster, monster.name))
        }
        case "pet": {
            const pet = value as Monster
            return monsterEntry(look, pet, allyOf(pet, pet.name))
        }
        case "kit": return { ...kitEntry(look, value as Kit), key: name, value }
        case "booster": return { ...boosterEntry(look, value as Booster), key: name, value }
        default: {
            const card = value as Card
            const text = concat(card, " : ", card.description)
            const view = cardsOption(look.theme, [card], card.description, { perRow: look.perRow() })
            return { view, text, key: name, value }
        }
    }
}
