import type { Card } from "./Card"
import { CardNode } from "./CardNode"
import { ACTION, PREPARATION } from "./CardType"

/** What cards in a row give, read from left to right: the trees they make, and which cards play. */
export interface Reading {
    /** The heads of the row, the cards nothing on their left takes, each with what it takes, in order. */
    readonly roots: readonly CardNode[]

    /** Does each card of the row play, rather than being greyed out? */
    readonly active: readonly boolean[]

    /** The cards greyed out, in order: a modifier with no action on its right, an element alone. */
    readonly greyed: readonly Card[]
}

/** Can a card head a row: does what it gives play, actions or a preparation? */
export function playable(card: Card): boolean {
    return card.output === ACTION || card.output === PREPARATION
}

/** Does a card take what the card after it gives? */
export function takes(card: Card, next: Card|undefined): boolean {
    return card.input !== null && next !== undefined && next.output === card.input
}

/**
 * Is each card of a row given its input by the cards on its right: is the card on its right of the type
 * it takes, and given its own? A card taking nothing always is. It hangs on the right only, so a card
 * rewritten on the left never changes it.
 */
export function supplied(cards: readonly Card[]): boolean[] {
    const ok: boolean[] = new Array<boolean>(cards.length)
    for(let index = cards.length - 1; index >= 0; index--){
        const card = cards[index]
        ok[index] = card.input === null || (takes(card, cards[index + 1]) && ok[index + 1])
    }
    return ok
}

/**
 * Cards in a row read from left to right: a card taking an input takes the card on its right when it gives
 * that, and so on, a card nothing takes heading a tree. A card plays when it is given its input, under a
 * head that can be played; it is greyed out otherwise: `Répéter ×2, Estoc, Feu` reads `Répéter ×2(Estoc)`
 * then `Feu`, greyed out.
 *
 * @param activity - Which cards play, when it is known otherwise: once the preparations of the row are
 *   rewritten, what the row reads as on its own is not what plays. Read from the row by default.
 */
export function read(cards: readonly Card[], activity: readonly boolean[]|null = null): Reading {
    const ok = supplied(cards)
    const active: boolean[] = new Array<boolean>(cards.length)
    const node = (index: number, plays: boolean): CardNode => {
        const card = cards[index]
        active[index] = activity ? activity[index] : plays && ok[index]
        const input = takes(card, cards[index + 1]) ? node(index + 1, plays) : null
        return new CardNode(card, input, index, active[index])
    }
    const roots: CardNode[] = []
    for(let index = 0; index < cards.length; index += roots[roots.length - 1].size){
        roots.push(node(index, playable(cards[index])))
    }
    return { roots, active, greyed: cards.filter((_, index) => !active[index]) }
}
