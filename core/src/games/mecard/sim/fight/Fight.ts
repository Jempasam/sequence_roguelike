import type { Rng } from "../base/Rng"
import type { Vector2 } from "../base/Vector2"
import type { Battle } from "../battle/Battle"
import type { Controller } from "../battle/Unit"
import type { Kit } from "../catalog/kits"
import type { Monster } from "../catalog/monsters"
import type { Hero } from "../run/Hero"

import type { FightType } from "./FightType"

/** How a fight ended for the party. */
export type FightResult = "won"|"lost"

/** How a monster stands in the arena, where it does not stand as the others do. */
export interface MonsterPose {
    /** Where it stands: the next place of the top rows by default. */
    readonly position?: Vector2

    /** Where it looks: down, toward the party, by default. */
    readonly direction?: Vector2

    /** What plays it: the bot of the run by default. */
    readonly controller?: Controller
}

/**
 * All a fight may do to set its monsters: say how hard the floor is and where the place lies, draw from the
 * random numbers of the run, and put monsters in the arena.
 */
export interface FightStage {
    /** The random numbers of the run. */
    readonly rng: Rng

    /** How hard the floor is, from 1: a monster has one more heart for each level past the first. */
    readonly level: number

    /** The row of the map the place lies in, from 0. */
    readonly layer: number

    /** Put a monster in the arena, on the side of the monsters. */
    add(monster: Monster, pose?: MonsterPose): void

    /** Put a kit in the arena, on the side of the monsters: a character as the party's are, with its own cards, items and usables. */
    addKit(kit: Kit, pose?: MonsterPose): void

    /** Put a character already made in the arena, on the side of the monsters: one of a game of the past, as it stood. */
    addHero(hero: Hero, pose?: MonsterPose): void
}

/**
 * A fight of the journey, as a place holds it: the battle of the party against some monsters. A halt that
 * follows a won fight is told of it, to give what the fight gave.
 */
export interface Fight {
    /** The fight it is. */
    readonly type: FightType

    /** The monsters it holds, whoever asks: a halt that follows it, a screen. */
    readonly monsters: readonly Monster[]

    /** The battle of the party against the monsters, its first round left for whoever shows it to start. */
    readonly battle: Battle

    /**
     * Take the party back from the battle, once over: their hearts and what they carry, as the battle left
     * them. A character who fell in a won battle stands up again with one heart.
     *
     * @throws {@link Error} When the battle is not over.
     */
    finish(): FightResult
}
