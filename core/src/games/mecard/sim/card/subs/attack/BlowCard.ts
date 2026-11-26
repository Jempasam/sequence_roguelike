import type { Text } from "../../../../../../semantic"
import { PHYSICAL_COLOR } from "../../../battle/previewColors"
import type { Action, Pose } from "../../../battle/Action"
import type { Visual } from "../../../base/Visual"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit, UnitStats } from "../../../battle/Unit"
import { ACTION } from "../../CardType"

import { AbstractCard } from "../AbstractCard"
import { hold, sweep } from "../tools/playing"
import type { Rarity } from "../../Rarity"
import { DamageType } from "../../../battle/DamageType"
import * as Previews from "../../../battle/preview/Previews"

/** How many hearts a blow at hand takes, before the bonus of the unit. */
export const BLOW_DAMAGE = 2

/** How long a blow takes to land, in seconds: the swing, the thrust, the flight. */
const SWING_TIME = 0.18

/** How long the blow stays shown once landed, in seconds. */
const RECOVERY_TIME = 0.15

/**
 * A physical blow, the bonus of the unit added: its area grows while it goes, then it lands on the whole
 * area. Shown whole in the preview. Each blow says where it reaches.
 */
export abstract class BlowCard extends AbstractCard<Action> {


    public readonly output = ACTION
    public readonly input = null

    /** What it plays. */
    public readonly action: Action

    /** How its blow looks, none for the area to be shown as it is. */
    public readonly look: Visual|null = null

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How many hearts it takes, before the bonus of the unit. */
        public readonly damage: number,
    ){
        super(name, description, rarity)
        this.action = BlowCard.#blow(this)
    }


    /**
     * Where it reaches from where its unit would stand and face, as it goes: from 0 when it starts to 1 when
     * it lands, the whole area then.
     */
    public abstract reach(battle: Battle, unit: Unit, pose: Pose, progress: number): Area

    public get(): Action {
        return this.action
    }

    /** The units it marks in its preview as the ones it would reach: every one in its area but its own. */
    protected marked(battle: Battle, unit: Unit, area: Area): Unit[] {
        return battle.fetch(area, unit)
    }

    /** The hearts its unit adds to it: its strength, for a blow at hand. */
    public bonus(stats: UnitStats): number {
        return stats.strength.value
    }

    /**
     * Land it on its area: every unit there but its own takes the damage.
     *
     * @returns The units it landed on.
     */
    protected land(battle: Battle, unit: Unit, area: Area): Unit[] {
        const amount = this.damage + this.bonus(unit.stats)
        return battle.strike(unit, area, amount, DamageType.PHYSICAL, () => 1, this.look)
    }


    static #blow(card: BlowCard): Action {
        return {
            use: function ({ battle, unit }){
                sweep(battle, SWING_TIME, share => {
                    return [Previews.polygon(card.reach(battle, unit, unit, share), PHYSICAL_COLOR)]
                })
                const area = card.reach(battle, unit, unit, 1)
                card.land(battle, unit, area)
                hold(battle, RECOVERY_TIME, [Previews.polygon(area, PHYSICAL_COLOR)])
            },
            preview: ({ battle, unit, pose }) => {
                const area = card.reach(battle, unit, pose, 1)
                return Previews.still(pose, ...Previews.strike([area], card.marked(battle, unit, area)))
            },
        }
    }
}
