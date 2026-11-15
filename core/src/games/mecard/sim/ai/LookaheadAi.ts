import type { Rng } from "../base/Rng"
import type { Vector2 } from "../base/Vector2"
import type { Battle } from "../battle/Battle"
import type { Unit } from "../battle/Unit"
import { playedUnlimited } from "../card/Card"
import type { Card } from "../card/Card"
import { CardChain } from "../card/CardChain"
import { nearestTurn, TurnCard } from "../card/subs/movement/TurnCard"
import { loadBattle, saveBattle } from "../save/battleSave"
import type { StatusType } from "../status/Status"
import type { Carried } from "../usable/Usable"

import { Observable } from "../base/Observable"

import { askAi, depthOrOwn, ROOT_DEPTH } from "./UnitController"
import type { UnitController, BattlePlan } from "./UnitController"
import { checkPreparation } from "./chains"
import { DeckAi, deckChain } from "./Bot"
import { combine, commitOthers, decideRoot, guessLevels, known, levelsOf, lineCloseness, positionsOf, score } from "./lookaheadHelpers"
import type { Combination, GuessGroup } from "./lookaheadHelpers"
import { PredictionMemo } from "./PredictingController"
import type { PredictingController } from "./PredictingController"
import type { LookaheadOptions } from "./ShuffleAi"

/** What a card in hand, a status or a process weighs in a chain tried by smart3 and smart4: a tenth of a heart. */
const NUDGE = 0.1

/** What using a usable costs in a chain tried by smart3: below anything else, so any good it does wins. */
const USABLE_COST = 0.01

/** The most rounds of a status that count in what it is worth: a longer one weighs as much as this. */
const STATUS_CAP = 5

/**
 * What a status gained by a unit is worth, by what it is to the unit and whose the unit is: a bonus for a
 * positive one on an ally and a negative one on a foe, a cost the other way round.
 */
const STATUS_SIDES = {
    ally: { positive: 1, neutral: 0.5, negative: -1 },
    foe: { positive: -1, neutral: 0, negative: 1 },
} as const

/**
 * What a status of a level lasts is worth, in {@link NUDGE}: nothing up to `threshold` rounds, a unit more for
 * each round after, up to {@link STATUS_CAP} of them.
 */
function lasting(level: number, threshold: number): number {
    return NUDGE * Math.min(Math.max(level - threshold, 0), STATUS_CAP)
}

/**
 * What the lookahead AIs did in this process, for whoever measures them: the rounds played out on a copy of
 * a battle, and the chains left out as invalid without being played. Per thread: read it with `--jobs 1`.
 */
export const LOOKAHEAD_COUNTS = { played: 0, invalid: 0 }

/** How many of the best chains tried `smart7` plays two rounds out, to choose among them. */
export const AHEAD_CHAINS = 3

/** The most chains `smart6` plays out to better its hand, once its first ones are tried. */
const LOCAL_BUDGET = 40

/** What a root lookahead guessed the others to do, and what it chose against it. */
export interface Prediction {
    /** The unit that decided, in the view it decided in. */
    readonly unit: Unit

    /** The view it decided in: the units of the plans are its units. */
    readonly view: Battle

    /** The guesses, the levels guessing the same put together. */
    readonly groups: readonly GuessGroup[]

    /** What it chose. */
    readonly plan: BattlePlan
}

/** What sets a lookahead AI apart from another. */
export interface Variant {
    /** Does it score what is left in hand, and choose its usables? */
    readonly heuristics: boolean

    /** May it play less than its hand, leaving the roots out that do better left out? */
    readonly prune: boolean

    /** Does it better its hand by trying other orders and other cards left out, one change at a time? */
    readonly local: boolean

    /** Does it score statuses by how long they last, on any unit, rather than a bonus for each of its own? */
    readonly durations: boolean

    /**
     * Rounds a status must last for the first one to count, when `durations`: the bonus starts above it, so
     * 1 values what a round does not show, 2 what the round after shows as well. 1 when not told.
     */
    readonly threshold?: number

