import type { Rng } from "../base/Rng"
import type { Battle } from "../battle/Battle"
import type { Unit } from "../battle/Unit"
import { CardChain } from "../card/CardChain"
import { loadBattle, saveBattle } from "../save/battleSave"

import { DeckAi } from "./Bot"
import { available, combine, commitOthers, decideRoot, guessLevels, levelsOf, positionsOf, score } from "./lookaheadHelpers"
import type { Combination } from "./lookaheadHelpers"
import { PredictionMemo } from "./PredictingController"
import type { PredictingController } from "./PredictingController"
import { depthOrOwn } from "./UnitController"
import type { ROOT_DEPTH } from "./UnitController"
import type { BattlePlan, UnitController } from "./UnitController"

/** What sets up how a lookahead AI guesses the other units. */
export interface LookaheadOptions {
    /** What plays, in its tries, the units of the players, which have no AI to ask: the AI itself when not told. */
    readonly players?: UnitController

    /** What plays the other units once the depth is spent, at level 0: a {@link DeckAi} when not told. */
    readonly leaf?: UnitController

    /**
     * The levels whose scores are averaged when it is the root AI, each kept at most its own depth: its own
     * depth alone when not told. Asked by another AI, it plays the depth it is given only.
     */
    readonly depths?: readonly number[]

    /**
     * Does it try its chains on a copy whose draw piles and discards hold only the secret card, so it counts
     * on the cards in hand only, never on what it would draw? Its own choice of how to judge: the battle it
     * is shown is left as it is. False when not told.
     */
    readonly hiddenDecks?: boolean

    /**
     * How the scores of a chain against each group of guesses make one: their weighted mean (`mean`, when
     * not told), the worst (`safe`) or the best (`unsafe`). The same with one level only.
     */
    readonly combine?: Combination

    /**
     * What plays every unit, ours too, in the second round a lookahead tries its best chains on (`ahead`),
     * asked with depth 0: the chain of the deck AI when not told. The secret card is left out either way.
     */
    readonly future?: UnitController
}

/**
 * Tries chains and keeps the one that goes best: the hand in its order and some drawn at random are each
 * played out on a copy of the battle, and the one leaving its team the most life, against the others', is
 * decided. The first lookahead, `smart1`, kept to be compared with the lookahead AI: it plays no card
 * unlimited of its own accord.
 *
 * With several {@link LookaheadOptions.depths}, a chain is worth its scores against the others guessed at
 * each level, made one by {@link LookaheadOptions.combine}, the levels guessing the same played once.
 */
export class ShuffleAi implements PredictingController {

    /**
     * @param depth - Its base depth: how many levels of the AIs of the other units it calls when it is asked
     * with {@link ROOT_DEPTH}, which leaves it to choose.
     */
    constructor(rng: Rng, candidates: number, depth: number, options: LookaheadOptions = {}){
        this.#rng = rng
        this.#candidates = candidates
        this.#depth = depth
        this.#players = options.players ?? this
        this.#leaf = options.leaf ?? new DeckAi()
        this.#depths = options.depths
        this.#hiddenDecks = options.hiddenDecks ?? false
        this.#combine = options.combine ?? "mean"
    }

    public decide(unit: Unit, view: Battle, depth: number): BattlePlan {
        const memo = new PredictionMemo(this.#players, this.#leaf)
        const levels = levelsOf(depth, this.#depth, this.#depths)
        return decideRoot(view, unit, this.#hiddenDecks, (seen, mine) => this.#decide(mine, seen, levels, memo))
    }

    public decideWith(unit: Unit, view: Battle, depth: number, memo: PredictionMemo): BattlePlan {
        return this.#decide(unit, view, [depthOrOwn(depth, this.#depth)], memo)
    }

    #decide(unit: Unit, view: Battle, levels: readonly number[], memo: PredictionMemo): BattlePlan {
        const cards = available(unit, view)
        const size = unit.stats.chainSize.value
        const tried = new Map<string, number[]>()
        for(let index = 0; index < this.#candidates; index++){
            const order = cards.map((_, position) => position)
            if(index > 0) this.#rng.shuffle(order)
            const chain = CardChain.leftToRight(order.map(position => cards[position]), size)
            const shuffled = order.map(position => cards[position])
            const positions = positionsOf(shuffled, chain).map(at => order[at])
            const key = positions.map(position => cards[position].name).join("|")
            if(!tried.has(key)) tried.set(key, positions)
        }
        // A battle is not saved while a process goes on: the view could not be made then, and the AI is not asked.
        const save = saveBattle(view)
        const groups = guessLevels(view, unit, levels, memo)
        const unitIndex = view.units.indexOf(unit)
        let best: number[]|null = null
        let bestScore = -Infinity
        for(const positions of tried.values()){
            const scores: { value: number, weight: number }[] = []
            for(const group of groups){
                const copy = loadBattle(save)
                const mine = copy.units[unitIndex]
                const copied = available(mine, copy)
                copy.commit(mine, new CardChain(positions.map(position => copied[position])))
                commitOthers(copy, view, group.plans)
                copy.endPreparation()
                copy.playRound()
                scores.push({ value: score(copy, mine.team), weight: group.weight })
            }
            const value = combine(this.#combine, scores)
            if(value > bestScore){
                best = positions
                bestScore = value
            }
        }
        return { chain: new CardChain(best ? best.map(position => cards[position]) : []) }
    }

    readonly #rng: Rng
    readonly #candidates: number
    readonly #players: UnitController
    readonly #leaf: UnitController
    readonly #depths: readonly number[]|undefined
    readonly #hiddenDecks: boolean
    readonly #combine: Combination
    readonly #depth: number
}
