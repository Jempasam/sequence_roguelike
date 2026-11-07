import { joinText } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import type { Action, Indicator, Pose, Preview, PreviewContext, UnitContext } from "../battle/Action"
import type { Battle } from "../battle/Battle"
import type { Unit } from "../battle/Unit"

import type { Card, RewriteContext, RewriteSpot } from "./Card"
import type { CardNode } from "./CardNode"
import { ACTION, PREPARATION } from "./CardType"
import type { CardType, Preparation } from "./CardType"
import { read, takes } from "./Reading"
import type { Reading } from "./Reading"

/** What cards in a row give at the end of the preparation, once every card rewriting it is rewritten. */
export interface Resolution {
    /** The row once rewritten. */
    readonly cards: readonly Card[]

    /** The same, ready to be read. */
    readonly chain: CardChain

    /**
     * For each card of the row rewritten, where the cards of the row given it stands for stood: itself when it
     * is still there, a card a preparation gave standing for that preparation and what it took away.
     */
    readonly sources: readonly (readonly number[])[]

    /** What each card gives, none for a card greyed out. */
    readonly values: readonly unknown[]

    /** Does what each card gives hang on a chance a preview could only guess? */
    readonly guessed: readonly boolean[]

    /** The row rewritten as it reads. */
    readonly reading: Reading

    /** Where the preparations acting on the battle stood in the row given: they play, whatever they gave. */
    readonly acting: readonly number[]
}

/** What a tree of a chain gave, read from its first card. */
export interface Built<T = unknown> {
    /** The last card of the tree. */
    readonly last: number

    /** What its first card gives. */
    readonly value: T
}

/** What a chain tells of the way it is read, for whoever follows it. A copy of a chain tells nothing. */
export interface ChainWatcher {
    /** A tree was built, to be played: its first card and its last. */
    activated(first: number, last: number): void

    /** A card that was to be played could not be built, an input missing. */
    invalid(index: number): void

    /** Its cards changed, or its cursor moved. */
    changed(): void
}

/** How cards were rewritten by a preparation: where each came from, and what hangs on what. */
export interface Rewriting {
    /** For each card now, where the cards of the row given it stands for stood. */
    readonly sources: readonly (readonly number[])[]

    /** Does each card now stand where it is by a chance a preview guessed? */
    readonly drawn: readonly boolean[]

    /**
     * Where the preparations acting on the battle stood in the row given, with the cards they took away: they
     * play, whatever they gave.
     */
    readonly acted: readonly number[]
}

/** What a root of a chain would do, as a viewer may know it. */
export interface RootPreview {
    /**
     * What it would do, none when it cannot be shown: a card greyed out, a start effect, a chance, or nested
     * cards the viewer may not see.
     */
    readonly preview: Preview|null

    /** Where the unit would stand and face before it. */
    readonly start: Pose

    /** Does it start from a pose the viewer cannot be sure of, after a root that could not be shown? */
    readonly uncertain: boolean
}

/** A node seen by a viewer, whose nested cards may be hidden. */
export interface ChainView {
    /** The card, none when the viewer may not see it. */
    readonly card: Card|null

    /** Its place in the row. */
    readonly index: number

    readonly inputs: readonly (ChainView|null)[]
}

/**
 * What a unit plans for a round: a row of cards, each taking what the card on its right gives, and where
 * the reading of the row stands. It reads as trees, the roots, played one after the other.
 *
 * @remarks
 * A root is played when it gives actions or a start effect. A card not given its input, or under a root
 * that gives nothing to play, an element alone, is greyed out: it does nothing.
 *
 * The row is read twice in a round, in the same way: the type of a card is looked at first, then a card of
 * the type sought is built from those on its right. {@link CardChain.prepare} builds the preparations, all at
 * once, then {@link CardChain.next} builds the actions, turn after turn.
 */
export class CardChain {


    /** The cards, in the order of the row. */
    public readonly cards: Card[]

    /** The next card to read, the cards before it read already. */
    public cursor = 0