    /**
     * Does it choose among its best chains by playing them two rounds out? The second round of the battle
     * tried is played for every unit, ours too, by {@link LookaheadOptions.future}, the deck AI when not told.
     */
    readonly ahead?: boolean

    /** How many of its best chains it plays two rounds out, when `ahead`: {@link AHEAD_CHAINS} when not told. */
    readonly aheadChains?: number

    /**
     * Does it leave out the chains whose preparations do not rewrite whole, before playing them on a copy?
     * Only their `rewrite` is looked at, see {@link checkPreparation}.
     */
    readonly valid?: boolean

    /**
     * What standing in line with an enemy weighs, in hearts, once a battle tried is over, for each enemy
     * standing: `exposed` times how close it stands in front of the enemy (a cost when negative), `aim` times
     * how close the enemy stands in front of it, see {@link lineCloseness}. Nothing when not told.
     */
    readonly positions?: { readonly exposed: number, readonly aim: number }
}

/** The hands of the order of a hand and how many of its cards play, changed once: two cards swapped, one moved, one more or less. */
function* neighbours(order: readonly number[], count: number): Generator<{ order: number[], count: number }> {
    if(count > 0) yield { order: [...order], count: count - 1 }
    if(count < order.length) yield { order: [...order], count: count + 1 }
    for(let from = 0; from < order.length; from++){
        for(let to = from + 1; to < order.length; to++){
            const swapped = [...order]
            swapped[from] = order[to]
            swapped[to] = order[from]
            yield { order: swapped, count }
        }
    }
    for(let from = 0; from < order.length; from++){
        for(let to = 0; to < order.length; to++){
            if(Math.abs(from - to) <= 1) continue
            const moved = [...order]
            moved.splice(to, 0, ...moved.splice(from, 1))
            yield { order: moved, count }
        }
    }
}

/** A card of a chain tried by {@link LookaheadAi}: a card of the hand by its place, or a card played unlimited. */
type Slot = { readonly hand: number }|{ readonly free: Card }

/** Where the step goes in a chain tried: nowhere, first, or last. */
type StepPlace = "none"|"first"|"last"

/** A turn put in a chain tried, before the root of the hand at a place: 0 first. */
interface TurnPlace {
    readonly card: TurnCard
    readonly root: number
}

/** How a unit moves with its cards played unlimited: its step, and its turn. */
interface Maneuver {
    readonly step: StepPlace
    readonly turn: TurnPlace|null
}

/** Where a unit and its nearest enemy stood, as a battle tried played out. */
interface Track {
    /** At the start of each step of the unit: where it stood, and its enemy. */
    readonly steps: { readonly self: Vector2, readonly enemy: Vector2 }[]

    /** Where the enemy stood at the start of each pass, from the first. */
    readonly passes: Vector2[]

    /** Where the enemy stood once the round was over. */
    end: Vector2
}

/** What a chain tried gave: its score, and how far from its enemy the unit ended, to break a tie. */
interface Outcome {
    readonly value: number
    readonly distance: number
    readonly track: Track|null
}

/** Did one outcome go better than another: more score, or as much and nearer its enemy. */
function better(first: Outcome, second: Outcome|null): boolean {
    if(!second) return true
    return first.value > second.value || first.value === second.value && first.distance < second.distance
}

/** A hand read from left to right, in an order, as the places in the hand of the cards it holds. */
function handChain(cards: readonly Card[], order: readonly number[], size: number): number[] {
    const shuffled = order.map(position => cards[position])
    return positionsOf(shuffled, CardChain.leftToRight(shuffled, size)).map(at => order[at])
}

/** The roots of a chain of the hand, as the places in the hand of their cards, in the order they play. */
function rootsOf(cards: readonly Card[], positions: readonly number[]): number[][] {
    return new CardChain(positions.map(position => cards[position])).roots.map(root => {
        return positions.slice(root.index, root.index + root.size)
    })
}

/**
 * The chain of the roots of the hand with a maneuver: the turn before its root, the step first or last. Its
 * cards played unlimited take places, so the last roots of the hand go when it would hold too many.
 *
 * @returns The chain, none when the maneuver alone holds more than the chain.
 */
