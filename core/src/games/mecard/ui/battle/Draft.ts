import { CardChain, resolve } from "../../sim/card/CardChain"
import { playable } from "../../sim/card/Reading"
import type { Battle } from "../../sim/battle/Battle"
import type { Unit } from "../../sim/battle/Unit"
import type { Card } from "../../sim/card/Card"
import type { CardNode } from "../../sim/card/CardNode"
import type { CardType } from "../../sim/card/CardType"
import type { RootPreview } from "../../sim/card/CardChain"
import type { Carried } from "../../sim/usable/Usable"

/** What a click on a card of the hand did: placed it, or nothing since the chain is full. */
export type Placement = "placed"|"full"

/** Cards of the chain that serve together, and the type of what they give. */
export interface Group {
    /** Where the cards stand in the row of the chain, in order. */
    readonly places: readonly number[]

    readonly type: CardType<unknown>
}

/**
 * The chain a player is putting together for a unit, before committing it: the cards placed, and what of its
 * belt the unit is to use.
 *
 * @remarks
 * A click puts a card at the end of the chain, so the order of the clicks is the order of the chain. A card
 * is never refused: one that nothing connects once the preparations are rewritten is greyed out, and
 * {@link Draft.groups} tells which cards serve together.
 */
export class Draft {


    public readonly chain = new CardChain()

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
     * Which cards of the chain serve together once its preparations are rewritten, each group the places of
     * the cards in the row, in order: a card, the preparation that took it, the card that takes what the
     * preparation gives. A card nothing connects is in no group.
     */
    public get groups(): readonly Group[] {
        const { sources, reading } = resolve(this.chain.cards, null, this.deck)
        const groups: Group[] = []
        for(const root of reading.roots){
            const places = new Set<number>()
            for(let index = root.index; index < root.index + root.size; index++){
                for(const source of sources[index]) places.add(source)
            }
            if(places.size > 1) groups.push({ places: [...places].sort((a, b) => a - b), type: root.card.output })
        }
        return groups
    }

    /** The root of the chain a card of the row belongs to, in the order of the roots. */
    public rootOf(place: number): number {
        const roots = this.roots
        const found = roots.findIndex(root => place >= root.index && place < root.index + root.size)
        return found < 0 ? roots.length - 1 : found
    }

    /** Does each card of the chain play, once its preparations are rewritten? */
    public get active(): boolean[] {
        return this.chain.activity(this.deck)
    }

    /**
     * Put a card at the end of the chain: always, unless the chain is full. A card put where nothing connects
     * it is greyed out by the resolution of the chain, not refused.
     */
    public place(card: Card): Placement {
        if(!this.hasRoom) return "full"
        this.chain.cards.push(card)
        return "placed"
    }

    /** Take a card of the chain back to the hand. */
    public remove(place: number): void {
        this.chain.cards.splice(place, 1)
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
}
