import type { Visual } from "../../../base/Visual"
import type { Text } from "../../../../../../semantic"
import type { UnitContext } from "../../../battle/Action"
import type { Status } from "../../../status/Status"

import { AbstractUsable } from "../AbstractUsable"

/** How far the thrown flasks of the catalog reach, in meters. */
export const THROW_RANGE = 5

/** A flask thrown at the nearest enemy in reach, putting a status on it. Each flask says which. */
export abstract class ThrownFlask extends AbstractUsable {


    constructor(
        name: string, icon: Visual, description: Text,

        /** How far it reaches, in meters: the nearest enemy within it is hit. */
        public readonly range: number,
    ){
        super(name, icon, description)
    }


    /** The status it puts on the enemy it hits: its kind and its level are what is put on, as a text it tells itself. */
    public abstract status(): Status

    protected act({ battle, unit }: UnitContext): void {
        const target = battle.nearestEnemy(unit, this.range)
        if(target){
            const given = this.status()
            battle.applyStatus(target, given.type, given.level)
        }
        else battle.events.push({ type: "skipped", unit, reason: "personne à portée" })
    }
}
