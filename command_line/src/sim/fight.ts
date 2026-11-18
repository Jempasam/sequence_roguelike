import { Arena, ARENA_SIZE, askAi, Battle, DeckAi, monsterStart, partyStarts, Rng, Team, Vector2 } from "@game/core/mecard"
import type { BattlePlan, Unit, UnitController } from "@game/core/mecard"

import type { Body } from "./fighters"
import { Journal } from "./journal"
import { REFINE_FAILED } from "./strategies"
import type { Strategy } from "./strategies"
import type { Outcome } from "./stats"

/** Who takes part in a battle, on one side. */
export interface Combatant {
    readonly name: string
    readonly body: Body
    readonly strategy: Strategy

    /** Is it a monster of the game as a foe, with the body a run gives it, that no hero's refill fills? */
    readonly hostile: boolean
}

export interface FightSpec {
    readonly allies: readonly Combatant[]
    readonly foes: readonly Combatant[]

    /** Do the allies start on the monsters' side, the foes on the party's? */
    readonly mirrored: boolean
    readonly seed: number
    readonly maxRounds: number

    /** How many rounds in a row without any life gained or lost make a battle blocked, none to never. */
    readonly stall: number

    /** Is a battle that times out given to the side that hurt the other the most, if any did? */
    readonly softWin: boolean

    /** What plays the units a battle makes by itself, a clone, a summoned body. */
    readonly defaults: { readonly allies: Strategy, readonly foes: Strategy }

    /** Is everything that happens written down, in {@link FightResult.log}? */
    readonly journal?: boolean
}

export interface FightResult {
    readonly outcome: Outcome
    readonly rounds: number

    /** Was it a timeout that the soft win gave to a side? */
    readonly soft: boolean

    /** The effects that failed, as the battle told them, and the error that stopped the battle if one did. */
    readonly errors: readonly string[]

    /** The full account of the battle, one line per thing that happened: only when the spec asked for it. */
    readonly log?: readonly string[]
}

/** How a battle ended for the allies, in the journal. */
const OUTCOME_TEXT: Readonly<Record<Outcome, string>> = {
    win: "victoire des alliés",
    loss: "défaite des alliés",
    draw: "nul",
    timeout: "timeout",
}

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

/** The life of every unit that counts for its team, together: what a blocked battle stops changing. */
function lifeOf(battle: Battle): number {
    return battle.units.reduce((sum, unit) => sum + (unit.decisive ? unit.life : 0), 0)
}

/** A unit of the start of a battle, and the life it started with. */
interface Starter {
    readonly unit: Unit
    readonly life: number
    readonly ally: boolean
}

/** The share of its starting life a side has left: 1 when none was lost. */
function leftOf(starters: readonly Starter[], ally: boolean): number {
    const side = starters.filter(starter => starter.ally === ally)
    const started = side.reduce((sum, starter) => sum + starter.life, 0)
    return started === 0 ? 1 : side.reduce((sum, starter) => sum + starter.unit.life, 0) / started
}

/**
 * Who a battle that timed out goes to under the soft win: the side that took the most of the other's starting
 * life. A side wins only if the other lost some, so two sides that hurt each other as much, or not at all,
 * stay a timeout.
 */
function softOutcome(starters: readonly Starter[]): Outcome {
    const alliesLeft = leftOf(starters, true)
    const foesLeft = leftOf(starters, false)
    if(foesLeft < 1 && foesLeft < alliesLeft) return "win"
    if(alliesLeft < 1 && alliesLeft < foesLeft) return "loss"
    return "timeout"
}

/**
 * Play a battle to its end, to the round limit or to a block, then say how it ended for the allies.
 *
 * @remarks
 * It plays a round as the game does: the bots commit the chain of the deck AI, the others the one of their
 * strategy, then each unit holding usables uses them if its strategy does, then the round plays out. A battle
 * that goes on past the round limit, or in which no unit gains or loses life for `stall` rounds in a row, is
 * told a timeout: two units that never meet would otherwise play every round up to the limit. With the soft
 * win, such a battle goes to the side that took the most of the other's starting life instead, and stays a
 * timeout only on a tie. A battle that throws is told a timeout too, with the error.
 */
