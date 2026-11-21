import { Add, Clamp, ModifierKey } from "../../../base/Attribute"
import type { Attribute } from "../../../base/Attribute"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import type { UnitStats } from "../../../battle/Unit"

import { AbstractItem } from "../AbstractItem"

/** How many cards more the debt of the catalog gives at the start of a battle. */
const DEBT_START = 3

/** The least a stat keeps when the debt turns against it: a chain plays at least a card, a hand holds two. */
const CHAIN_FLOOR = 1
const HAND_FLOOR = 2
const DRAW_FLOOR = 0

/** A stat the debt pays out, and the least it can fall to. */
interface Owed {
    readonly stat: (stats: UnitStats) => Attribute<number>
    readonly floor: number
}

const OWED: readonly Owed[] = [
    { stat: stats => stats.handSize, floor: HAND_FLOOR },
    { stat: stats => stats.draw, floor: DRAW_FLOOR },
    { stat: stats => stats.firstDraw, floor: DRAW_FLOOR },
    { stat: stats => stats.chainSize, floor: CHAIN_FLOOR },
]

/**
 * A debt: the battle starts with more cards in the hand, the draw and the chain, and each round takes one
 * card away from each, past none, until it is a burden.
 */
export class Debt extends AbstractItem {


    constructor(
        /** How many cards more it gives at the start of the battle. */
        public readonly start: number,
    ){
        super("Reconnaissance de dette", visual("items/debt"), [
            `Tu commences à ${start} : +X cartes dans la main, piochées et dans la chaîne. X baisse de 1 à chaque round, jusque dans les négatifs.`,
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        const key = new ModifierKey(this.name)
        const floors = new ModifierKey(`${this.name} (plancher)`)
        let owed = this.start
        const apply = (): void => {
            for(const { stat } of OWED) stat(unit.stats).add(key, new Add(owed))
        }
        for(const { stat, floor } of OWED) stat(unit.stats).add(floors, new Clamp(floor, Infinity))
        apply()
        // At the end of a round, so the draw of the next one is made with what is owed then.
        hold(battle.roundEnded.add(() => {
            owed--
            apply()
        }))
        hold(() => {
            for(const { stat } of OWED){
                stat(unit.stats).remove(key)
                stat(unit.stats).remove(floors)
            }
        })
    }
}

export const DEBT = new Debt(DEBT_START)
