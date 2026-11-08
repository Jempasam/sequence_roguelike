import { Arena, ARENA_SIZE, Battle, monsterStart, partyStarts, pillarsFor, planFor, Rng, Team, Vector2 } from "@game/core/mecard"
import type { Unit } from "@game/core/mecard"

import type { Body } from "./fighters"
import { REFINE_FAILED } from "./strategies"
import type { Strategy } from "./strategies"
import type { Outcome } from "./stats"

/** Who takes part in a battle, on one side. */
export interface Combatant {
    readonly name: string
    readonly body: Body
    readonly strategy: Strategy

    /** Is it a monster of the game, whose chains the battle plans as it does in a run? */
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
}

export interface FightResult {
    readonly outcome: Outcome
    readonly rounds: number

    /** Was it a timeout that the soft win gave to a side? */
    readonly soft: boolean

    /** The effects that failed, as the battle told them, and the error that stopped the battle if one did. */
    readonly errors: readonly string[]
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

    const bottom = spec.mirrored ? spec.foes : spec.allies
    const starts = partyStarts(bottom.length)
    const place = (combatant: Combatant, side: "allies"|"foes", index: number): void => {
        const atBottom = (side === "foes") === spec.mirrored
        const carries = combatant.body.usables.length > 0 && combatant.strategy.usables
        const unit = battle.add({
            name: combatant.name,
            team: side === "allies" ? alliesTeam : foesTeam,
            controller: combatant.hostile || (combatant.strategy.deck && !carries) ? "bot" : "player",
            position: atBottom ? starts[index] : monsterStart(index),
            direction: atBottom ? Vector2.UP : Vector2.DOWN,
            hearts: combatant.body.hearts,
            decks: combatant.body.decks,
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
    for(const { center, radius } of pillarsFor(starts, rng)) battle.addPillar(center, radius)

    const strategyOf = (unit: Unit): Strategy => {
        return strategies.get(unit) ?? (unit.team === alliesTeam ? spec.defaults.allies : spec.defaults.foes)
    }
    // What a strategy could not do, told with the effects that failed.
    const notes: string[] = []
    const failures = (): string[] => [...battle.events.flatMap(event => event.type === "error" ? [messageOf(event.error)] : []), ...notes]

    const timedOut = (): FightResult => {
        const outcome = spec.softWin ? softOutcome(starters) : "timeout"
        return { outcome, rounds: battle.round, soft: outcome !== "timeout", errors: failures() }
    }

    let life = lifeOf(battle)
    let still = 0
    try {
        while(battle.phase !== "over"){
            const blocked = spec.stall > 0 && still >= spec.stall
            if(battle.round >= spec.maxRounds || blocked) return timedOut()
            battle.startRound()
            const planners = [...battle.initiative]
            for(const unit of planners){
                battle.commit(unit, unit.controller === "bot" ? planFor(unit) : strategyOf(unit).plan(unit, battle, strategyRng))
            }
            for(const unit of planners){
                if(unit.controller === "player" && strategyOf(unit).refine?.(unit, battle, strategyRng) === false) notes.push(REFINE_FAILED)
            }
            for(const unit of planners){
                if(!strategyOf(unit).usables) continue
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
        return {
            outcome: "timeout", rounds: battle.round, soft: false,
            errors: [...failures(), `combat interrompu : ${messageOf(error)}`],
        }
    }
    const outcome = battle.winner === alliesTeam ? "win" : battle.winner === foesTeam ? "loss" : "draw"
    return { outcome, rounds: battle.round, soft: false, errors: failures() }
}
