import type { Text } from "../../../../semantic"
import type { Vector2 } from "../base/Vector2"
import type { Visual } from "../base/Visual"
import type { HazardType } from "../hazard/HazardType"
import type { Spot } from "../run/Journey"
import type { Run } from "../run/Run"

import type { Fight, FightStage } from "./Fight"
import type { FightCategory } from "./FightCategory"
import { StandardFight } from "./StandardFight"

/** A hazard a fight lays out, and where: the spot of its first body, and where it faces, its own by default. */
export interface Laying {
    readonly type: HazardType
    readonly at: Vector2
    readonly direction?: Vector2
}

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

    /** The sort it is: what the map shows of its place. */
    readonly category: FightCategory

    /** The hazards laid out in the arena, once the monsters stand in it. None by default. */
    readonly hazards?: readonly Laying[]

    /** Put the monsters in the arena, and decide of them: see {@link FightStage}. A fight made calls it. */
    populate(stage: FightStage): void

    /** Make a fight of this type for a run, on a place, the battle of its monsters ready to be fought. */
    create(run: Run, place: Spot): Fight
}

/** A fight type, made from all of it but how a fight of it is made. */
export function fightType(spec: Omit<FightType, "create">): FightType {
    const made: FightType = {
        ...spec,
        create: (run, place) => new StandardFight(made, run, place),
    }
    return made
}
