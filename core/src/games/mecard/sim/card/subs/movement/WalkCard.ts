import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import { AGILITE, DISTANCE } from "../../../base/keywords"
import type { Pose } from "../../../battle/Action"
import type { Card } from "../../Card"

import { WALK_SPEED } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { MoveCard } from "./MoveCard"

/** The distances a walk may be chosen to go, in meters before the move factor of the unit. */
const WALK_LENGTHS: readonly number[] = [1, 2, 3, 4, 5]

/** The distance a unit walks when it has not chosen: the one of a step. */
const DEFAULT_WALK_LENGTH = 2

/** Every walk, by the distance it goes, in order from the shortest: what a unit plays one of per round. */
const WALK_VARIANTS = new Map<Text, Card>()

/** A walk ahead, up to the first obstacle, of a distance chosen among {@link WALK_LENGTHS}. */
export class WalkCard extends MoveCard {


    constructor(length: number){
        super("Marche", ["Avance de ", length, "×", AGILITE, " ", DISTANCE, ", jusqu'au premier obstacle."], Rarity.COMMON, length, WALK_SPEED)
    }


    public readonly group = WALK_VARIANTS

    public way(pose: Pose): Vector2 {
        return pose.direction
    }

    public override variants(): ReadonlyMap<Text, Card> {
        return WALK_VARIANTS
    }

    public override variantFor(): Card {
        return WALKS[WALK_LENGTHS.indexOf(DEFAULT_WALK_LENGTH)]
    }
}

/** Every walk, by distance: the only instances, so a walk is told from another by its place here. */
export const WALKS: readonly WalkCard[] = WALK_LENGTHS.map(length => new WalkCard(length))

for(const walk of WALKS) WALK_VARIANTS.set(walk.length, walk)
