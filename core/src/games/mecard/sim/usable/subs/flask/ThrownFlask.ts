import type { Visual } from "../../../base/Visual"
import type { Text } from "../../../../../../semantic"
import type { UnitContext } from "../../../battle/Action"
import type { Preview } from "../../../battle/preview/Preview"
import type { PreviewContext } from "../../../battle/preview/PreviewContext"
import * as Previews from "../../../battle/preview/Previews"
import { NOTE_COLOR } from "../../../battle/previewColors"
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

        charges = 1,
    ){
        super(name, icon, description, { charges })
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

    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const target = battle.nearestEnemy(unit, this.range, pose.position)
        if(!target) return Previews.still(pose, Previews.label(pose.position, "personne à portée", NOTE_COLOR))
        return Previews.still(
            pose,
            ...Previews.strike([], [target]),
            Previews.label(target.position, this.status().type.name, NOTE_COLOR),
        )
    }
}
