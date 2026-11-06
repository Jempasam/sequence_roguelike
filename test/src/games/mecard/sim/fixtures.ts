import { expect } from "vitest"
import { Arena, Battle, CardChain, Heart, RED_HEART, Team, Vector2 } from "@game/core/mecard"
import type { Card, Pillar, Rgba, Run, Unit } from "@game/core/mecard"

// The fixture builders shared by the tests of the simulation of Dungeon of the Mecard.

/** The color of a unit or a heart kind as a text names it. */
export function rgbaOf({ color }: { color: Rgba }): readonly number[] {
    return [color.r, color.g, color.b, color.a]
}

export const HEROES = new Team("Héros")
export const MONSTERS = new Team("Monstres")

/** A battle on an empty arena of 7 by 7, its units not started. */
export function battle(): Battle {
    return new Battle(new Arena(7, 7), 1)
}

/** A battle with pillars standing in it. */
export function withPillars(on: Battle, ...pillars: readonly Pillar[]): Battle {
    for(const { center, radius } of pillars) on.addPillar(center, radius)
    return on
}

/** The battle of the current place of a run, its first round started, as the screen starts it. */
export function started(run: Run): Battle {
    const fight = run.newBattle()
    fight.startRound()
    return fight
}

/** A unit of a team at a cell, facing up, with red hearts and the given cards in hand. */
export function unit(
    on: Battle, x: number, y: number,
    options: { team?: Team, hearts?: Heart[], hand?: Card[], direction?: Vector2 } = {},
): Unit {
    const added = on.add({
        name: `u${on.units.length}`, team: options.team ?? HEROES, controller: "player",
        position: new Vector2(x, y), direction: options.direction ?? Vector2.UP,
        hearts: options.hearts ?? Heart.many(RED_HEART, 4),
        decks: [[]],
    })
    added.hand.push(...options.hand ?? [])
    return added
}

/** A chain of cards in a row, each taking the card on its right: `chain(SPELL, FIRE)` reads `Sort(Feu)`. */
export function chain(...cards: Card[]): CardChain {
    return new CardChain(cards)
}

/**
 * Expect a unit to stand at a point. A move goes a little at each tick, so it lands there within a rounding,
 * not exactly.
 */
export function expectAt(unit: Unit, x: number, y: number): void {
    expect(unit.position.x).toBeCloseTo(x)
    expect(unit.position.y).toBeCloseTo(y)
}

/** Commit chains to units holding their cards, then play the round out, and start the next one. */
export function play(on: Battle, plans: [Unit, CardChain][]): void {
    if(on.waiting) on.startRound()
    for(const [planner, planned] of plans){
        planner.hand.push(...planned.cards)
        on.commit(planner, planned)
    }
    on.endPreparation()
    on.playRound()
    if(on.waiting) on.startRound()
}
