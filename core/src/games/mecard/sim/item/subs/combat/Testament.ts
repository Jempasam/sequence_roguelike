import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import type { Preview } from "../../../battle/preview/Preview"
import type { PreviewContext } from "../../../battle/preview/PreviewContext"
import * as Previews from "../../../battle/preview/Previews"
import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"

import { AbstractItem } from "../AbstractItem"

/** A testament: when its unit dies, its chain is added to the end of the chain of the ally nearest to it. */
export class Testament extends AbstractItem {


    constructor(){
        super("Testament", visual("items/testament"), [
            "À ta mort, ta chaîne est ajoutée à la fin de la chaîne de l'allié le plus proche.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.unitDied.add(({ unit: dead }) => {
            if(dead !== unit) return
            const heir = battle.nearestAlly(unit)
            if(heir) battle.appendToChain(heir, [...unit.chain.cards])
        }))
    }

    /** The ally that would inherit the chain, the nearest to the unit. */
    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const heir = battle.nearestAlly(unit)
        if(!heir) return Previews.still(pose)
        return Previews.still(
            pose,
            Previews.arrow([pose.position, heir.position], MOVE_WIDTH / 2, CONTROL_COLOR),
            ...Previews.strike([], [heir]),
            Previews.label(heir.position, "héritier", NOTE_COLOR),
        )
    }
}

export const TESTAMENT = new Testament()
