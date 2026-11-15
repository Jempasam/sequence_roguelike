import { PREPARATION } from "../card/CardType"
import { resolve } from "../card/CardChain"
import type { Card } from "../card/Card"
/** What a row of cards becomes once its preparations are rewritten, and how its inputs and outputs fit. */
export interface Evaluation {
    /** The row once rewritten. */
    readonly cards: readonly Card[]

    /** The trees it reads as, in the order they play. */
    readonly roots: readonly RootEvaluation[]

    /** The cards of the rewritten row that play. */
    readonly active: number

    /** The cards of the rewritten row greyed out: no input, or under a head that does not play. */
    readonly greyed: readonly Card[]

    /** The preparations that stayed in the row, missing their input, and so rewrote nothing. */
    readonly unbuilt: readonly Card[]
}

/** One tree of a rewritten row. */
export interface RootEvaluation {
    readonly card: Card

    /** The name of the type it takes, none when it takes nothing. */
    readonly input: string|null

    /** The name of the type it gives. */
    readonly output: string

    /** Is its slot filled by the card on its right, down the tree? */
    readonly supplied: boolean

    /** Is it played? */
    readonly active: boolean

    /** How many cards the tree holds. */
    readonly size: number
}

/**
 * What the preparations of a row do to it, and nothing else: only their `rewrite`, never their effect on a
 * battle, no chance drawn (the first option of each is taken). It needs no battle, only the cards in sight of
 * the unit.
 *
 * @param deck - The cards in sight of the unit, which a card drawing from them draws from.
 * @returns What keeps the row from reading as intended, empty when it reads whole: a preparation missing its
 * input, a card greyed out (an element alone, an action missing its input). The size of the chain is no
 * concern of a preparation: it limits the cards put down at first, not what they are rewritten into.
 */
export function checkPreparation(row: readonly Card[], deck: readonly Card[]): string[] {
    const problems: string[] = []
    const { cards, reading } = resolve(row, null, deck)
    for(const card of cards) if(card.output === PREPARATION) problems.push(`${card.name} : préparation sans son entrée`)
    for(const card of reading.greyed) if(card.output !== PREPARATION) problems.push(`${card.name} : carte grisée, elle ne joue pas`)
    return problems
}

/**
 * Prepare a row (rewrites only, as {@link checkPreparation}), then evaluate what is left: for each tree, what
 * it takes and gives, whether it is given its input and whether it plays.
 *
 * @param deck - The cards in sight of the unit, which a card drawing from them draws from.
 */
export function evaluateChain(row: readonly Card[], deck: readonly Card[]): Evaluation {
    const { cards, reading } = resolve(row, null, deck)
    const roots = reading.roots.map((root): RootEvaluation => {
        const missing = (node: typeof root): boolean => node.card.input !== null && (!node.inputs[0] || missing(node.inputs[0]))
        return {
            card: root.card,
            input: root.card.input?.name ?? null,
            output: root.card.output.name,
            supplied: !missing(root),
            active: root.active,
            size: root.size,
        }
    })
    return {
        cards,
        roots,
        active: reading.active.filter(Boolean).length,
        greyed: reading.greyed,
        unbuilt: cards.filter(card => card.output === PREPARATION),
    }
}
