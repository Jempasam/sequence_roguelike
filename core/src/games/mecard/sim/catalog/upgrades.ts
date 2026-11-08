import type { Rng } from "../base/Rng"
import type { Card } from "../card/Card"
import { readsWhole, signatureOf } from "../card/CardChain"
import type { CardType } from "../card/CardType"
import { ACTION, ELEMENT, MODULE, POTION } from "../card/CardType"
import { RECOVERY } from "../card/subs"
import { DELAYED_CHARGE } from "../card/subs/modifier/Wrappers"
import { TORNADO } from "../card/subs/modifier/Tornado"
import { AIM } from "../card/subs/movement/Aim"
import { DISTILLATION } from "../card/subs/potion/PotionCard"
import { DRAW } from "../card/subs/preparation/Draw"
import { PRAYER } from "../card/subs/preparation/Prayer"
import { SHOT } from "../card/subs/attack/Shot"
import { SLASH } from "../card/subs/attack/Slash"
import { SWEEP } from "../card/subs/attack/Sweep"
import { THRUST } from "../card/subs/attack/Thrust"
import { FusionCard } from "../card/subs/composite/FusionCard"
import { MergedCard } from "../card/subs/composite/MergedCard"
import {
    ARMOR_PLATING, HOMING_HEAD, INVERTER, MODULE_CORE, MODULE_MIXER, RECYCLING, REPEATER, THRUSTERS, TURBO,
} from "../card/subs/mechanic/ModuleModifiers"
import { DOUBLE_DIAGONAL } from "../card/subs/modifier/DoubleDiagonal"
import { REPEAT_2 } from "../card/subs/modifier/RepeatCard"
import { STEP } from "../card/subs/movement/Step"
import { FIRE, LIGHTNING, PLANT, STONE, WATER, WIND } from "../card/subs/spell/ElementCard"
import { REACTION } from "../card/subs/spell/ElementRewrites"
import { LOOT_CARDS } from "./index"

/** How an upgrade and its card become one: a fusion, a merge, or one of the two, by chance. */
export type UpgradeFusion = "fusion"|"merge"|"random"

/** What a card must take and give to be improved by an upgrade. */
export interface UpgradeFilter {
    /** What it must take; any card whatever it takes when missing. */
    readonly input?: CardType<unknown>|null
    /** What it must give; any card whatever it gives when missing. */
    readonly output?: CardType<unknown>
}

/**
 * An improvement: a chain of cards, with holes where the improved card goes, a way the cards become one, and
 * maybe a filter on the improved card. Without a filter, the card fits when the filled chain reads whole.
 */
export interface CardUpgrade {
    readonly name: string
    /** The chain: each `undefined` is a hole, filled with a copy of the improved card. */
    readonly chain: readonly (Card|undefined)[]
    /** What the improved card must take and give; computed from the chain when missing. */
    readonly filter?: UpgradeFilter
    readonly fusion: UpgradeFusion
}

/** What a merge asks of each card: an action taking nothing. */
const MERGED_FILTER: UpgradeFilter = { input: null, output: ACTION }

/**
 * What an upgrade asks of the card it improves, if it says: the filter it was given, and for a merge, always an
 * action taking nothing, as a merge holds no other card.
 */
export function filterOf(upgrade: CardUpgrade): UpgradeFilter|undefined {
    return upgrade.fusion === "merge" ? MERGED_FILTER : upgrade.filter
}

/** The chain with a copy of the card in each hole. */
export function filled(upgrade: CardUpgrade, card: Card): Card[] {
    return upgrade.chain.map(held => held ?? card)
}

/** Can cards be merged: do all give actions on their own? */
function mergeable(cards: readonly Card[]): boolean {
    return cards.every(card => card.output === ACTION && card.input === null)
}

/** Does a card agree with a filter on what it takes and gives? */
function passes(filter: UpgradeFilter, card: Card): boolean {
    const { input, output } = signatureOf(card)
    return (filter.input === undefined || input === filter.input) && (filter.output === undefined || output === filter.output)
}

