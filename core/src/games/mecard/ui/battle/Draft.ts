import { CardChain, resolve } from "../../sim/card/CardChain"
import { playable } from "../../sim/card/Reading"
import { groupOf, handIndexOf, playedUnlimited } from "../../sim/card/Card"
import type { Battle } from "../../sim/battle/Battle"
import type { Unit } from "../../sim/battle/Unit"
import type { Card } from "../../sim/card/Card"
import type { CardNode } from "../../sim/card/CardNode"
import type { CardType } from "../../sim/card/CardType"
import type { RootPreview } from "../../sim/card/CardChain"
import type { Carried } from "../../sim/usable/Usable"

/**
 * The cards a unit plays unlimited that are shown to place: of each family of variants only one, the one
 * chosen in a draft when there is one, else the one the unit would choose, else the first of the family it
 * plays. The other cards come all.
 */
export function unlimitedShown(unit: Unit, draft: Draft|null): Card[] {
    const firsts = new Map<object, Card>()
    for(const card of unit.unlimited){
        if(card.variants().size > 0 && !firsts.has(groupOf(card))) firsts.set(groupOf(card), card)
    }
    const shown = new Map<object, Card>()
    for(const [group, first] of firsts){
        const wished = draft?.chosen.get(group) ?? first.variantFor(unit)
        shown.set(group, unit.unlimited.includes(wished) ? wished : first)
    }
    return unit.unlimited.filter(card => card.variants().size === 0 || shown.get(groupOf(card)) === card)
}

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


    /**
     * The variant chosen for each family of variants the unit plays unlimited, by the group they share: none
     * until one is chosen, the unit then showing the one it would choose without choosing.
     */
    public readonly chosen = new Map<object, Card>()

    /**
     * The cards the unit plays unlimited that are shown to place: of each family of variants only the one
     * chosen, in the order of the unit. Placing one takes nothing from the hand.
     */
    public get unlimited(): Card[] {
        return unlimitedShown(this.unit, this)
    }

    /**
     * Choose the variant of a family that is shown, placing nothing.
     *
     * @returns Does the unit play it unlimited, or hold a card of its family?
     */
    public choose(variant: Card): boolean {
        if(!this.canPlay(variant)) return false
        this.chosen.set(groupOf(variant), variant)
        return true
    }

    /** The card shown for a card of the hand: the variant chosen when it has some, else itself. */
    public shown(card: Card): Card {
        return card.variants().size > 0 ? this.chosen.get(groupOf(card)) ?? card : card
    }

    /** Can the unit place a variant: does it play it unlimited, or hold a card of its family, free to place? */
    public canPlay(variant: Card): boolean {
        return this.unit.unlimited.includes(variant) || handIndexOf(this.available, variant) >= 0
    }

    /** The cards of the hand not placed yet, each copy once: a card played unlimited takes none from it. */
    public get available(): Card[] {
        return this.#handLeftBy(this.chain.cards)
    }

    /** The cards of the hand a chain leaves, each copy once. */
    #handLeftBy(cards: readonly Card[]): Card[] {
        const left = [...this.unit.hand]
        const free = playedUnlimited(cards, this.unit.unlimited)
        cards.forEach((card, place) => {
            if(free[place]) return
            const index = handIndexOf(left, card)
            if(index >= 0) left.splice(index, 1)
        })
        return left
    }

    /** Is a card the unit plays unlimited already played so this round, itself or one of its group? */
    public isUsed(card: Card): boolean {
        const free = playedUnlimited(this.chain.cards, this.unit.unlimited)
        return this.chain.cards.some((each, place) => free[place] && groupOf(each) === groupOf(card))
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

    /**
     * Change a card of the chain for another variant of it, which keeps its place.
     *
     * @returns Was there a card with variants at that place, the variant one of them, and the unit able to
     *   play it unlimited?
     */
    public variant(place: number, variant: Card): boolean {
        const held = this.chain.cards[place]
        if(!held || !held.variants().size || groupOf(held) !== groupOf(variant)) return false
        // The card of the chain stands for a card of the hand, or the unit plays the variant unlimited.
        const left = this.#handLeftBy(this.chain.cards.filter((_, at) => at !== place))
        if(!this.unit.unlimited.includes(variant) && handIndexOf(left, variant) < 0) return false
        this.chain.cards[place] = variant
        return true
    }

    /** Take a card of the chain back to the hand. */
    public remove(place: number): void {
        this.chain.cards.splice(place, 1)
    }

    /** What a root of the chain would do, after the roots before it, none when there is no such root. */
    public previewRoot(battle: Battle, index: number): RootPreview|null {
        return this.chain.preview(battle, this.unit)[index] ?? null
    }

    /**
     * What a card of the hand would do, put at the end of the chain, none for a card that cannot stand as a
     * root on its own, a modifier or an element, and for a preparation card rewriting the chain into no
     * action. The chain itself is left as it is.
     */
    public previewWith(battle: Battle, card: Card): RootPreview|null {
        if(!playable(card) || card.input !== null) return null
        return new CardChain([...this.chain.cards, card]).preview(battle, this.unit).at(-1) ?? null
    }
}