function withManeuver(roots: readonly number[][], maneuver: Maneuver, stepCard: Card|null, size: number): Slot[]|null {
    const step = maneuver.step !== "none" && stepCard ? stepCard : null
    const free = (step ? 1 : 0) + (maneuver.turn ? 1 : 0)
    if(free > size) return null
    const kept: number[][] = []
    let held = free
    for(const root of roots){
        if(held + root.length > size) break
        kept.push(root)
        held += root.length
    }
    const slots: Slot[] = []
    const turnAt = maneuver.turn ? Math.min(maneuver.turn.root, kept.length) : -1
    for(let index = 0; index <= kept.length; index++){
        if(index === turnAt) slots.push({ free: maneuver.turn!.card })
        if(index === 0 && step && maneuver.step === "first") slots.push({ free: step })
        if(index < kept.length) slots.push(...kept[index].map(hand => ({ hand })))
    }
    if(step && maneuver.step === "last") slots.push({ free: step })
    return slots
}

/** What tells two chains tried apart: their cards, the turns by their direction. */
function keyOf(cards: readonly Card[], slots: readonly Slot[]): string {
    return slots.map(slot => {
        if("hand" in slot) return cards[slot.hand].name
        return slot.free instanceof TurnCard ? `turn:${slot.free.step}` : `free:${slot.free.name}`
    }).join("|")
}

/** The cards of a chain tried, in a battle: those of the hand found again by their place in it. */
function cardsOf(slots: readonly Slot[], cards: readonly Card[], unit: Unit, copy: Unit): Card[] {
    return slots.map(slot => "hand" in slot ? cards[slot.hand] : copy.unlimited[unit.unlimited.indexOf(slot.free)] ?? slot.free)
}

/**
 * The cards a unit may play from its hand this round: its hand, and those of its chain not played unlimited,
 * the secret card left out.
 */
function handCards(unit: Unit, battle: Battle): Card[] {
    const plan = battle.planOf(unit)?.cards ?? []
    const free = playedUnlimited(plan, unit.unlimited)
    return known([...plan.filter((_, index) => !free[index]), ...unit.hand])
}

/** How many steps a chain plays before a place: an estimate, read off the cards, every preparation left aside. */
function stepsBefore(cards: readonly Card[]): number {
    return new CardChain(cards).actionsLeft().length
}

/**
 * Tries chains in three passes, each played out on a copy of the battle, and keeps the one that goes best,
 * each pass keeping what the one before found best:
 * - what to play from the hand: the chain of the deck AI and some drawn at random, the unit facing its
 *   enemy first and stepping last;
 * - where the step goes: nowhere, first or last;
 * - where the turn goes and where it faces: before any root of the hand, toward where the nearest enemy
 *   stands when the turn plays, where it stands once that pass is over, or once the next one is, as the
 *   battle tried before played them out; or no turn, or away from the enemy first.
 *
 * The cards played unlimited take places in the chain, so a step may leave a card of the hand to the next
 * round when it goes better. Of two chains going as well, the one ending nearer the enemy is kept.
 *
 * With its heuristics (`smart3`), a chain tried is also worth {@link NUDGE} for each card left in hand up to
 * the hand's size, each status of the unit gained or gone up (twice for a positive one, minus twice for a
 * negative one) and each process started for it; and a fourth pass chooses its usables: none, each alone,
 * or all, each used costing {@link USABLE_COST}. Without (`smart2`), only life counts and the usables are
 * left to the fight.
 *
 * With `prune` (`smart4`), the unit may play less than its hand: after the hand pass, each root left out in
 * turn is tried, down to no card of the hand, while that goes better. Otherwise the chain is as full as the
 * hand and its size allow.
 *
 * With `local` (`smart6`), the hand is bettered after its first tries, one change at a time: two cards swapped,
 * one moved, or one more or one less played, each tried on a copy, the first that does better kept, up to
 * {@link LOCAL_BUDGET} chains. It knows no card: a combination that goes well, a spell with its element, a
 * ritual with the element that reacts, is found by what the battle tried gives. With `durations` (`smart5`, `smart6`), the status
 * of any unit, gained while an ally acts, weighs {@link lasting} of its level, as a bonus or a cost by its
 * polarity and whose unit it is ({@link STATUS_SIDES}); a process started weighs nothing.
 *
 * With several {@link LookaheadOptions.depths}, each chain tried is played against the others guessed at
 * each level, the levels guessing the same played once, and is worth the mean of what it gives; how far
 * from its enemy it ends, and where they stood, are read off the deepest level.
 */