    /** What follows the reading, none by default. */
    public watcher: ChainWatcher|null = null

    constructor(cards: readonly Card[] = []){
        this.cards = [...cards]
    }


    /**
     * A hand read from left to right, as a bot plays it: a card taking an input takes the card that follows
     * it. A root that does not play is left out, so an element alone or an action missing its input does not
     * keep the others from playing. The reading stops at the first root the size would not hold.
     *
     * @param size - How many cards the chain holds at most.
     */
    public static leftToRight(hand: readonly Card[], size: number): CardChain {
        const chain = new CardChain()
        for(const root of new CardChain(hand).rootsWith(hand)){
            if(!root.active) continue
            if(chain.size + root.size > size) break
            chain.cards.push(...root.cards)
        }
        return chain
    }


    /** A copy of it, read as far, which tells nothing. */
    public copy(): CardChain {
        const copy = new CardChain(this.cards)
        copy.cursor = this.cursor
        return copy
    }

    /**
     * What the tree starting at a card gives: each card built from what the card on its right gives, and
     * the last card of the tree. None when an input is missing. It touches nothing.
     */
    public get(first: number): Built|null {
        const card = this.cards[first] as Card|undefined
        if(!card) return null
        if(card.input === null) return { last: first, value: card.get(undefined) }
        if(!takes(card, this.cards[first + 1])) return null
        const input = this.get(first + 1)
        return input && { last: input.last, value: card.get(input.value) }
    }

    /**
     * Read on to the next tree whose first card gives a type, and move past it. A card of another type is
     * skipped unbuilt, a card of the type that cannot be built is told invalid and skipped: neither costs
     * anything, the reading goes on.
     *
     * @returns What the tree gives, none at the end of the row.
     */
    public next<T>(type: CardType<T>): T|null {
        while(this.cursor < this.cards.length){
            const first = this.cursor
            const built = this.cards[first].output === type ? this.get(first) : null
            if(built) this.watcher?.activated(first, built.last)
            else if(this.cards[first].output === type) this.watcher?.invalid(first)
            this.cursor = built ? built.last + 1 : first + 1
            this.watcher?.changed()
            if(built) return built.value as T
        }
        return null
    }

    /** The actions it has left to give, one tree after the other. It touches nothing. */
    public actionsLeft(): Action[] {
        const copy = this.copy()
        const actions: Action[] = []
        for(let next = copy.next(ACTION); next; next = copy.next(ACTION)) actions.push(...next)
        return actions
    }