export function fight(spec: FightSpec): FightResult {
    const rng = new Rng(spec.seed)
    const strategyRng = new Rng(rng.int(2 ** 31))
    const battle = new Battle(new Arena(ARENA_SIZE, ARENA_SIZE), rng.int(2 ** 31))
    const alliesTeam = new Team("Héros")
    const foesTeam = new Team("Monstres")
    const strategies = new Map<Unit, Strategy>()
    const starters: Starter[] = []
    // The AI of each strategy, made once per battle with its own random numbers.
    const ais = new Map<Strategy, UnitController>()
    const aiOf = (strategy: Strategy): UnitController => {
        const known = ais.get(strategy) ?? strategy.ai(strategyRng)
        ais.set(strategy, known)
        return known
    }

    const bottom = spec.mirrored ? spec.foes : spec.allies
    const starts = partyStarts(bottom.length)
    const place = (combatant: Combatant, side: "allies"|"foes", index: number): void => {
        const atBottom = (side === "foes") === spec.mirrored
        const carries = combatant.body.usables.length > 0 && combatant.strategy.usables
        const unit = battle.add({
            name: combatant.name,
            team: side === "allies" ? alliesTeam : foesTeam,
            // The game's own AI is the bot of the battle; any other plays as its strategy's AI says.
            controller: combatant.strategy.deck && !carries ? "bot" : aiOf(combatant.strategy),
            position: atBottom ? starts[index] : monsterStart(index),
            direction: atBottom ? Vector2.UP : Vector2.DOWN,
            hearts: combatant.body.hearts,
            decks: combatant.body.decks,
            unlimited: combatant.body.unlimited,
            items: combatant.body.items,
            usables: combatant.body.usables,
            bases: combatant.body.bases,
        })
        strategies.set(unit, combatant.strategy)
        if(!combatant.hostile) battle.refill(unit)
        starters.push({ unit, life: unit.life, ally: side === "allies" })
    }
    spec.allies.forEach((combatant, index) => place(combatant, "allies", index))
    spec.foes.forEach((combatant, index) => place(combatant, "foes", index))
    const journal = spec.journal ? new Journal(battle) : null
    journal?.snapshot("Départ")
    const told = (result: FightResult, how: string): FightResult => {
        if(!journal) return result
        journal.snapshot("Arrivée")
        journal.note(`Issue : ${how}, ${result.rounds} round(s)${result.errors.length > 0 ? `, ${result.errors.length} erreur(s)` : ""}`)
        for(const error of result.errors) journal.note(`  erreur : ${error}`)
        return { ...result, log: journal.lines }
    }

    const strategyOf = (unit: Unit): Strategy => {
        return strategies.get(unit) ?? (unit.team === alliesTeam ? spec.defaults.allies : spec.defaults.foes)
    }
    // What a strategy could not do, told with the effects that failed.
    const notes: string[] = []
    const failures = (): string[] => [...battle.events.flatMap(event => event.type === "error" ? [messageOf(event.error)] : []), ...notes]

    const timedOut = (): FightResult => {
        const outcome = spec.softWin ? softOutcome(starters) : "timeout"
        const why = battle.round >= spec.maxRounds ? "limite de rounds" : "bloqué"
        const how = outcome === "timeout" ? `timeout (${why})` : `timeout (${why}) donné aux points : ${OUTCOME_TEXT[outcome]}`
        return told({ outcome, rounds: battle.round, soft: outcome !== "timeout", errors: failures() }, how)
    }

    let life = lifeOf(battle)
    let still = 0
    try {
        while(battle.phase !== "over"){
            const blocked = spec.stall > 0 && still >= spec.stall
            if(battle.round >= spec.maxRounds || blocked) return timedOut()
            battle.startRound()
            const planners = [...battle.initiative]
            // Every unit decides from the battle before any chain is committed: none knows what the others choose.
            const plans = new Map<Unit, BattlePlan>()
            for(const unit of planners){
                try {
                    plans.set(unit, askAi(battle, unit, battle.controllerOf(unit)))
                }
                catch {
                    // A battle is not copied while a process goes on: the deck's chain is played, and it is told.
                    notes.push(REFINE_FAILED)
                    plans.set(unit, { chain: new DeckAi().decide(unit).chain })
                }
            }
            for(const unit of planners) battle.commit(unit, plans.get(unit)!.chain)
            for(const unit of planners){
                const chosen = plans.get(unit)!.usables
                if(chosen) {
                    if(chosen.length > 0) battle.activate(unit, chosen)
                    continue
                }
                if(!strategyOf(unit).usables || strategyOf(unit).choosesUsables) continue
                const ready = unit.usables.filter(carried => !carried.spent)
                if(ready.length > 0) battle.activate(unit, ready)
            }
            battle.endPreparation()
            battle.playRound()
            const after = lifeOf(battle)
            still = after === life ? still + 1 : 0
            life = after
        }
    }
    catch(error){
        return told({
            outcome: "timeout", rounds: battle.round, soft: false,
            errors: [...failures(), `combat interrompu : ${messageOf(error)}`],
        }, "combat interrompu par une exception")
    }
    const outcome = battle.winner === alliesTeam ? "win" : battle.winner === foesTeam ? "loss" : "draw"
    return told({ outcome, rounds: battle.round, soft: false, errors: failures() }, OUTCOME_TEXT[outcome])
}
