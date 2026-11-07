import type { Rng } from "../base/Rng"
import type { Card } from "../card/Card"
import { readsWhole } from "../card/CardChain"
import { ACTION } from "../card/CardType"
import { SHOT } from "../card/subs/attack/Shot"
import { SLASH } from "../card/subs/attack/Slash"
import { SWEEP } from "../card/subs/attack/Sweep"
import { THRUST } from "../card/subs/attack/Thrust"
import { FusionCard } from "../card/subs/composite/FusionCard"
import { MergedCard } from "../card/subs/composite/MergedCard"
import { BLAST_MODULE, BOW_MODULE, BULL_MODULE, MISSILE } from "../card/subs/mechanic/ModuleCard"
import { IMPROVISED_ROBOT } from "../card/subs/mechanic/RobotCard"
import { DOUBLE_DIAGONAL } from "../card/subs/modifier/DoubleDiagonal"
import { REPEAT_2 } from "../card/subs/modifier/RepeatCard"
import { STEP } from "../card/subs/movement/Step"
import { THROWN_POTION } from "../card/subs/potion/PotionActions"
import { ELEMENT_CARDS } from "../card/subs/spell/ElementCard"
import { SPELL } from "../card/subs/spell/SpellCard"
import { LOOT_CARDS } from "./index"

/** Where an upgrade goes, beside the card it improves: in front of it, or behind it. */
export type UpgradePlacement = "front"|"back"

/** How an upgrade and its card become one: a fusion, a merge, or one of the two, by chance. */
export type UpgradeFusion = "fusion"|"merge"|"random"

/**
 * An improvement to stick in front of a card or behind it: a card, where it goes, and how the two become
 * one card.
 */
export interface CardUpgrade {
    readonly name: string
    readonly card: Card
    readonly placement: UpgradePlacement
    readonly fusion: UpgradeFusion
}

/** The cards as they would lie in a row: the upgrade in front of the card, or behind it. */
function paired(upgrade: CardUpgrade, card: Card): [Card, Card] {
    return upgrade.placement === "front" ? [upgrade.card, card] : [card, upgrade.card]
}

/** Can two cards be merged: do both give actions on their own? */
function mergeable([first, second]: readonly [Card, Card]): boolean {
    return [first, second].every(card => card.output === ACTION && card.input === null)
}

/** The ways an upgrade may join a card, in the order they are tried: none when they do not read whole. */
function waysOf(upgrade: CardUpgrade, card: Card): ("fusion"|"merge")[] {
    const pair = paired(upgrade, card)
    if(upgrade.fusion === "merge") return mergeable(pair) ? ["merge"] : []
    if(!readsWhole(pair)) return []
    if(upgrade.fusion === "fusion") return ["fusion"]
    return mergeable(pair) ? ["fusion", "merge"] : ["fusion"]
}

/**
 * Does an upgrade match a card: by its place, do what the one takes and what the other gives agree, and
 * for a merge, do both give actions on their own?
 */
export function upgradeMatches(upgrade: CardUpgrade, card: Card): boolean {
    return waysOf(upgrade, card).length > 0
}

/**
 * The card an upgrade makes with a card: both, in their place, as a fusion or as a merge, the chance of a
 * random one drawn from `rng`.
 *
 * @throws {@link Error} When the upgrade does not match the card.
 */
export function upgraded(upgrade: CardUpgrade, card: Card, rng: Rng): Card {
    const ways = waysOf(upgrade, card)
    if(ways.length === 0) throw new Error(`${upgrade.name} does not match ${card.name}.`)
    const way = ways.length === 1 ? ways[0] : rng.pick(ways) ?? ways[0]
    const pair = paired(upgrade, card)
    return way === "merge" ? new MergedCard(pair) : new FusionCard(pair)
}

/** Does an upgrade match every card of a list? */
export function upgradeFitsAll(upgrade: CardUpgrade, cards: readonly Card[]): boolean {
    return cards.every(card => upgradeMatches(upgrade, card))
}

/**
 * The cards of a list with an upgrade put on each it matches, the others left as they are, the copies of a
 * card all alike.
 */
export function upgradeAll(upgrade: CardUpgrade, cards: readonly Card[], rng: Rng): Card[] {
    const made = new Map<Card, Card>()
    return cards.map(card => {
        if(!made.has(card)) made.set(card, upgradeMatches(upgrade, card) ? upgraded(upgrade, card, rng) : card)
        return made.get(card) ?? card
    })
}

/** The upgrades of a list that match a card. */
export function upgradesFor(card: Card, upgrades: readonly CardUpgrade[] = UPGRADES): CardUpgrade[] {
    return upgrades.filter(upgrade => upgradeMatches(upgrade, card))
}

/**
 * A card of the loot, upgraded: an upgrade at random, then a card of the loot it matches at random, the two
 * made one. None when no card of the loot matches the upgrades.
 */
export function lootUpgraded(rng: Rng, upgrades: readonly CardUpgrade[] = UPGRADES, loot: readonly Card[] = LOOT_CARDS): Card|null {
    const left = [...upgrades]
    rng.shuffle(left)
    for(const upgrade of left){
        const cards = loot.filter(card => upgradeMatches(upgrade, card))
        const card = rng.pick(cards)
        if(card) return upgraded(upgrade, card, rng)
    }
    return null
}

/** An upgrade giving a card in front of the cards it fuses with. */
function front(name: string, card: Card, fusion: UpgradeFusion = "fusion"): CardUpgrade {
    return { name, card, placement: "front", fusion }
}

/** An upgrade giving a card behind the cards it fuses with. */
function back(name: string, card: Card, fusion: UpgradeFusion = "fusion"): CardUpgrade {
    return { name, card, placement: "back", fusion }
}

/** Every upgrade of the game, each written by hand. */
export const UPGRADES: readonly CardUpgrade[] = [
    front("Écho", REPEAT_2),
    front("Double diagonale", DOUBLE_DIAGONAL),
    front("Incantation", SPELL),
    front("Automate", IMPROVISED_ROBOT),
    front("Jet", THROWN_POTION),
    front("Élan", STEP, "random"),
    back("Feu", ELEMENT_CARDS[0]),
    back("Eau", ELEMENT_CARDS[1]),
    back("Plante", ELEMENT_CARDS[2]),
    back("Pierre", ELEMENT_CARDS[3]),
    back("Vent", ELEMENT_CARDS[4]),
    back("Foudre", ELEMENT_CARDS[5]),
    back("Module d'arc", BOW_MODULE),
    back("Module de taureau", BULL_MODULE),
    back("Module d'explosion", BLAST_MODULE),
    back("Missile", MISSILE),
    back("Tir", SHOT),
    back("Taille", SLASH),
    back("Estoc", THRUST),
    back("Balayage", SWEEP),
    back("Fente", THRUST, "merge"),
]
