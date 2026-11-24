import type { Rng } from "../../../base/Rng"
import {
    beastOf, boosterOf, convert, convertMany, ELEMENT_TARGET, FUSION_TARGET, moduleOf, MONSTER_KIND,
    NoResultError,
} from "../../../analysis"
import type { Card } from "../../../card/Card"
import type { BeastCard } from "../../../card/subs/beast/BeastCard"
import type { FusionCard } from "../../../card/subs/composite/FusionCard"
import type { ModuleCard } from "../../../card/subs/mechanic/ModuleCard"
import type { ElementCard } from "../../../card/subs/spell/ElementCard"
import type { Booster } from "../../../catalog/boosters"
import { LOOT_MONSTERS } from "../../../catalog/monsters"
import type { Monster } from "../../../catalog/monsters"
import { INVENTED_COUNTS } from "../../../run/offers"

/** A module made of a monster: the chain of its deck that leads its fight, as the cards a robot plays. */
export function moduleOfMonster(monster: Monster): ModuleCard {
    return moduleOf(MONSTER_KIND, monster)
}

/**
 * A spirit made of a monster: its body, hearts and look, running with the cards of its deck that carry it
 * forward and biting with those that strike, as the analysis of its deck reads them.
 */
export function beastCardOfMonster(monster: Monster): BeastCard {
    return beastOf(MONSTER_KIND, monster)
}

/** A fusion of a monster: the chain of its deck that stands for it, named after its rarest card and it. */
export function fusionOfMonster(monster: Monster): FusionCard {
    return convert(MONSTER_KIND, monster, FUSION_TARGET)
}

/** A booster of a monster: a pool for each link of the chain that stands for it, one card drawn from each. */
export function boosterOfMonster(monster: Monster): Booster {
    return boosterOf(MONSTER_KIND, monster)
}

/**
 * An element made of monsters, as the conversion makes it: the effects their cards put on others and on
 * themselves, the body named after them all.
 *
 * @throws {@link NoResultError} When they have not the effects an element is made of.
 */
export function elementCardOfMonsters(monsters: readonly Monster[]): ElementCard {
    return convertMany(monsters.map(value => ({ kind: MONSTER_KIND, value })), ELEMENT_TARGET)
}

/** How many pairs of monsters are tried at most to find the elements a halt offers. */
const PAIR_ATTEMPTS = 200

/**
 * The elements a halt offers, each made of two monsters of the loot drawn at random that make one: pairs that
 * do not are drawn again, up to a limit, so fewer may be offered but never none for want of trying forever.
 */
export function offeredElements(
    rng: Rng, count = INVENTED_COUNTS, pool: readonly Monster[] = LOOT_MONSTERS,
): MonsterOffer[] {
    const offers: MonsterOffer[] = []
    const seen = new Set<string>()
    for(let attempt = 0; attempt < PAIR_ATTEMPTS && offers.length < count && pool.length >= 2; attempt++){
        const left = [...pool]
        rng.shuffle(left)
        const sources = left.slice(0, 2)
        const key = sources.map(monster => monster.name).sort().join("+")
        if(seen.has(key)) continue
        seen.add(key)
        try {
            offers.push({ sources, card: elementCardOfMonsters(sources) })
        }
        catch(error){
            if(!(error instanceof NoResultError)) throw error
        }
    }
    return offers
}

/** Monsters offered, and the card a character gets of them. */
export interface MonsterOffer {
    readonly sources: readonly Monster[]
    readonly card: Card
}
