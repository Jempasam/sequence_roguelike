import { Vector2 } from "../base/Vector2"
import { Arena } from "../battle/Arena"
import { Battle } from "../battle/Battle"
import type { Team } from "../battle/Team"
import type { Controller, Unit } from "../battle/Unit"
import { LANCER_KIT } from "../catalog/kits"
import { MANNEQUIN } from "../catalog/monsters"

import { ARENA_SIZE, partyStarts } from "./formation"
import { allyOf, heroOf } from "./Hero"
import type { Hero } from "./Hero"
import type { Run } from "./Run"

// The arena: a training ground, an empty battle with a dummy to hit, which comes back when it falls.

/** The side of a unit created in a battle: with the heroes, or against them. */
export type Side = "ally"|"enemy"

/** The size of the scale a unit is placed on, from one wall to the other. */
export const ARENA_SCALE = 100

/** The middle of the arena. */
const CENTER = new Vector2(ARENA_SIZE / 2, ARENA_SIZE / 2)

/** Where a point of the scale of the arena, from 0 to {@link ARENA_SCALE} along each wall, lies in it. */
export function arenaPoint(x: number, y: number): Vector2 {
    return new Vector2(x * ARENA_SIZE / ARENA_SCALE, y * ARENA_SIZE / ARENA_SCALE)
}

/** The team a side of a battle of the run is. */
export function teamOf(run: Run, side: Side): Team {
    return side === "ally" ? run.heroesTeam : run.monstersTeam
}

/**
 * Bring a character into a battle, in a team, ready to fight. A unit of the foes keeps its deck in order, as
 * the monsters of the floors do.
 *
 * @param controller - Who plans its chains, as the character is by default.
 */
export function enterBattle(
    battle: Battle, character: Hero, team: Team, position: Vector2, side: Side, controller: Controller,
): Unit {
    const unit = battle.add({
        name: uniqueName(battle, character.name), sprite: character.sprite, team, controller,
        position, direction: side === "ally" ? Vector2.UP : Vector2.DOWN,
        hearts: character.hearts, decks: character.decks, unlimited: character.unlimited,
        items: character.items, usables: character.usables,
        bases: side === "enemy" ? { ...character.bases, ordered: true } : character.bases,
    })
    battle.refill(unit)
    return unit
}

/** A name no unit of the battle holds: the name itself, else the name followed by a number. */
function uniqueName(battle: Battle, name: string): string {
    const taken = new Set(battle.units.map(unit => unit.name))
    if(!taken.has(name)) return name
    let rank = 2
    while(taken.has(`${name} ${rank}`)) rank++
    return `${name} ${rank}`
}

/** A training dummy, its ten hearts full. */
export function dummy(): Hero {
    return allyOf(MANNEQUIN, MANNEQUIN.name)
}

/**
 * Bring a dummy into a battle, on the team of the monsters.
 *
 * @param position - Where it stands, in the middle by default.
 */
export function enterDummy(battle: Battle, run: Run, position: Vector2 = CENTER): Unit {
    return enterBattle(battle, dummy(), run.monstersTeam, position, "enemy", "bot")
}

/**
 * Have a dummy come back at the end of each round when none stands: the one put in the middle, and the ones
 * that fell. The battle never ends of the fall of the last dummy: see {@link Battle.endless}.
 */
export function trainOn(battle: Battle, run: Run): void {
    battle.endless = true
    let standing = enterDummy(battle, run)
    battle.roundEnded.add(() => {
        if(standing.alive) return
        battle.vanish(standing)
        standing = enterDummy(battle, run)
    })
}

/**
 * An arena with nothing in it but the party of the run, and a dummy in the middle that comes back each time
 * it falls. A run with no one in its party gets a lancer.
 */
export function arenaBattle(run: Run): Battle {
    const battle = new Battle(new Arena(ARENA_SIZE, ARENA_SIZE), run.rng.int(2 ** 31))
    const party = run.heroes.length > 0 ? run.heroes : [heroOf(LANCER_KIT)]
    const starts = partyStarts(party.length)
    party.forEach((hero, index) => {
        enterBattle(battle, hero, run.heroesTeam, starts[index], "ally", hero.controller)
    })
    trainOn(battle, run)
    return battle
}
