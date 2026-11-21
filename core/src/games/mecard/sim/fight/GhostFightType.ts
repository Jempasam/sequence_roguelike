import type { Text } from "../../../../semantic"
import { colored } from "../base/Rgba"
import { visual } from "../base/Visual"
import { BEST_AI } from "../ai/catalog"
import type { Spot } from "../run/Journey"
import type { Run } from "../run/Run"

import type { Fight, FightStage } from "./Fight"
import { AGGRESSION, EMPTY_FIGHT } from "./fights"
import { FIGHT_TEXT, fightType } from "./FightType"
import type { FightContext, FightType, Ghost } from "./FightType"

/**
 * How many places further than the party a ghost may have gone: a party that went deeper is too strong
 * for it, and meeting it is death.
 */
export const GHOST_REACH = 3

/** The games of the past a party standing on a place may meet: those that went at most {@link GHOST_REACH} places further. */
export function ghostsFor(ghosts: readonly Ghost[], depth: number): Ghost[] {
    return ghosts.filter(each => each.depth <= depth + GHOST_REACH)
}

/**
 * The fight against a party of a game of the past, as it stood when it fell. There is one value of it, laid
 * by the floors where a ghost may be met: which party is met is drawn when the fight is made.
 */
class GhostFightType implements FightType {

    public readonly id = "ghost"
    public readonly name = "Fantômes"
    public readonly description: Text = "L'équipe d'une partie précédente, telle qu'elle est tombée, rôde ici."
    public readonly icon = visual("units/ghost")
    public readonly category = AGGRESSION

    public toString(): string { return this.name }

    public toSemString(): Text { return colored(FIGHT_TEXT, this.name) }

    /** Only where a game of the past went no further than {@link GHOST_REACH} places past the place. */
    public available({ ghosts, depth }: FightContext): boolean {
        return ghostsFor(ghosts, depth).length > 0
    }

    /** Never used on its own: a fight is made of the ghost drawn, see {@link GhostFightType.create}. */
    public populate(): void {}

    public create(run: Run, place: Spot): Fight {
        const met = run.rng.pick(ghostsFor(run.ghosts, run.travel.depth))
        // A map laid from a save may hold a ghost no game of the history answers to any more.
        if(!met) return EMPTY_FIGHT.create(run, place)
        const against = fightType({
            id: this.id, name: this.name, description: this.description, icon: this.icon, category: this.category,
            populate: (stage: FightStage) => {
                for(const hero of met.party()) stage.addHero(hero, { controller: BEST_AI(stage.rng) })
            },
        })
        return against.create(run, place)
    }
}

/** The fight against the party of a game of the past. */
export const GHOST_FIGHT: FightType = new GhostFightType()
