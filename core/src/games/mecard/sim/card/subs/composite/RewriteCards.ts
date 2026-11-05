import type { Text } from "../../../../../../semantic"
import type { Card, RewriteContext, RewriteSpot } from "../../Card"
import { POTION, PREPARATION } from "../../CardType"
import type { PrepareContext, Preparation, Rewrite } from "../../CardType"
import { signatureOf } from "../../CardChain"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"
import { CARTE } from "../../../base/keywords"

/**
 * A preparation rewriting itself at the end of the preparation into cards found from where it stands: the
 * cards on its right, the deck of its unit, the catalog. It takes nothing: the cards it becomes take what
 * they take, there.
 */
export class RewriteCard extends AbstractCard<Preparation> {


    public readonly output = PREPARATION
    public readonly input = null

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** What it is replaced by, and how many cards on its right with it. Pure: previews call it. */
        rewrite: (ctx: RewriteContext, spot: RewriteSpot) => Rewrite,

        /** What it does to the battle, at the real end of a preparation only, before its rewrite. */
        prepare?: (ctx: PrepareContext) => void,
    ){
        super(name, description, rarity)
        this.#preparation = prepare ? { rewrite, prepare } : { rewrite }
    }


    public get(): Preparation {
        return this.#preparation
    }


    readonly #preparation: Preparation
}

/**
 * A card drawn at random among others, at the end of the preparation, from those that would play in its
 * place, tried on a copy of the chain: none of them drawing in its turn, so a draw always ends. Lost when
 * none fits, and on a trial of another draw, which it would make try in turn.
 */
export class DrawnCard extends RewriteCard {


    constructor(
        name: string, description: Text, rarity: Rarity,

        /** The cards it is drawn from, from where it stands. */
        pool: (spot: RewriteSpot) => readonly Card[],
    ){
        super(name, description, rarity, (ctx, spot) => {
            if(spot.trial) return { cards: [], consumed: 0, acting: false }
            // Each card is tried once, however many times the pool holds it.
            const tried = new Map<Card, boolean>()
            const fits = (card: Card): boolean => {
                let fit = tried.get(card)
                if(fit === undefined){
                    fit = !(card instanceof DrawnCard) && spot.fits(card)
                    tried.set(card, fit)
                }
                return fit
            }
            const fitting = pool(spot).filter(fits)
            return { cards: fitting.length > 0 ? [ctx.pick(fitting)] : [], consumed: 0, acting: false }
        })
    }
}

/** The cards drawn more often the commoner, as the loot draws them: each as many times as its weight. */
export function weighted(cards: readonly Card[]): Card[] {
    return cards.flatMap(card => new Array<Card>(card.rarity.lootWeight).fill(card))
}

/** A card copying the card on its right: both play. */
export const REPETITION = new RewriteCard("Répétition", [
    "Fin de préparation : devient une copie de la ", CARTE, " qui la suit.",
], Rarity.RARE, (_ctx, spot) => {
    const next = spot.next
    return { cards: next ? [next, next] : [], consumed: 1, acting: false }
})

/** A card copying the whole chain on its right: all of it plays twice. */
export const SUPER_REPETITION = new RewriteCard("Super répétition", [
    "Fin de préparation : devient une copie de toute la chaîne qui la suit.",
], Rarity.EPIC, (_ctx, spot) => {
    const { rest } = spot
    return { cards: [...rest, ...rest], consumed: rest.length, acting: false }
})

/** A card putting a copy of the card on its right in the hand, which still plays. */
export const RECOVERY = new RewriteCard("Récupération", [
    "Fin de préparation : disparaît, et met une copie de la ", CARTE, " qui la suit dans ta main.",
], Rarity.RARE, (_ctx, spot) => {
    const next = spot.next
    return { cards: next ? [next] : [], consumed: 1, acting: next !== null }
}, ({ battle, unit, spot }) => {
    if(spot.next) battle.giveCard(unit, spot.next)
})

/** A card of the deck of its unit, drawn at random among those that fit its place. */
export const INSTINCT = new DrawnCard("Instinct", [
    "Fin de préparation : devient une ", CARTE, " tirée au hasard parmi ta main, ta défausse et ta chaîne, qui tient à sa place.",
], Rarity.RARE, spot => spot.deck)

/** A potion of the deck of its unit, drawn at random. */
export const POTION_POUCH = new DrawnCard("Poche à potion", [
    "Fin de préparation : devient une potion tirée au hasard parmi ta main, ta défausse et ta chaîne.",
], Rarity.COMMON, spot => spot.deck.filter(card => signatureOf(card).output === POTION))
