import {
    BEAST_KIND, BOOSTER_KIND, KIT_KIND, MODULE_KIND, MONSTER_KIND, PET_KIND,
} from "../../sim/analysis"
import type { Kind } from "../../sim/analysis"
import { BeastCard } from "../../sim/card/subs/beast/BeastCard"
import { ModuleCard } from "../../sim/card/subs/mechanic/ModuleCard"
import type { CatalogCategory } from "../../sim/save/catalogSave"
import type { Entry } from "../library/entries"

/** The category of the catalogue of the player that the things of a kind are counted in. */
export function categoryOfKind(kind: Kind<unknown>): CatalogCategory {
    switch(kind.id){
        case "monster": return "monsters"
        case "pet": return "pets"
        case "kit": return "kits"
        case "booster": return "boosters"
        default: return "cards"
    }
}

/**
 * The kind a catalogue entry is a thing of: a monster, a pet, a kit or a booster by the tab it is in, a card
 * by what it holds, a module or a beast. None for what no conversion starts from.
 */
export function kindOfEntry(category: CatalogCategory, entry: Entry): Kind<unknown>|null {
    switch(category){
        case "monsters": return MONSTER_KIND as Kind<unknown>
        case "pets": return PET_KIND as Kind<unknown>
        case "kits": return KIT_KIND as Kind<unknown>
        case "boosters": return BOOSTER_KIND as Kind<unknown>
        case "cards":
            if(entry.value instanceof ModuleCard) return MODULE_KIND as Kind<unknown>
            if(entry.value instanceof BeastCard) return BEAST_KIND as Kind<unknown>
            return null
        default: return null
    }
}
