import type { Text } from "../../../../semantic"
import type { Card } from "../card/Card"
import type { Booster } from "../catalog/boosters"
import type { CardUpgrade } from "../catalog/upgrades"
import type { Item } from "../item/Item"
import type { Hero } from "../run/Hero"
import type { Usable } from "../usable/Usable"

import type { HaltMoment } from "./SceneLook"
import type { Visual } from "../base/Visual"

/** What a dialog shows of something: cards, decks with their cards, items, usables, and a text under them. */
export interface Shown {
    /** The character it gives, shown above its cards, none when it gives none. */
    readonly unit?: Hero

    readonly cards: readonly Card[]

    /** Boosters it shows, closed, in front of its cards, as the interface pictures them. */
    readonly boosters?: readonly Booster[]

    /** Upgrades it comes with, shown as the catalogue pictures them, in front of its cards. */
    readonly upgrades?: readonly CardUpgrade[]

    /** The deck of the party its cards come from or go to, which they take the color of, none for none. */
    readonly from?: readonly Card[]

    /** Decks of the party, shown whole. */
    readonly decks?: readonly (readonly Card[])[]

    readonly items?: readonly Item[]
    readonly usables?: readonly Usable[]

    /** How what it shows looks, drawn left of its text. */
    readonly sprite?: Visual

    /** What it says under the rest, nothing when the rest is enough. */
    readonly text?: Text
}

/** How many cards a dialog asks to pick, at least and at most. */
export interface Count {
    readonly min: number
    readonly max: number
}

/**
 * How a dialog may be left without choosing: back to the dialog before it, when nothing was done since,
 * else out of the place.
 */
export interface Way {
    /** What going back does, none when the dialog leaves the place instead. */
    readonly back?: () => void
}

/** How a dialog asking for some things picks them: those a test lets through, every one by default. */
export interface Choosing<T> extends Way {
    readonly among?: (thing: T) => boolean
}

/** How a dialog asking for cards picks them. */
export interface CardChoosing extends Choosing<Card> {
    /** The deck of the party the cards asked among come from, when they are not that deck itself. */
    readonly from?: readonly Card[]

    /**
     * The cards the character plays unlimited, shown after the others: each may be picked as many times as
     * the count allows, none of them being in the deck.
     */
    readonly unlimited?: readonly Card[]

    /** May the unlimited cards be picked? They are only shown when not. Yes by default. */
    readonly copies?: boolean
}

/**
 * What a halt asks the players through: dialogs, each with a way to leave the place, or to go back. A
 * dialog opens in place of the one before, and calls back once the players chose.
 *
 * @remarks
 * The dialogs call back rather than give promises, and a character asked inside the call back of a pick
 * follows it on the same screen: the screen tells so from the ask coming during the pick, which an awaited
 * ask would not.
 */
export interface HaltContext {
    /** Offer things, the players taking one. */
    offer<T>(
        title: Text, offers: readonly T[], show: (offer: T) => Shown, done: (offer: T) => void, way?: Way,
    ): void

    /** Ask for a character of the party. */
    hero(title: Text, done: (hero: Hero) => void, pick?: Choosing<Hero>): void

    /** Ask for cards among some, in the order the players pick them. */
    cards(
        title: Text, pool: readonly Card[], count: Count, done: (cards: Card[]) => void,
        pick?: CardChoosing,
    ): void

    /** Show something, and ask whether to go on with it. */
    confirm(title: Text, shown: Shown, action: string, done: () => void, way?: Way): void

    /** Say what came of the visit, then go back to the map. */
    tell(text: Text, shown?: Shown): void

    /** Go back to the map. */
    leave(): void

    /** Have the character of the place react to a moment of the visit. */
    react(moment: HaltMoment): void
}