export class LookaheadAi implements PredictingController {

    /**
     * @param depth - Its base depth: how many levels of the AIs of the other units it calls when it is asked
     * with {@link ROOT_DEPTH}, which leaves it to choose.
     * @param options - Its players (itself when not told, so the units it plays against are guessed to
     * think as it does), its leaf and its depths.
     */
    constructor(
        rng: Rng, candidates: number, usables: boolean, variant: Variant, depth: number, options: LookaheadOptions = {},
    ){
        this.#depth = depth
        this.#rng = rng
        this.#candidates = candidates
        this.#usables = usables
        this.#variant = variant
        this.#players = options.players ?? this
        this.#leaf = options.leaf ?? new DeckAi()
        this.#depths = options.depths
        this.#hiddenDecks = options.hiddenDecks ?? false
        this.#combine = options.combine ?? "mean"
        this.#future = options.future ?? null
    }

    /**
     * What a unit plays in the second round of a battle tried: what the AI of the future decides, with depth
     * 0, else the chain of the deck AI, the secret card left out either way.
     */
    #futurePlan(copy: Battle, unit: Unit): BattlePlan {
        const byDeck = (): BattlePlan => ({ chain: deckChain(unit, known(unit.hand)) })
        if(!this.#future) return byDeck()
        try {
            return askAi(copy, unit, this.#future, {}, 0)
        }
        catch {
            // A battle is not copied while a process goes on: the unit plays its hand.
            return byDeck()
        }
    }

    /**
     * What it guessed the others to do and chose, each time it decides as the root AI (asked with
     * {@link ROOT_DEPTH}): never for a guess made for another AI.
     */
    public readonly predicted = new Observable<Prediction>(error => { throw error })

    public decide(unit: Unit, battle: Battle, depth: number): BattlePlan {
        const memo = new PredictionMemo(this.#players, this.#leaf)
        const levels = levelsOf(depth, this.#depth, this.#depths)
        return decideRoot(battle, unit, this.#hiddenDecks, (view, mine) => {
            const { plan, groups } = this.#decide(mine, view, levels, memo)
            if(depth === ROOT_DEPTH) this.predicted.notify({ unit: mine, view, groups, plan })
            return plan
        })
    }

    public decideWith(unit: Unit, battle: Battle, depth: number, memo: PredictionMemo): BattlePlan {
        return this.#decide(unit, battle, [depthOrOwn(depth, this.#depth)], memo).plan
    }

    #decide(
        unit: Unit, battle: Battle, levels: readonly number[], memo: PredictionMemo,
    ): { plan: BattlePlan, groups: readonly GuessGroup[] } {
        const rng = this.#rng
        const candidates = this.#candidates
        const usables = this.#usables
        const { heuristics, prune, local, durations } = this.#variant
        const threshold = this.#variant.threshold ?? 1
        const ahead = this.#variant.ahead ?? false
        const valid = this.#variant.valid ?? false
        const aheadChains = this.#variant.aheadChains ?? AHEAD_CHAINS
        const positions = this.#variant.positions ?? null
        // A battle is not saved while a process goes on: the view could not be made then, and the AI is not asked.
        const save = saveBattle(battle)
        const groups = guessLevels(battle, unit, levels, memo)
        const cards = handCards(unit, battle)
        const size = unit.stats.chainSize.value
        const unitIndex = battle.units.indexOf(unit)
        const stepCard = unit.unlimited.find(card => !(card instanceof TurnCard)) ?? null
        const turns = unit.unlimited.filter(card => card instanceof TurnCard)
        const enemy = battle.nearestEnemy(unit)
        const enemyIndex = enemy ? battle.units.indexOf(enemy) : -1
        const turnToward = (target: Vector2, from: Vector2): TurnCard|null => {
            const offset = target.minus(from)
            if(offset.length === 0) return null
            const step = nearestTurn(offset)
            return turns.find(each => each.step === step) ?? null
        }
        const facing = enemy ? turnToward(enemy.position, unit.position) : null

        const ready = usables && heuristics ? unit.usables.filter(carried => !carried.spent) : []

        const tried = new Map<string, Outcome>()
        const refused = new Set<string>()
        const chains = new Map<string, Slot[]>()
        let best: { slots: Slot[], outcome: Outcome }|null = null
        /** Play a chain out on a copy, once: none when it was played already. */
        const attempt = (slots: Slot[]|null, record: boolean): Outcome|null => {
            if(!slots) return null
            const key = keyOf(cards, slots)
            if(refused.has(key)) return null
            const known = tried.get(key)
            if(known && (!record || known.track)) return known
            if(!known && valid && checkPreparation(cardsOf(slots, cards, unit, unit), battle.cardsOf(unit)).length > 0){
                // A chain whose preparations do not rewrite whole: not played, not tried again. A chain
                // already played was checked then.
                refused.add(key)
                LOOKAHEAD_COUNTS.invalid++
                return null
            }
            let outcome: Outcome
            try{
                outcome = play(slots, record, [])
            }
            catch{
                // A chain the battle refuses, such as a card of the hand that is also played unlimited, once too many.
                refused.add(key)
                return null
            }
            tried.set(key, outcome)
            chains.set(key, slots)
            if(better(outcome, best?.outcome ?? null)) best = { slots, outcome }
            return outcome
        }
        /** A chain played against each group of guesses: what it gives made one, tracked on the deepest. */
        const play = (slots: Slot[], record: boolean, used: readonly number[], second = false): Outcome => {
            const scores: { value: number, weight: number }[] = []
            let deep: Outcome|null = null
            for(const group of groups){
                const outcome = playAgainst(group, slots, record && group.deepest, used, second)
                scores.push({ value: outcome.value, weight: group.weight })
                if(group.deepest) deep = outcome
            }
            return { value: combine(this.#combine, scores), distance: deep!.distance, track: deep!.track }
        }
        const playAgainst = (
            group: GuessGroup, slots: Slot[], record: boolean, used: readonly number[], second: boolean,
        ): Outcome => {
            LOOKAHEAD_COUNTS.played++
            const copy = loadBattle(save)
            const mine = copy.units[unitIndex]
            const foe = enemyIndex >= 0 ? copy.units[enemyIndex] : null
            const copied = handCards(mine, copy)
            const observers = []
            let nudges = 0
            if(heuristics && durations){
                // The status of any unit, gained while an ally acts (the usables, at first): by how long it lasts.
                const levels = new Map<Unit, Map<StatusType, number>>()
                for(const each of copy.units) levels.set(each, new Map([...each.statuses].map(([type, status]) => [type, status.level])))
                let acting: Unit|null = mine
                const gained = (holder: Unit, type: StatusType, level: number): void => {
                    const held = levels.get(holder) ?? new Map<StatusType, number>()
                    levels.set(holder, held)
                    const before = held.get(type) ?? 0
                    held.set(type, level)
                    if(level <= before || !acting || acting.team !== mine.team) return
                    const side = STATUS_SIDES[holder.team === mine.team ? "ally" : "foe"]
                    nudges += side[type.polarity] * (lasting(level, threshold) - lasting(before, threshold))
                }
                observers.push(copy.signals.cardActivated.add(({ unit: actor }) => { acting = actor }))
                observers.push(copy.signals.statusAdded.add(({ unit: holder, type, level }) => gained(holder, type, level)))
                observers.push(copy.signals.statusLeveled.add(({ unit: holder, type, level }) => gained(holder, type, level)))
                if(used.length > 0) copy.activate(mine, used.map(at => mine.usables[unit.usables.indexOf(ready[at])]))
                nudges -= USABLE_COST * used.length
            }
            else if(heuristics){
                const levels = new Map([...mine.statuses].map(([type, status]) => [type, status.level]))
                const gained = (type: StatusType, level: number): void => {
                    if(level > (levels.get(type) ?? 0)) nudges += NUDGE * (type.polarity === "positive" ? 2 : type.polarity === "negative" ? -2 : 1)
                    levels.set(type, level)
                }
                observers.push(copy.signals.statusAdded.add(({ unit: holder, type, level }) => { if(holder === mine) gained(type, level) }))
                observers.push(copy.signals.statusLeveled.add(({ unit: holder, type, level }) => { if(holder === mine) gained(type, level) }))
                observers.push(copy.signals.processStarted.add(({ unit: holder }) => { if(holder === mine) nudges += NUDGE }))
                if(used.length > 0) copy.activate(mine, used.map(at => mine.usables[unit.usables.indexOf(ready[at])]))
                nudges -= USABLE_COST * used.length
            }
            let track: Track|null = null
            if(record && foe){
                const kept: Track = { steps: [], passes: [foe.position], end: foe.position }
                track = kept
                observers.push(mine.stepStarted.add(() => kept.steps.push({ self: mine.position, enemy: foe.position })))
                observers.push(copy.passStarted.add(() => kept.passes.push(foe.position)))
            }
            copy.commit(mine, new CardChain(cardsOf(slots, copied, unit, mine)))
            commitOthers(copy, battle, group.plans)
            copy.endPreparation()
            copy.playRound()
            if(second && copy.phase !== "over"){
                // The round after, every unit played by the AI of the future, ours too, deciding before any commits.
                copy.startRound()
                const units = [...copy.initiative]
                const plans = units.map(each => this.#futurePlan(copy, each))
                units.forEach((each, at) => copy.commitPlan(each, plans[at]))
                copy.endPreparation()
                copy.playRound()
            }
            for(const observer of observers) observer.remove()
            if(track && foe) track.end = foe.position
            const nearest = copy.nearestEnemy(mine)
            const distance = mine.alive && nearest ? nearest.position.distance(mine.position) : 0
            if(heuristics) nudges += NUDGE * Math.min(mine.hand.length, mine.stats.handSize.value)
            if(positions && mine.alive){
                // Standing in front of an enemy costs, an enemy standing in front of us pays: each enemy, summed.
                for(const other of copy.units){
                    if(!other.alive || !other.decisive || other.team === mine.team) continue
                    nudges += positions.exposed * lineCloseness(other, mine) + positions.aim * lineCloseness(mine, other)
                }
            }
            return { value: score(copy, mine.team) + nudges, distance, track }
        }

        // What to play from the hand: the deck's order first, then some at random.
        const byDefault: Maneuver = { step: "last", turn: facing ? { card: facing, root: 0 } : null }
        const deckOrder = cards.map((_, position) => position)
        const orders = [deckOrder]
        for(let index = 1; index < candidates; index++){
            const order = [...deckOrder]
            rng.shuffle(order)
            orders.push(order)
        }
        let bestRoots: number[][] = []
        let bestHand: Outcome|null = null
        let bestOrder = deckOrder
        for(const order of orders){
            const roots = rootsOf(cards, handChain(cards, order, size))
            const outcome = attempt(withManeuver(roots, byDefault, stepCard, size), false)
            if(outcome && better(outcome, bestHand)){
                bestHand = outcome
                bestRoots = roots
                bestOrder = order
            }
        }

        // The hand bettered one change at a time, from the best order, the first change that does better kept.
        if(local){
            let state = { order: bestOrder, count: bestOrder.length }
            let budget = LOCAL_BUDGET
            let improved = true
            while(improved && budget > 0){
                improved = false
                for(const next of neighbours(state.order, state.count)){
                    const known = tried.size
                    const roots = rootsOf(cards, handChain(cards, next.order.slice(0, next.count), size))
                    const outcome = attempt(withManeuver(roots, byDefault, stepCard, size), false)
                    budget -= tried.size - known
                    if(outcome && better(outcome, bestHand)){
                        bestHand = outcome
                        bestRoots = roots
                        state = next
                        improved = true
                        break
                    }
                    if(budget <= 0) break
                }
            }
        }

        // Less of the hand: each root left out in turn, while leaving one out does better, down to none.
        while(prune && bestRoots.length > 0){
            let lighter: number[][]|null = null
            for(let left = 0; left < bestRoots.length && !lighter; left++){
                const roots = bestRoots.filter((_, at) => at !== left)
                const outcome = attempt(withManeuver(roots, byDefault, stepCard, size), false)
                if(outcome && better(outcome, bestHand)){
                    bestHand = outcome
                    lighter = roots
                }
            }
            if(!lighter) break
            bestRoots = lighter
        }

        // Where the step goes, each tried tracking where the unit and its enemy stand.
        let bestStep: StepPlace = byDefault.step
        let bestTrack: Track|null = null
        let bestMoved: Outcome|null = null
        for(const step of ["none", "first", "last"] as const){
            const outcome = attempt(withManeuver(bestRoots, { ...byDefault, step }, stepCard, size), true)
            if(outcome && better(outcome, bestMoved)){
                bestMoved = outcome
                bestStep = step
                bestTrack = outcome.track
            }
        }

        // Where the turn goes, and where it faces.
        attempt(withManeuver(bestRoots, { step: bestStep, turn: null }, stepCard, size), false)
        if(enemy && facing){
            const away = turnToward(unit.position.minus(enemy.position).plus(unit.position), unit.position)
            if(away) attempt(withManeuver(bestRoots, { step: bestStep, turn: { card: away, root: 0 } }, stepCard, size), false)
        }
        if(bestTrack){
            const track = bestTrack
            const passAt = (pass: number): Vector2 => track.passes[pass] ?? track.end
            for(let root = 0; root <= bestRoots.length; root++){
                const before = bestRoots.slice(0, root).flat().map(position => cards[position])
                const step = stepsBefore(before) + (bestStep === "first" && root > 0 ? 1 : 0)
                const at = track.steps[step] ?? track.steps[track.steps.length - 1]
                const from = at?.self ?? unit.position
                const targets = [at?.enemy ?? passAt(step), passAt(step + 1), passAt(step + 2)]
                for(const target of targets){
                    const card = turnToward(target, from)
                    if(card) attempt(withManeuver(bestRoots, { step: bestStep, turn: { card, root } }, stepCard, size), false)
                }
            }
        }

        // The best chains tried, each played two rounds out: the one that goes best after the second is kept.
        if(ahead){
            const finalists = [...tried.entries()].sort(([, first], [, second]) => better(first, second) ? -1 : better(second, first) ? 1 : 0).slice(0, aheadChains)
            let bestAhead: { slots: Slot[], outcome: Outcome }|null = null
            for(const [key] of finalists){
                const slots = chains.get(key)
                if(!slots) continue
                let outcome: Outcome
                try{
                    outcome = play(slots, false, [], true)
                }
                catch{
                    continue
                }
                if(better(outcome, bestAhead?.outcome ?? null)) bestAhead = { slots, outcome }
            }
            if(bestAhead) best = bestAhead
        }

        const chosen = best as { slots: Slot[], outcome: Outcome }|null
        const chain = new CardChain(chosen ? cardsOf(chosen.slots, cards, unit, unit) : [])
        let used: readonly Carried[]|undefined

        // Which usables to use with the chain kept: none, each alone, or all.
        if(chosen && ready.length > 0){
            const choices = ready.map((_, at) => [at])
            if(ready.length > 1) choices.push(ready.map((_, at) => at))
            let bestUsed: readonly number[] = []
            let bestOutcome = chosen.outcome
            for(const used of choices){
                const outcome = play(chosen.slots, false, used, ahead)
                if(better(outcome, bestOutcome)){
                    bestOutcome = outcome
                    bestUsed = used
                }
            }
            if(bestUsed.length > 0) used = bestUsed.map(at => ready[at])
        }
        return { plan: { chain, usables: used }, groups }
    }

    readonly #rng: Rng
    readonly #candidates: number
    readonly #usables: boolean
    readonly #variant: Variant
    readonly #players: UnitController
    readonly #leaf: UnitController
    readonly #depths: readonly number[]|undefined
    readonly #hiddenDecks: boolean
    readonly #combine: Combination
    readonly #future: UnitController|null
    readonly #depth: number
}

