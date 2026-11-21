import type { SavedUnit } from "../save/battleSave"

/**
 * Something a saboteur does to the team of a fighter before its game: it gives back the units the fighter
 * fights with. It reads nothing but the units it is given, and never leaves a team without a heart standing.
 */
export interface Sabotage {
    /** What tells it from the others, and what a saboteur is shown. */
    readonly name: string

    apply(units: readonly SavedUnit[]): readonly SavedUnit[]
}

/** How many hearts stand in a unit: those that are not empty. */
function standing(unit: SavedUnit): number {
    return unit.hearts.filter(([, empty]) => !empty).length
}

/** The unit with this many of its hearts emptied, the last ones first, always keeping one standing. */
function wounded(unit: SavedUnit, count: number): SavedUnit {
    let left = Math.min(count, standing(unit) - 1)
    if(left <= 0) return unit
    const hearts = [...unit.hearts].reverse().map(([kind, empty]): readonly [string, boolean] => {
        if(empty || left === 0) return [kind, empty]
        left--
        return [kind, true]
    }).reverse()
    return { ...unit, hearts }
}

/** Empty some hearts of every unit of the team. */
function wound(name: string, count: number): Sabotage {
    return { name, apply: units => units.map(unit => wounded(unit, count)) }
}

/** The sabotages a saboteur may choose among. */
export const SABOTAGES: readonly Sabotage[] = [
    wound("Blessure", 1),
    wound("Grande blessure", 2),
    {
        name: "Désarmement",
        apply: units => units.map(unit => ({ ...unit, items: unit.items.slice(1) })),
    },
]