    /**
     * Build the preparations of the row and rewrite it, from left to right, the cursor left where it is: a
     * preparation sees the cards on its right as they are, its effect on the battle done just before when the
     * battle plays, and what a rewrite gives is read again in its place, so a fusion unfolding into a
     * preparation rewrites it in turn. A card a preparation gave is never rewritten again by that same card,
     * so `Répétition, Répétition` ends: such a card is dropped. A preparation missing its input stays in the
     * row, greyed out.
     *
     * @param ctx - What chances are drawn with, none for a preview, which draws the first of each and marks
     * what hangs on it as guessed.
     * @param deck - The cards of the unit playing the row, which a card drawing from them draws from.
     * @param acting - The unit playing the row and its battle, at the real end of a preparation only: each
     * preparation then acts on the battle, just before it is rewritten. None for a preview or a trial.
     * @param trial - Is it a copy, rewritten to try a card in the place of another?
     */
    public prepare(
        ctx: RewriteContext|null, deck: readonly Card[] = [], acting: UnitContext|null = null, trial = false,
    ): Rewriting {
        const { cards } = this
        const sources: number[][] = cards.map((_, index) => [index])
        const drawn: boolean[] = cards.map(() => false)
        // The preparations whose rewrite gave each card, which never rewrite it again.
        const lineage: ReadonlySet<Card>[] = cards.map(() => new Set())
        const acted: number[] = []
        let at = 0
        while(at < cards.length){
            const card = cards[at]
            if(card.output !== PREPARATION){
                at++
                continue
            }
            if(lineage[at].has(card)){
                for(const each of [cards, sources, drawn, lineage]) each.splice(at, 1)
                this.watcher?.changed()
                continue
            }
            const built = this.get(at)
            if(!built){
                this.watcher?.invalid(at)
                at++
                continue
            }
            const { last } = built
            this.watcher?.activated(at, last)
            let guessing = false
            const spot: RewriteSpot = {
                next: cards[last + 1] ?? null,
                rest: cards.slice(last + 1),
                deck,
                trial,
                fits: candidate => fitsAt(cards, at, last, candidate, deck),
            }
            const preparation = built.value as Preparation
            if(acting){
                try {
                    preparation.prepare?.({ ...acting, spot })
                } catch(error){
                    acting.battle.report(error)
                }
            }
            const rewrite = preparation.rewrite(ctx ?? {
                pick: options => {
                    guessing = true
                    return options[0]
                },
            }, spot)
            // The tree goes, and the cards on its right it consumed.
            const replaced = last - at + 1 + Math.min(Math.max(0, rewrite.consumed), cards.length - last - 1)
            const taken: (Card|null)[] = cards.slice(at + 1, at + replaced)
            const takenFrom = sources.slice(at + 1, at + replaced)
            // A card given back as it was taken stands for itself: the screen greys it as itself.
            const kept = rewrite.cards.map(each => {
                const found = taken.indexOf(each)
                if(found >= 0) taken[found] = null
                return found
            })
            // A card the preparation gave stands for it and for the cards it took away, not given back.
            const gone = [...sources[at], ...taken.flatMap((each, index) => each ? takenFrom[index] : [])]
            const from = rewrite.cards.map((_, index) => kept[index] >= 0 ? takenFrom[kept[index]] : gone)
            if(rewrite.acting) acted.push(...gone)
            const wasDrawn = drawn.slice(at, at + replaced).some(Boolean) || guessing
            const gave = new Set([...lineage[at], card])
            cards.splice(at, replaced, ...rewrite.cards)
            sources.splice(at, replaced, ...from)
            drawn.splice(at, replaced, ...rewrite.cards.map(() => wasDrawn))
            lineage.splice(at, replaced, ...rewrite.cards.map(() => gave))
            this.watcher?.changed()
            // What it gave is read again from its place: a preparation among it is rewritten in turn.
        }
        return { sources, drawn, acted }
    }

    /** How many cards it holds, a card holding others counting for one. */
    public get size(): number {
        return this.cards.length
    }

    /** The trees the row reads as, in the order they play. */
    public get roots(): readonly CardNode[] {
        return this.rootsWith([])
    }

    /**
     * The trees the row reads as, each card greyed out or not as it plays once the whole chain is rewritten.
     *
     * @param deck - The cards in sight of its unit, which a card drawing from them draws from.
     */
    public rootsWith(deck: readonly Card[]): readonly CardNode[] {
        return read(this.cards, this.activity(deck)).roots
    }

    /**
     * Does each card of the row play, once every preparation of the chain is rewritten, on a copy, each
     * chance taken as its first option: what the screen greys out.
     *
     * @param deck - The cards in sight of its unit, which a card drawing from them draws from.
     */
    public activity(deck: readonly Card[] = []): boolean[] {
        return activityOf(resolve(this.cards, null, deck), this.cards.length)
    }

    /** The roots in the order they play, each on one line: `Pas > Sort(Feu)`, `(rien)` when empty. */
    public toString(): string {
        const roots = this.roots
        return roots.length === 0 ? "(rien)" : roots.join(" > ")
    }

    /** The same, each card in the color of its rarity. */
    public toSemString(): Text {
        const roots = this.roots
        return roots.length === 0 ? "(rien)" : joinText(roots, " > ")
    }

