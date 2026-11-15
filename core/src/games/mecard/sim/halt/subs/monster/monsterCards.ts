import type { Rng } from "../../../base/Rng"
import type { Card } from "../../../card/Card"
import { Rarity } from "../../../card/Rarity"
import { BeastCard } from "../../../card/subs/beast/BeastCard"
import { ModuleCard } from "../../../card/subs/mechanic/ModuleCard"
import { ElementCard } from "../../../card/subs/spell/ElementCard"
import { firstRound, lastRound } from "../../../catalog/monsterRounds"
import type { Monster } from "../../../catalog/monsters"
import { MonsterElement } from "../../../element/subs/MonsterElement"
import { RED_HEART } from "../../../heart/subs/RedHeartKind"
import type { Potion } from "../../../potion/Potion"
import { POTIONS } from "../../../potion/subs/potions"
import type { Polarity } from "../../../status/Status"

/** A module made of a monster: the first round of its deck, as the cards a robot plays. */
export function moduleOfMonster(monster: Monster): ModuleCard {
    return new ModuleCard(`Module ${monster.name}`, firstRound(monster))
}

/**
 * A spirit made of a monster: its body, hearts and look, running as it comes at its enemies and biting as it
 * strikes, the first round of its deck and the last as the catalog writes them.
 */
export function beastCardOfMonster(monster: Monster): BeastCard {
    return new BeastCard({
        name: monster.name,
        sprite: monster.sprite,
        run: firstRound(monster),
        bite: lastRound(monster),
        hearts: [{ kind: RED_HEART, count: monster.hearts }],
        body: ["run", "bite"],
    })
}

/**
 * An element made of a monster, with a potion drawn against a unit and another for it.
 *
 * @throws {@link Error} When the catalog has no potion of a polarity.
 */
export function elementCardOfMonster(monster: Monster, rng: Rng): ElementCard {
    return new ElementCard(new MonsterElement(monster, potionOf(rng, "negative"), potionOf(rng, "positive")), Rarity.RARE)
}

/** A potion of a polarity, drawn at random. */
function potionOf(rng: Rng, polarity: Polarity): Potion {
    const potion = rng.pick(POTIONS.filter(each => each.polarity === polarity))
    if(!potion) throw new Error(`The catalog has no ${polarity} potion.`)
    return potion
}

/** A monster offered, and the card a character gets of it. */
export interface MonsterOffer {
    readonly monster: Monster
    readonly card: Card
}
