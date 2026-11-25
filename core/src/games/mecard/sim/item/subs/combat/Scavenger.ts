import { visual } from "../../../base/Visual"
import * as Areas from "../../../battle/area/Areas"
import type { Preview } from "../../../battle/preview/Preview"
import type { PreviewContext } from "../../../battle/preview/PreviewContext"
import * as Previews from "../../../battle/preview/Previews"
import { RANGE_COLOR } from "../../../battle/previewColors"
import type { PlugContext } from "../../../battle/Action"
import { LUCIDITY } from "../../../status/subs/Lucidity"

import { AbstractItem } from "../AbstractItem"
import { BATTLE_ROUND } from "../../../base/keywords"

/** How far a feverish enemy is smelled, in meters. */
const SCENT_RANGE = 3

/** How many levels of lucidity a scent gives. */
const SCENT_LEVELS = 1

/** A scavenger's nose: at the end of a round, a feverish enemy close by gives a level of lucidity. */
export class ScavengerNose extends AbstractItem {


    constructor(){
        super("Flair de charognard", visual("items/scavenger_nose"), [
            "Fin de ", BATTLE_ROUND, " : si une unité ennemie fébrile est à moins de ", SCENT_RANGE, " m, gagne ", SCENT_LEVELS, " niveau de lucidité.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundEnded.add(() => {
            if(!unit.alive) return
            const smelled = battle.enemiesOf(unit).some(enemy => {
                return enemy.feverish && enemy.position.distance(unit.position) <= SCENT_RANGE
            })
            if(smelled) battle.applyStatus(unit, LUCIDITY, SCENT_LEVELS)
        }))
    }

    public preview({ pose }: PreviewContext): Preview {
        return Previews.still(pose, Previews.polygon(Areas.circle(pose.position, SCENT_RANGE), RANGE_COLOR))
    }
}

export const SCAVENGER_NOSE = new ScavengerNose()
