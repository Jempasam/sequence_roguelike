import { Vector2 } from "../base/Vector2"
import { Arena } from "../battle/Arena"
import { Battle } from "../battle/Battle"
import { ARENA_SIZE, partyStarts } from "../run/formation"
import { heroSpec } from "../run/Hero"
import type { Run } from "../run/Run"
import { BATTLE_SAVE_VERSION } from "../save/battleSave"
import type { BattleSave, SavedUnit } from "../save/battleSave"

/** The units a player brings to a duel, and the name its units are told apart by when two share one. */
export interface DuelParty {
    /** The name of the player, which tells its units apart from those of the same name. */
    readonly name: string

    readonly units: readonly SavedUnit[]
}

/** The players of one camp of a duel. */
export type DuelSide = readonly DuelParty[]

/**
 * The characters of the party of a run as units a battle can be saved from: the units of its next fight,
 * as the fight makes them, standing where its party starts. The party and the run are left as they are.
 */
export function partyUnits(run: Run): readonly SavedUnit[] {
    const battle = new Battle(new Arena(ARENA_SIZE, ARENA_SIZE), 0)
    const starts = partyStarts(run.heroes.length)
    run.heroes.forEach((hero, index) => {
        battle.refill(battle.add(heroSpec(hero, run.heroesTeam, starts[index], Vector2.UP)))
    })
    return battle.save().units
}

/**
 * The names the units of a duel go by, each told apart from the others: a name more than one unit bears is
 * followed by the name of the player it belongs to, and by a number when that is not enough.
 */
function uniqueNames(parties: readonly DuelParty[]): string[][] {
    const counts = new Map<string, number>()
    for(const { units } of parties) for(const { name } of units) counts.set(name, (counts.get(name) ?? 0) + 1)
    const taken = new Set<string>()
    return parties.map(({ name: player, units }) => units.map(({ name }) => {
        const base = (counts.get(name) ?? 0) > 1 ? `${name} (${player})` : name
        let free = base
        for(let count = 2; taken.has(free); count++) free = `${base} ${count}`
        taken.add(free)
        return free
    }))
}

/**
 * The save of a battle between camps of players, each with the units they brought: one team a camp, the units
 * of its players on its half of the arena, the first camp at the bottom looking up, the others mirrored.
 * Load it with {@link loadBattle}.
 *
 * @remarks
 * The units come in the order of the parties, the camps first: the nth unit of the save is the nth given.
 * A unit keeps who plans it, as it was saved.
 *
 * @param sides - The camps, each with its players. With more than two, the camps beyond the second stand on
 *   the half of the first.
 * @param rng - The seed of the random numbers of the battle.
 */
export function duelSave(sides: readonly DuelSide[], rng: number): BattleSave {
    const parties = sides.flat()
    const names = uniqueNames(parties)
    let party = 0
    const units = sides.flatMap((side, team) => {
        const placed = side.flatMap(({ units: each }) => each)
        const starts = partyStarts(placed.length)
        const mirrored = team % 2 === 1
        let placing = 0
        return side.flatMap(({ units: each }) => {
            const named = names[party++]
            return each.map((unit, index): SavedUnit => {
                const start = starts[placing++]
                return {
                    ...unit, name: named[index], team,
                    position: [start.x, mirrored ? ARENA_SIZE - start.y : start.y],
                    direction: mirrored ? [0, 1] : [0, -1],
                }
            })
        })
    })
    return {
        version: BATTLE_SAVE_VERSION,
        arena: { width: ARENA_SIZE, height: ARENA_SIZE },
        rng, round: 0, phase: "draw", winner: null,
        teams: sides.map((_, team) => ({ name: `Camp ${team + 1}`, color: null })),
        units, initiative: [], plans: [], played: [], activated: [], owners: [],
    }
}
