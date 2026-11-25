import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import type { StatusType } from "../../../status/Status"
import { BLEEDING, FRAGILE, MARKED } from "../../../status/subs/Wounds"
import { BURN } from "../../../status/subs/Burn"
import { CONCENTRATED, FURIOUS } from "../../../status/subs/Calm"
import { CONFUSED } from "../../../status/subs/Confusion"
import { DEMONIC } from "../../../status/subs/DemonEnergy"
import { DODGE } from "../../../status/subs/Dodge"
import { HEALING } from "../../../status/subs/Healing"
import { LUCIDITY } from "../../../status/subs/Lucidity"
import { MOMENTUM } from "../../../status/subs/Momentum"
import { POISONED } from "../../../status/subs/Poison"
import { ROOTED } from "../../../status/subs/Rooted"
import { SLOWED } from "../../../status/subs/Slowness"
import { STINKING } from "../../../status/subs/Stench"
import { SWIFT } from "../../../status/subs/Swiftness"
import { VIGOROUS } from "../../../status/subs/Vigor"
import { VULNERABLE } from "../../../status/subs/Vulnerability"
import { WEAKENED } from "../../../status/subs/Weakness"

import { AbstractItem } from "../AbstractItem"

/** The levels each pillbox gives. */
const PILLBOX_LEVEL = 2
const EXPIRED_LEVEL = 4

/** The positive statuses a pill may give. */
export const GOOD_PILLS: readonly StatusType[] = [
    CONCENTRATED, DODGE, FURIOUS, SWIFT, VIGOROUS, LUCIDITY, MOMENTUM, HEALING, DEMONIC,
]

/** The negative statuses an expired pill may give. */
export const BAD_PILLS: readonly StatusType[] = [
    BLEEDING, BURN, CONFUSED, FRAGILE, MARKED, POISONED, ROOTED, SLOWED, STINKING, VULNERABLE, WEAKENED,
]

/** A pillbox: its unit starts the battle with levels of a status drawn at random from a list. */
export class Pillbox extends AbstractItem {


    constructor(
        name: string,
        icon: string,
        private readonly pills: readonly StatusType[],
        private readonly level: number,
        polarity: string,
    ){
        super(name, visual(icon), ["Début du combat : gagne ", level, ` niveaux d'un status ${polarity} au hasard.`])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundStarted.add(round => {
            if(round !== 1) return
            const type = battle.rng.pick(this.pills)
            if(type) battle.applyStatus(unit, type, this.level)
        }))
    }
}

export const PILLBOX = new Pillbox("Pilulier", "items/pillbox", GOOD_PILLS, PILLBOX_LEVEL, "positif")
export const EXPIRED_PILLBOX = new Pillbox(
    "Pilulier périmé", "items/expired_pillbox", BAD_PILLS, EXPIRED_LEVEL, "négatif",
)
