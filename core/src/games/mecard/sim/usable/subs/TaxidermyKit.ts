import { HEART, UNIT } from "../../base/keywords"
import { visual } from "../../base/Visual"
import type { UnitContext } from "../../battle/Action"
import { stuffed } from "../../process/subs/Taxidermy"

import { AbstractUsable } from "./AbstractUsable"

/** A taxidermy kit: the next enemy its unit kills in the battle is stuffed, and fights for it. */
export class TaxidermyKit extends AbstractUsable {


    constructor(){
        super(
            "Kit de taxidermie", visual("usables/taxidermy_kit"),
            [
                "La prochaine ", UNIT, " ennemie que tu tues dans ce combat est empaillée : elle combat pour toi avec la moitié de ses ",
                HEART.as("cœurs"), ". Une fois par combat.",
            ],
            { charges: 1, refill: "battle" },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        const watch = unit.killed.add(({ unit: dead }) => {
            if(dead.team === unit.team) return
            watch.remove()
            stuffed(battle, unit, dead)
        })
    }
}

export const TAXIDERMY_KIT = new TaxidermyKit()
