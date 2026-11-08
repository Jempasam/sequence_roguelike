import type { Visual } from "../../../base/Visual"
import { HeartCount } from "../../../battle/words"
import type { PlugContext } from "../../../battle/Action"
import { Heart } from "../../../heart/Heart"
import type { HeartKind } from "../../../heart/HeartKind"
import { BLUE_HEART } from "../../../heart/subs/BlueHeartKind"
import { SHIELD_HEART } from "../../../heart/subs/ShieldHeartKind"

import { AbstractItem } from "../AbstractItem"
import { visual } from "../../../base/Visual"

/** How many hearts the belt of the death of the catalog gives. */
const DEATH_BELT_HEARTS = 3

/**
 * A belt giving hearts when its unit loses its last ones: one of them was not of a kind the belt gives, so the
 * hearts the belt gives never keep it alive in a loop.
 */
export class Belt extends AbstractItem {


    constructor(
        name: string, icon: Visual,

        /** The kind of heart it gives, and the one that does not make it give. */
        public readonly kind: HeartKind,

        /** How many hearts it gives. */
        public readonly count: number,
    ){
        super(name, icon, [
            "Quand ses derniers cœurs sont perdus et que l'un n'était pas ", kind, " : gagne ", new HeartCount(count),
            " ", kind, ".",
        ])
    }


    public init({ unit, hold }: PlugContext): void {
        hold(unit.hearts.onEmptied.add(lost => {
            if(!lost.some(({ kind }) => kind !== this.kind)) return
            for(const heart of Heart.many(this.kind, this.count)) unit.hearts.give(heart)
        }))
    }
}

export const STRENGTH_BELT = new Belt("Ceinture de force", visual("items/amulet"), SHIELD_HEART, 1)

export const DEATH_BELT = new Belt("Ceinture de la mort", visual("items/amulet"), BLUE_HEART, DEATH_BELT_HEARTS)