    /**
     * What keeps it from being played by a unit, empty when it can be: only its size, since a card that
     * cannot play is greyed out.
     *
     * @param maxCards - How many cards the chain of the unit holds at most, a card holding others counting
     * for one: its `stats.chainSize`.
     */
    public problems(maxCards: number): string[] {
        return this.size > maxCards ? [`A chain holds ${maxCards} cards at most.`] : []
    }

    /** Is it ready to be played by a unit whose chain holds a number of cards at most? */
    public isValid(maxCards: number): boolean {
        return this.problems(maxCards).length === 0
    }

    /**
     * What it gives at the end of the preparation, its chances drawn with a context.
     *
     * @param deck - The cards of the unit playing it, which a card drawing from them draws from.
     */
    public resolve(
        ctx: RewriteContext, deck: readonly Card[] = [], acting: UnitContext|null = null,
    ): Resolution {
        return resolve(this.cards, ctx, deck, acting)
    }

    /**
     * What each root would do, one after the other, from where the unit stands: each starts where the
     * one before would leave the unit. A root previews everything nested in it, since it is the one
     * playing its inputs: a nested card has no preview of its own. A root rewritten previews what it is
     * rewritten into, a fusion the cards it holds; one hanging on a chance is not shown.
     *
     * @param hideNested - Are the nested cards hidden from the viewer? A root holding some is not shown.
     */
    public preview(battle: Battle, unit: Unit, hideNested: boolean): RootPreview[] {
        let pose: Pose = unit
        let uncertain = false
        const beforeSteps: ((ctx: PreviewContext) => Preview)[] = []
        const resolution = resolve(this.cards, null, battle.cardsOf(unit))
        const { sources, values, guessed } = resolution
        const made = resolution.reading.roots
        return this.roots.map(root => {
            const hidden = hideNested && root.inputs.length > 0
            const start = pose
            // The roots it was rewritten into: those whose card came from a card of its tree.
            const own = made.filter(each => {
                return sources[each.index].some(from => from >= root.index && from < root.index + root.size)
            })
            const acting = own.filter(each => each.card.output === ACTION)
            const showable = acting.length > 0 && !hidden
                && acting.every(each => each.active && !guessed[each.index])
            if(!showable){
                const result = { preview: null, start, uncertain }
                // A root of actions that cannot be shown may move the unit: whatever follows is a guess.
                if(acting.length > 0) uncertain = true
                return result
            }
            const indicators: Indicator[] = []
            for(const each of acting){
                for(const action of values[each.index] as readonly Action[]){
                    for(const before of beforeSteps){
                        const carried = before({ battle, unit, pose })
                        indicators.push(...carried.indicators)
                        pose = carried.pose
                    }
                    const preview = action.preview({ battle, unit, pose })
                    indicators.push(...preview.indicators)
                    pose = preview.pose
                    if(preview.beforeStep) beforeSteps.push(preview.beforeStep)
                }
            }
            return { preview: { indicators, pose }, start, uncertain }
        })
    }

    /**
     * The chain as another team sees it: the roots, and below a card taking inputs, nothing.
     *
     * @param hideNested - Are the nested cards hidden? Its own team sees them.
     */
    public view(hideNested: boolean): ChainView[] {
        const view = (node: CardNode, hidden: boolean): ChainView => ({
            card: hidden ? null : node.card,
            index: node.index,
            inputs: node.inputs.map(input => input ? view(input, hidden || hideNested) : null),
        })
        return this.roots.map(root => view(root, false))
    }
}

/**
 * What cards in a row give at the end of the preparation, on a copy of them, in two passes: the preparations
 * are rewritten, as {@link CardChain.prepare} says, then the row is read from right to left, so each card is
 * given what the card on its right gives: a card not given its input is greyed out.
 *
 * @param ctx - What chances are drawn with, none for a preview, which draws the first of each and marks
 * what hangs on it as guessed.
 * @param deck - The cards of the unit playing the row, which a card drawing from them draws from.
 * @param acting - The unit playing the row and its battle, when each preparation is to act on the battle.
 */
export function resolve(
    row: readonly Card[], ctx: RewriteContext|null, deck: readonly Card[] = [],
    acting: UnitContext|null = null,
): Resolution {
    return resolved(row, ctx, deck, acting, false)
}