/** The ways an upgrade may join a card, in the order they are tried: none when the card does not fit. */
function waysOf(upgrade: CardUpgrade, card: Card): ("fusion"|"merge")[] {
    const cards = filled(upgrade, card)
    if(upgrade.fusion === "merge") return mergeable(cards) ? ["merge"] : []
    if(!(upgrade.filter ? passes(upgrade.filter, card) : readsWhole(cards))) return []
    if(upgrade.fusion === "fusion") return ["fusion"]
    return mergeable(cards) ? ["fusion", "merge"] : ["fusion"]
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
    const cards = filled(upgrade, card)
    return way === "merge" ? new MergedCard(cards) : new FusionCard(cards)
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
export function upgradesFor(card: Card, upgrades: readonly CardUpgrade[] = ALL_UPGRADES): CardUpgrade[] {
    return upgrades.filter(upgrade => upgradeMatches(upgrade, card))
}

/**
 * A card of the loot, upgraded: an upgrade at random, then a card of the loot it matches at random, the two
 * made one. None when no card of the loot matches the upgrades.
 */
export function lootUpgraded(rng: Rng, upgrades: readonly CardUpgrade[] = LOOT_UPGRADES, loot: readonly Card[] = LOOT_CARDS): Card|null {
    const left = [...upgrades]
    rng.shuffle(left)
    for(const upgrade of left){
        const cards = loot.filter(card => upgradeMatches(upgrade, card))
        const card = rng.pick(cards)
        if(card) return upgraded(upgrade, card, rng)
    }
    return null
}

/** An upgrade made of a chain with holes, any number of them, and any number of cards of its own. */
export function upgrade(name: string, chain: readonly (Card|undefined)[], fusion: UpgradeFusion = "fusion", filter?: UpgradeFilter): CardUpgrade {
    return { name, chain, filter, fusion }
}

/** An upgrade giving a card in front of the cards it fuses with. */
function front(name: string, card: Card, fusion: UpgradeFusion = "fusion"): CardUpgrade {
    return upgrade(name, [card, undefined], fusion)
}

/** An upgrade giving a card behind the cards it fuses with. */
function back(name: string, card: Card, fusion: UpgradeFusion = "fusion"): CardUpgrade {
    return upgrade(name, [undefined, card], fusion)
}

/**
 * An upgrade for a spell, a card giving an action from an element: behind it, a Réaction and an element, which
 * reacts with the one the player puts after. The chain does not read whole by itself, so the filter says what fits.
 */
function reacting(name: string, element: Card): CardUpgrade {
    return upgrade(`Réaction de ${name.toLowerCase()}`, [undefined, REACTION, element], "fusion", { input: ELEMENT })
}

/**
 * An upgrade for a card giving an action from a module: behind it, a modifier of that module. The modifier
 * waits for the module the player puts after, so the filter says what fits.
 */
function modified(modifier: Card): CardUpgrade {
    return upgrade(modifier.name, [undefined, modifier], "fusion", { input: MODULE })
}

/** An upgrade putting a modifier of modules in front of any card giving a module. */
function modifying(modifier: Card): CardUpgrade {
    return upgrade(`${modifier.name} devant`, [modifier, undefined], "fusion", { output: MODULE })
}

/** An upgrade making an element react with the one of the card it improves: a Réaction, the element, the card. */
function reactive(name: string, element: Card): CardUpgrade {
    return upgrade(name, [REACTION, element, undefined], "fusion", { input: null, output: ELEMENT })
}

/** Every upgrade of the game, each written by hand. */
export const ALL_UPGRADES: readonly CardUpgrade[] = [
    front("Écho", REPEAT_2),
    front("Double diagonale", DOUBLE_DIAGONAL),
    upgrade("Récupération", [RECOVERY, undefined], "fusion", {}),
    front("Élan", STEP, "merge"),

    upgrade("Provision", [DRAW, undefined], "fusion", {}),
    upgrade("Bénédiction", [PRAYER, undefined], "fusion", {}),
    upgrade("Visée", [AIM, undefined], "merge"),
    upgrade("Tourbillon", [TORNADO, undefined], "fusion", { output: ACTION }),
    upgrade("Charge retardée", [DELAYED_CHARGE, undefined], "fusion", { output: ACTION }),
    upgrade("Triplé", [undefined, undefined, undefined], "fusion", { input: null, output: ACTION }),
    upgrade("Alambic", [DISTILLATION, undefined], "fusion", { output: POTION }),
    upgrade("Concentré", [undefined, DISTILLATION], "fusion", { input: POTION }),

    // A Réaction, an element, then the element of the card: the two react.
    reactive("Feu réactif", FIRE),
    reactive("Eau réactive", WATER),
    reactive("Plante réactive", PLANT),
    reactive("Pierre réactive", STONE),
    reactive("Vent réactif", WIND),
    reactive("Foudre réactive", LIGHTNING),

    // A spell, then a Réaction, then an element: what is plugged into the spell reacts with it.
    reacting("Feu", FIRE),
    reacting("Eau", WATER),
    reacting("Plante", PLANT),
    reacting("Pierre", STONE),
    reacting("Vent", WIND),
    reacting("Foudre", LIGHTNING),

    // Behind a robot, a modifier of its module: the module itself comes from what the player puts after.
    modified(THRUSTERS), modified(ARMOR_PLATING), modified(TURBO), modified(HOMING_HEAD), modified(MODULE_MIXER),
    modified(RECYCLING), modified(REPEATER), modified(INVERTER), modified(MODULE_CORE),

    // A modifier in front of any card giving a module, whatever it takes: the modifier modifies it.
    modifying(THRUSTERS), modifying(ARMOR_PLATING), modifying(TURBO), modifying(HOMING_HEAD), modifying(MODULE_MIXER),
    modifying(RECYCLING), modifying(REPEATER), modifying(INVERTER), modifying(MODULE_CORE),
    back("Tir", SHOT, "merge"),
    back("Taille", SLASH, "merge"),
    back("Estoc", THRUST, "merge"),
    back("Balayage", SWEEP, "merge"),
]

/** The upgrades a trainer or a magician gives: all of them for now. */
export const LOOT_UPGRADES: readonly CardUpgrade[] = ALL_UPGRADES
