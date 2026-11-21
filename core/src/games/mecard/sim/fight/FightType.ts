import type { Text } from "../../../../semantic"
import { colored, rgba } from "../base/Rgba"
import type { Vector2 } from "../base/Vector2"
import type { Visual } from "../base/Visual"
import type { HazardType } from "../hazard/HazardType"
import type { Spot } from "../run/Journey"
import type { Run } from "../run/Run"
import type { Hero } from "../run/Hero"

import type { Fight, FightStage } from "./Fight"
import type { FightCategory } from "./FightCategory"
import { StandardFight } from "./StandardFight"

/** A hazard a fight lays out, and where: the spot of its first body, and where it faces, its own by default. */
export interface Laying {
    readonly type: HazardType
    readonly at: Vector2
    readonly direction?: Vector2
}

/** A party of a game that ended before, as it stood when it fell. */
export interface Ghost {
    /** How many places the game went to. */
    readonly depth: number

    /** The party, made anew on each call: no one shares what they carry. */
    party(): Hero[]
}

/** What the drawing of a fight for a place knows of the run: how far it is, and the games it keeps from the past. */
export interface FightContext {
    /** How many places the party went to when it stands on the place, the first of the floor counted. */
    readonly depth: number

    /** The games that ended before, which a fight may bring back. */
    readonly ghosts: readonly Ghost[]
}

/** What the drawing of a fight knows when it knows nothing: no ghosts, the first place. */
export const NO_FIGHT_CONTEXT: FightContext = { depth: 1, ghosts: [] }

/**
 * A fight, one value for each: what is told of it, its category, and how a fight of it is made. Where it is
 * fought and who it is fought with is the {@link Fight}'s, made on each visit to the place that holds it.
 *
 * @remarks
 * Its name, description and icon are its own, apart from those of its category, which tells of every fight of
 * its sort. Its icon is a visual, a key that nothing here resolves: for the fights of the floors, the sprite of one of their monsters.
 */
export interface FightType {
    /** What names it in a save or a command, never shown. Two fights never share one. */
    readonly id: string

    readonly name: string
    readonly description: Text
    readonly icon: Visual

    /** Its name, for the console. */
    toString(): string

    /** Its name in its color. */
    toSemString(): Text

    /** The sort it is: what the map shows of its place. */
    readonly category: FightCategory

    /** The hazards laid out in the arena, once the monsters stand in it. None by default. */
    readonly hazards?: readonly Laying[]

    /** May a floor lay it, the run being as the context says? Always by default. */
    available?(context: FightContext): boolean

    /** Put the monsters in the arena, and decide of them: see {@link FightStage}. A fight made calls it. */
    populate(stage: FightStage): void

    /** Make a fight of this type for a run, on a place, the battle of its monsters ready to be fought. */
    create(run: Run, place: Spot): Fight
}

/** The color the name of a fight is written in. */
export const FIGHT_TEXT = rgba(0.95, 0.5, 0.4)

/** A fight type, made from all of it but how a fight of it is made. */
export function fightType(spec: Omit<FightType, "create"|"toString"|"toSemString">): FightType {    const made: FightType = {
        ...spec,
        toString: () => spec.name,
        toSemString: () => colored(FIGHT_TEXT, spec.name),
        create: (run, place) => new StandardFight(made, run, place),
    }
    return made
}
