import type { Card } from "../card/Card"
import type { Hero } from "../run/Hero"
import type { Item } from "../item/Item"
import type { Usable } from "../usable/Usable"
import { SHOT } from "../card/subs/attack/Shot"
import { SLASH } from "../card/subs/attack/Slash"
import { SWEEP } from "../card/subs/attack/Sweep"
import { THRUST } from "../card/subs/attack/Thrust"
import { BOMB } from "../card/subs/combat/Bomb"
import { DODGE_CARD } from "../card/subs/combat/DodgeCard"
import { AIM } from "../card/subs/movement/Aim"
import { BACK_DASH } from "../card/subs/movement/BackDash"
import { BLINK } from "../card/subs/movement/Blink"
import { PATH_AIM } from "../card/subs/movement/PathAim"
import { STEP } from "../card/subs/movement/Step"
import { TURN_LEFT, TURN_RIGHT } from "../card/subs/movement/TurnCard"
import { WAIT } from "../card/subs/movement/Wait"
import { FIRE, STONE, WATER } from "../card/subs/spell/ElementCard"
import { SPELL } from "../card/subs/spell/SpellCard"
import { DAGGER } from "../card/subs/attack/Dagger"
import { BLAST_MODULE, BOW_MODULE, BULL_MODULE, MISSILE } from "../card/subs/mechanic/ModuleCard"
import { IMPROVISED_ROBOT, IMPROVISED_WEAPON, TANK_ROBOT } from "../card/subs/mechanic/RobotCard"
import { ASSASSIN_STEP } from "../card/subs/movement/AssassinStep"
import { BOTTLE, THROWN_POTION } from "../card/subs/potion/PotionActions"
import { POISON, WEAKNESS } from "../card/subs/potion/PotionCard"
import { SUBSTITUTION } from "../card/subs/summon/Substitution"
import { COIN, STONE_WALL } from "../card/subs/summon/summons"

/** The cards every kit starts with before its attacks: moves, turns, aims and a wait. A dodge ends it. */
const BASICS: readonly Card[] = [STEP, STEP, STEP, BACK_DASH, TURN_LEFT, TURN_RIGHT, AIM, AIM, WAIT]

/** The basics of the kits that fight up close: one of their aims finds the way to the enemy. */
const CLOSE_BASICS: readonly Card[] = BASICS.map((card, index) => {
    return index === BASICS.indexOf(AIM) ? PATH_AIM : card
})

/** How many red hearts a character of a kit starts with. */
export const KIT_HEARTS = 6

/** A deck to start with: the basics, the attacks, then a dodge. */
function deckAround(...attacks: Card[]): Card[] {
    return [...BASICS, ...attacks, DODGE_CARD]
}

/** The cards a hero starts a run with: the basics, three copies of its attack, and a dodge. */
export function starterDeck(attack: Card): Card[] {
    return deckAround(attack, attack, attack)
}

/** A deck to start with for a kit that fights up close: its basics, the attacks, then a dodge. */
function closeDeckAround(...attacks: Card[]): Card[] {
    return [...CLOSE_BASICS, ...attacks, DODGE_CARD]
}

/**
 * What a hero starts with, at the start of a run or hired on the way: a name, a deck, items and usables.
 * A hero is known by its deck: the Lancier by its thrusts, the Épéiste by its slashes.
 *
 * @remarks
 * It holds kinds, never what a hero carries: its items and usables are the shared definitions, and
 * {@link heroOf} makes the mutable ones (the copy of the items, a {@link Carried} for each usable).
 */
export interface Kit {
    readonly name: string

    /** The picture of its character, by its name among the sprites of the units. */
    readonly sprite: string

    readonly cards: readonly Card[]

    /** The items the hero starts with. */
    readonly items: readonly Item[]

    /** The usables the hero starts with, each with all its charges. */
    readonly usables: readonly Usable[]
}

