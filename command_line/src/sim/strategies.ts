import { CardChain, loadBattle, planFor, saveBattle } from "@game/core/mecard"
import type { Battle, BattleSave, Card, Rng, Team, Unit } from "@game/core/mecard"

import { UsageError } from "./errors"

/** How a unit plays its rounds: the chain it commits from its hand. */
export interface Strategy {
    /** How it is written in `--ai`, `deck`, `lookahead:6-usables`. */
    readonly name: string

    /** Does it use the usables of its units, every round? */
    readonly usables: boolean

    /** Is it the AI of the game, which a bot unit plays on its own? */
    readonly deck: boolean

    /** The chain a unit commits first, from its hand. */
    plan(unit: Unit, battle: Battle, rng: Rng): CardChain

    /**
     * Think again about the chain of a unit once every unit has committed one: it may commit another. Called
     * for one unit after the other, in the order of the initiative.
     *
     * @returns Did it think? False when it could not, and the chain stays as it was.
     */
    refine?(unit: Unit, battle: Battle, rng: Rng): boolean
}

/** What is told when a strategy could not think about a round. */
export const REFINE_FAILED = "lookahead : le combat n'a pas pu être copié (un processus est en cours), la chaîne du deck est jouée"

/** One AI the user may choose. */
export interface StrategyKind {
    readonly name: string
    readonly description: string

    /** Make it, from what follows its name after a colon, if anything. */
    create(argument: number|null, usables: boolean): Strategy
}

/** How many chains `lookahead` tries each round, by default. */
const DEFAULT_CANDIDATES = 6

/** The cards of a unit it may play this round: its hand, and what it committed already. */
function available(unit: Unit, battle: Battle): Card[] {
    return [...unit.hand, ...battle.planOf(unit)?.cards ?? []]
}

/** What a battle gives a team now: its life left against the others', a win or a loss weighing a lot. */
function score(battle: Battle, team: Team): number {
    let total = 0
    for(const unit of battle.units) if(unit.decisive) total += (unit.team === team ? 1 : -1) * unit.life
    if(battle.phase === "over") total += battle.winner === team ? 1000 : battle.winner === null ? 0 : -1000
    return total
}

/** The positions in a list of the cards a chain holds, each position used once. */
function positionsOf(cards: readonly Card[], chain: CardChain): number[] {
    const used = new Set<number>()
    return chain.cards.map(card => {
        const at = cards.findIndex((each, index) => each === card && !used.has(index))
        used.add(at)
        return at
    })
}

/** The deck AI: the hand read from left to right, as the monsters do. */
function deck(usables: boolean, name: string): Strategy {
    return { name, usables, deck: true, plan: unit => planFor(unit) }
}

/** The hand shuffled, then read from left to right: any order, always a valid chain. */
function random(usables: boolean, name: string): Strategy {
    return {
        name, usables, deck: false,
        plan(unit, _battle, rng){
            const hand = [...unit.hand]
            rng.shuffle(hand)
            return CardChain.leftToRight(hand, unit.stats.chainSize.value)
        },
    }
}

/**
 * Tries chains and keeps the one that goes best: the chain of the deck AI and some drawn at random are each
 * played out on a copy of the battle, and the one leaving its team the most life, against the others', is
 * committed.
 */
function lookahead(candidates: number, usables: boolean, name: string): Strategy {
    return {
        name, usables, deck: false,
        plan: unit => planFor(unit),
        refine(unit, battle, rng){
            const cards = available(unit, battle)
            const size = unit.stats.chainSize.value
            const tried = new Map<string, number[]>()
            const current = battle.planOf(unit)
            if(current) tried.set(current.cards.map(card => card.name).join("|"), positionsOf(cards, current))
            for(let index = 1; index < candidates; index++){
                const order = cards.map((_, position) => position)
                rng.shuffle(order)
                const chain = CardChain.leftToRight(order.map(position => cards[position]), size)
                const shuffled = order.map(position => cards[position])
                const positions = positionsOf(shuffled, chain).map(at => order[at])
                const key = positions.map(position => cards[position].name).join("|")
                if(!tried.has(key)) tried.set(key, positions)
            }
            let save: BattleSave
            try {
                save = saveBattle(battle)
            }
            catch{
                // A battle is not saved while a process goes on: the chain it has is kept, and it is told.
                return false
            }
            let best: number[]|null = null
            let bestScore = -Infinity
            for(const positions of tried.values()){
                const copy = loadBattle(save)
                const mine = copy.units[battle.units.indexOf(unit)]
                const copied = available(mine, copy)
                copy.commit(mine, new CardChain(positions.map(position => copied[position])))
                copy.endPreparation()
                copy.playRound()
                const value = score(copy, mine.team)
                if(value > bestScore){
                    best = positions
                    bestScore = value
                }
            }
            if(best) battle.commit(unit, new CardChain(best.map(position => cards[position])))
            return true
        },
    }
}

/** The AIs, in the order `--ai` lists them. */
export const STRATEGIES: readonly StrategyKind[] = [
    {
        name: "deck",
        description: "l'IA du jeu : la main lue de gauche à droite, comme les monstres",
        create: (_, usables) => deck(usables, usables ? "deck" : "deck-usables"),
    },
    {
        name: "random",
        description: "la main mélangée, puis lue de gauche à droite : un ordre quelconque",
        create: (_, usables) => random(usables, usables ? "random" : "random-usables"),
    },
    {
        name: "lookahead",
        description: `essaie ${DEFAULT_CANDIDATES} chaînes (lookahead:K pour K) jouées sur une copie du combat, garde la meilleure`,
        create: (argument, usables) => {
            const candidates = argument ?? DEFAULT_CANDIDATES
            const base = `lookahead:${candidates}`
            return lookahead(candidates, usables, usables ? base : `${base}-usables`)
        },
    },
]

/**
 * Read an AI: `deck`, `random`, `lookahead` or `lookahead:K`, followed by `-usables` to leave the usables
 * unused.
 *
 * @param option - How an error names where the text came from.
 * @throws {@link UsageError} On an AI that does not exist or an argument that is no number from 2.
 */
export function parseStrategy(text: string, option: string): Strategy {
    const match = /^([a-z]+)(?::(\d+))?(-usables)?$/.exec(text.trim())
    const kind = match ? STRATEGIES.find(candidate => candidate.name === match[1]) : undefined
    if(!match || !kind){
        const listed = STRATEGIES.map(each => `${each.name} (${each.description})`).join(" ; ")
        throw new UsageError(`${option} : IA invalide « ${text} ». IA disponibles : ${listed}. Suffixe -usables pour ne pas les utiliser.`)
    }
    if(match[2] !== undefined && kind.name !== "lookahead"){
        throw new UsageError(`${option} : « ${kind.name} » ne prend pas d'argument (seul lookahead:K en prend un).`)
    }
    if(match[2] !== undefined && Number(match[2]) < 2){
        throw new UsageError(`${option} : lookahead:${match[2]} : au moins 2 chaînes à essayer.`)
    }
    return kind.create(match[2] === undefined ? null : Number(match[2]), match[3] === undefined)
}
