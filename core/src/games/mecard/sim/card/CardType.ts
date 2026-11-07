import type { Action, UnitContext } from "../battle/Action"
import type { Unit } from "../battle/Unit"
import type { Element } from "../element/Element"
import type { Dose } from "../potion/Potion"

import type { Card, RewriteContext, RewriteSpot } from "./Card"

/**
 * A kind of value that flows from a card to the card on its left. `T` is that value. Compared by reference:
 * two types of the same name are still two types.
 */
export class CardType<T> {


    /** The value a card of this type gives, for the compiler only. */
    declare public readonly value?: T

    constructor(
        /** What the slot of this type is called on a card. */
        public readonly name: string,
    ){}
}

/** What a preparation does to the battle: its unit and its battle, and where it stands in the chain. */
export interface PrepareContext extends UnitContext {
    readonly spot: RewriteSpot
}

/** What a preparation is rewritten into: the cards in its place, and how many cards on its right go too. */
export interface Rewrite {
    readonly cards: readonly Card[]

    /** How many cards on its right the cards replace too, none by default. */
    readonly consumed: number

    /**
     * Does it act on the battle there, beyond the cards it gives: a draw, a card put in the hand? It then
     * plays even when it gives nothing.
     */
    readonly acting: boolean
}

/**
 * What a preparation card gives: a rewrite of the chain at the end of the preparation, and maybe an effect
 * on the battle, done just before.
 *
 * @remarks
 * Its rewrite touches nothing but the chain: a preview, the screen, a search for a card that fits all play
 * it on a copy of the chain, to see what the chain becomes and what reads in it. Its effect on the battle is
 * done once, at the real end of a preparation, never otherwise.
 */
export interface Preparation {
    /** What it is replaced by, from where it stands. Pure: it changes nothing. */
    rewrite(ctx: RewriteContext, spot: RewriteSpot): Rewrite

    /** What it does to the battle, at the real end of a preparation only, before its rewrite. */
    prepare?(ctx: PrepareContext): void
}

/** Actions: the steps they put in the queue, one or more. */
export const ACTION = new CardType<readonly Action[]>("action")

/** What rewrites the chain at the end of the preparation, and maybe acts then. */
export const PREPARATION = new CardType<Preparation>("préparation")

/** An element, for a spell. */
export const ELEMENT = new CardType<Element>("élément")

/** A dose of a potion, for a card pouring it. */
export const POTION = new CardType<Dose>("potion")

/**
 * A piece of a machine: the cards it plays, and what it does to the body built from it. Whatever must be
 * drawn at random is drawn when it is read, with the chance given.
 */
export interface Module {
    /** The cards it holds, in the order they play. */
    cards(pick: <T>(options: readonly T[]) => T): readonly Card[]

    /** Do what it does to the body built from it, a robot. */
    tune(body: Unit): void
}

/** The cards of a machine, for a card building it or putting them in the chain. */
export const MODULE = new CardType<Module>("module")