export const LANCER_KIT: Kit = { name: "Lancier", sprite: "lancer", cards: closeDeckAround(THRUST, THRUST, THRUST), items: [], usables: [] }
export const SWORDSMAN_KIT: Kit = { name: "Épéiste", sprite: "swordsman", cards: closeDeckAround(SLASH, SLASH, SLASH), items: [], usables: [] }
export const ARCHER_KIT: Kit = { name: "Archère", sprite: "archer", cards: starterDeck(SHOT), items: [], usables: [] }
export const BRAWLER_KIT: Kit = { name: "Bagarreur", sprite: "brawler", cards: closeDeckAround(SWEEP, SWEEP, SWEEP), items: [], usables: [] }
export const ARTIFICER_KIT: Kit = { name: "Artificière", sprite: "artificer", cards: deckAround(BOMB, BOMB, SLASH), items: [], usables: [] }
export const MAGE_KIT: Kit = { name: "Mage", sprite: "mage", cards: deckAround(SPELL, SPELL, FIRE, WATER, STONE), items: [], usables: [] }
export const ASSASSIN_KIT: Kit = {
    name: "Assassin", sprite: "assassin", cards: closeDeckAround(DAGGER, DAGGER, DAGGER, ASSASSIN_STEP, BLINK), items: [], usables: [],
}
export const APOTHECARY_KIT: Kit = {
    name: "Apothicaire", sprite: "apothecary", cards: deckAround(THROWN_POTION, THROWN_POTION, BOTTLE, POISON, POISON, WEAKNESS, SLASH),
    items: [], usables: [],
}
export const PUPPETEER_KIT: Kit = {
    name: "Marionnettiste", sprite: "puppeteer", cards: deckAround(COIN, COIN, SUBSTITUTION, STONE_WALL, SHOT, SHOT),
    items: [], usables: [],
}

export const MECHANIC_KIT: Kit = {
    name: "Mécanicien", sprite: "mechanic",
    cards: deckAround(
        IMPROVISED_ROBOT, IMPROVISED_ROBOT, TANK_ROBOT, IMPROVISED_WEAPON, BOW_MODULE, BULL_MODULE,
        BLAST_MODULE, MISSILE,
    ),
    items: [], usables: [],
}

/** The kits a run starts with. */
export const STARTING_KITS: readonly Kit[] = [LANCER_KIT, SWORDSMAN_KIT]

/** Every kit, the starting ones first: the tavern hires the others. */
export const KITS: readonly Kit[] = [
    ...STARTING_KITS, ARCHER_KIT, BRAWLER_KIT, ARTIFICER_KIT, MAGE_KIT, ASSASSIN_KIT, APOTHECARY_KIT,
    PUPPETEER_KIT, MECHANIC_KIT,
]

/** How many things of one list a second list shares, each one counted as many times as both hold it. */
function shared<T>(first: readonly T[], second: readonly T[]): number {
    const left = [...second]
    let count = 0
    for (const each of first) {
        const at = left.indexOf(each)
        if (at >= 0) {
            left.splice(at, 1)
            count++
        }
    }
    return count
}

/**
 * How close a hero is to a kit, from 0 (nothing in common) to 1 (the same): what their cards, items and
 * usables share, over everything they hold together.
 */
export function kitScore(hero: Hero, kit: Kit): number {
    const cards = hero.decks.flat()
    const items = hero.items
    const usables = hero.usables.map(carried => carried.usable)
    const common = shared(cards, kit.cards) + shared(items, kit.items) + shared(usables, kit.usables)
    const total = cards.length + items.length + usables.length + kit.cards.length + kit.items.length + kit.usables.length
    return total === 0 ? 0 : 2 * common / total
}

/** The kit a hero is the closest to: the first of the best when several are as close. */
export function closestKit(hero: Hero, kits: readonly Kit[] = KITS): Kit {
    let best = kits[0]
    let bestScore = -1
    for (const kit of kits) {
        const score = kitScore(hero, kit)
        if (score > bestScore) {
            best = kit
            bestScore = score
        }
    }
    return best
}
