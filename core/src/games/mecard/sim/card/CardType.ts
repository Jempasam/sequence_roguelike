import type { Action, UnitContext } from "../battle/Action"
import type { Unit } from "../battle/Unit"
import type { Element } from "../element/Element"
import type { Dose } from "../potion/Potion"
import type { Visual } from "../base/Visual"
import type { HeartKind } from "../heart/HeartKind"

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

    /** How many cards on its left the cards replace too, none by default: the card before it goes with it. */
    readonly before?: number
}

/**
 * When a preparation is rewritten, and so what it reads: `prepfull` ones go first, from left to right, and
 * read preparations not rewritten yet, the cards on their right as they are written. `prepless` ones go
 * after, from right to left, and read what the cards on their right have become: nothing there is left to
 * rewrite.
 */
export type PrepPhase = "prepfull"|"prepless"

/**
 * What a preparation card gives: a rewrite of the chain at the end of the preparation, and maybe an effect
 * on the battle, done just before.
 *
 * @remarks
 * Its rewrite touches nothing but the chain: a preview, the screen, a search for a card that fits all play
 * it on a copy of the chain, to see what the chain becomes and what reads in it. Its effect on the battle is
 * done once, at the real end of a preparation, never otherwise.
 *
 * Its phase never depends on what the card takes: it is told by building the preparation, which only builds
 * it and rewrites nothing.
 */
export interface Preparation {
    /** When it is rewritten. */
    readonly phase: PrepPhase

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

/** What is not known: the type of a card standing for any card, pictured only. */
export const SECRET = new CardType<unknown>("secret")

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

/** A group of hearts of a kind, as a body has them. */
export interface BeastHearts {
    readonly kind: HeartKind
    readonly count: number
}

/** A part of the chain a body plays: a card, or the place of the run or of the bite it is given. */
export type BodyPart = Card|"run"|"bite"

/**
 * A spirit of nature: how it runs, how it bites, and the body it is summoned in. Only data: each places its
 * run and its bite in its body its own way, told by `body`.
 */
export interface Beast {
    readonly name: string

    /** How its body looks, summoned. */
    readonly sprite: Visual

    /** Its run: the cards it moves with. */
    readonly run: readonly Card[]

    /** Its bite: the cards it attacks with. */
    readonly bite: readonly Card[]

    /** The hearts of its body, before what the summoning of its owner adds to the first group. */
    readonly hearts: readonly BeastHearts[]

    /** The chain its body plays round after round, where the run and the bite given, its own or another beast's, stand. */
    readonly body: readonly BodyPart[]
}

/** A spirit of nature, for a card using its run, its bite or its body. */
export const BEAST = new CardType<Beast>("bête")