/**
 * What cards in a row give, as {@link resolve} says, the row maybe a trial.
 *
 * @param trial - Is it a copy, rewritten to try a card in the place of another?
 */
function resolved(
    row: readonly Card[], ctx: RewriteContext|null, deck: readonly Card[], acting: UnitContext|null,
    trial: boolean,
): Resolution {
    const chain = new CardChain(row)
    const { sources, drawn, acted } = chain.prepare(ctx, deck, acting, trial)
    const { cards } = chain
    const values: unknown[] = cards.map(() => undefined)
    const ok: boolean[] = cards.map(() => false)
    const guessed: boolean[] = cards.map(() => false)
    for(let index = cards.length - 1; index >= 0; index--){
        const card = cards[index]
        const given = card.input !== null
        if(given && !(takes(card, cards[index + 1]) && ok[index + 1])) continue
        values[index] = card.get(given ? values[index + 1] : undefined)
        ok[index] = true
        guessed[index] = drawn[index] || (given && guessed[index + 1])
    }
    return { cards, chain, sources, values, guessed, reading: read(cards), acting: acted }
}

/**
 * Does each card of a row play, from its resolution: when one of the cards it was rewritten into plays, or
 * when it is a preparation acting on the battle.
 *
 * @param length - How many cards the row given held.
 */
export function activityOf(resolution: Resolution, length: number): boolean[] {
    const active = new Array<boolean>(length).fill(false)
    resolution.sources.forEach((from, index) => {
        if(resolution.reading.active[index]) for(const source of from) active[source] = true
    })
    for(const from of resolution.acting) active[from] = true
    return active
}

/**
 * Would a card fit in the place of a tree of a row being resolved: tried on a copy, the rest
 * of the row rewritten as it would be, every chance taken as its first option, nothing acting. It fits when
 * it plays there, and the card on its left plays too when that card waits for an input: an element after a
 * spell, never a slash, which would play alone and leave the spell greyed out.
 */
function fitsAt(
    cards: readonly Card[], index: number, last: number, candidate: Card, deck: readonly Card[],
): boolean {
    const row = [...cards]
    row.splice(index, last - index + 1, candidate)
    const active = activityOf(resolved(row, null, deck, null, true), row.length)
    const left = row[index - 1] as Card|undefined
    return active[index] && (!left?.input || active[index - 1])
}

/** What a card truly takes and gives, once rewritten: a preparation is read as the cards it becomes. */
export interface Signature {
    readonly input: CardType<unknown>|null
    readonly output: CardType<unknown>
}

/**
 * What a card truly takes and gives: its own types, or for a preparation, those of the cards it becomes on
 * its own, rewritten on a chain holding it alone, every chance taken as its first option, nothing acting.
 * What the first of them gives and the last takes; a preparation becoming nothing gives a preparation and
 * takes nothing. For searching a deck and for the halts, never for a battle, whose chains are rewritten
 * whole.
 */
export function signatureOf(card: Card): Signature {
    if(card.output !== PREPARATION) return { input: card.input, output: card.output }
    const { cards } = resolve([card], null)
    if(cards.length === 0) return { input: null, output: PREPARATION }
    return { input: cards[cards.length - 1].input, output: cards[0].output }
}

/**
 * Do cards in a row read whole, read by what they truly take and give: each given its input by the card on
 * its right, each head playable. For the halts, which tie and upgrade cards.
 */
export function readsWhole(cards: readonly Card[]): boolean {
    const signatures = cards.map(signatureOf)
    for(let index = 0; index < signatures.length; index++){
        const { input } = signatures[index]
        if(input !== null && signatures[index + 1]?.output !== input) return false
    }
    for(let index = 0; index < signatures.length; index++){
        const { output } = signatures[index]
        if(output !== ACTION && output !== PREPARATION) return false
        while(index < signatures.length && signatures[index].input !== null) index++
    }
    return true
}
