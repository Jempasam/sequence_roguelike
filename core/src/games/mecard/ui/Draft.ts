import { CardChain, signatureOf } from "../sim/card/CardChain"
import { playable } from "../sim/card/Reading"
import type { Battle } from "../sim/battle/Battle"
import type { Unit } from "../sim/battle/Unit"
import type { Card } from "../sim/card/Card"
import type { CardNode } from "../sim/card/CardNode"
import type { RootPreview } from "../sim/card/CardChain"
import type { Carried } from "../sim/usable/Usable"

/**
 * What a click on a card of the hand did: placed it, lifted it since it fits nowhere yet, put it back down,
 * or nothing since the chain is full.
 */
export type Placement = "placed"|"lifted"|"dropped"|"full"

/**
 * The chain a player is putting together for a unit, before committing it: the cards placed, the card of
 * the hand lifted, waiting for a slot, and what of its belt the unit is to use.
 *
 * @remarks
 * A click places a card where it fits best: the first empty slot that takes it, in the order of the chain,
 * else the end of the chain. A card that fits nowhere yet, an element with no spell to go in, is lifted
 * instead, and the slots it would go in light up once there are some. A slot is filled by putting the card
 * right after the card of the slot, in the row of the chain: a card takes the card on its right.
 */
export class Draft {


    public readonly chain = new CardChain()

    /** The card of the hand lifted, waiting for a slot, none when none is. */
    public lifted: Card|null = null

    /** The places in the belt of the unit of what it is to use at the start of the execution. */
    public readonly used = new Set<number>()

    constructor(
        public readonly unit: Unit,
    ){}


    /** The cards of the hand not placed yet, each copy once. */
    public get available(): Card[] {
        const left = [...this.unit.hand]
        for(const card of this.chain.cards){
            const index = left.indexOf(card)
            if(index >= 0) left.splice(index, 1)
        }
        return left
    }

    /** What the unit is to use at the start of the execution, in the order of its belt. */
    public get usables(): Carried[] {
        return this.unit.usables.filter((_, index) => this.used.has(index))
    }

    /** Choose to use what lies at a place of the belt, or not to use it anymore. */
    public toggle(index: number): void {
        if(this.used.has(index)) this.used.delete(index)
        else if(index < this.unit.usables.length && !this.unit.usables[index].spent) this.used.add(index)
    }

    /** The cards in sight of the unit, which a card of the chain drawing from them draws from. */
    public get deck(): Card[] {
        return [...this.unit.hand, ...this.unit.decks.discards]
    }

    /**
     * The trees the chain reads as, each card greyed out as it plays once the whole chain is rewritten:
     * computed again at each change.
     */
    public get roots(): readonly CardNode[] {
        return this.chain.rootsWith(this.deck)
    }

    /** Is there room for one more card? */
    public get hasRoom(): boolean {
        return this.chain.size < this.unit.stats.chainSize.value
    }

    /**
     * Place a card where it fits best, or lift it when it fits nowhere yet. A card lifted and clicked
     * again is placed when a slot took it meanwhile, put back down otherwise.
     */
    public place(card: Card): Placement {
        const wasLifted = this.lifted === card
        if(!this.hasRoom) return "full"
        const open = this.#openSlotFor(card)
        if(open){
            this.chain.cards.splice(open.index + 1, 0, card)
            this.lifted = null
            return "placed"
        }
        if(wasLifted){
            this.lifted = null
            return "dropped"
        }
        if(playable(card)){
            this.chain.cards.push(card)
            this.lifted = null
            return "placed"
        }
        this.lifted = card
        return "lifted"
    }

    /** Can the lifted card go into a slot of a placed card? */
    public canPlug(node: CardNode, slot: number): boolean {
        return this.lifted !== null && this.hasRoom && accepts(node, slot, this.lifted)
    }

    /** Put the lifted card into a slot of a placed card. Does nothing when it cannot. */
    public plug(node: CardNode, slot: number): void {
        if(!this.lifted || !this.canPlug(node, slot)) return
        this.chain.cards.splice(node.index + 1, 0, this.lifted)
        this.lifted = null
    }

    /** Take a placed card back to the hand, with everything plugged into it. */
    public remove(node: CardNode): void {
        this.chain.cards.splice(node.index, node.size)
    }

    /** What a root of the chain would do, after the roots before it, none when there is no such root. */
    public previewRoot(battle: Battle, index: number): RootPreview|null {
        return this.chain.preview(battle, this.unit, false)[index] ?? null
    }

    /**
     * What a card of the hand would do, put at the end of the chain, none for a card that cannot stand as a
     * root on its own, a modifier or an element, and for a preparation card rewriting the chain into no
     * action. The chain itself is left as it is.
     */
    public previewWith(battle: Battle, card: Card): RootPreview|null {
        if(!playable(card) || card.input !== null) return null
        return new CardChain([...this.chain.cards, card]).preview(battle, this.unit, false).at(-1) ?? null
    }


    /** The first empty slot taking a card, in the order of the chain, depth first, none when none does. */
    #openSlotFor(card: Card): CardNode|null {
        const search = (node: CardNode): CardNode|null => {
            for(let slot = 0; slot < node.inputs.length; slot++){
                const input = node.inputs[slot]
                if(!input && accepts(node, slot, card)) return node
                const deeper = input ? search(input) : null
                if(deeper) return deeper
            }
            return null
        }
        for(const root of this.roots){
            const found = search(root)
            if(found) return found
        }
        return null
    }
}

/**
 * Can a card go into a slot of a placed card: is the slot empty, and does the card truly give what it
 * takes, a fusion read as its cards?
 */
function accepts(node: CardNode, slot: number, card: Card): boolean {
    return node.inputs[slot] === null && node.card.input === signatureOf(card).output
}
