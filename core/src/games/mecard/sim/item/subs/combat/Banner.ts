import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"

import { AbstractItem } from "../AbstractItem"

/** How many of his allies and summons must fall before the banner of the catalog is raised. */
const BANNER_DEATHS = 2

/** A banner: once enough allies or summons fell, the whole chain of its unit is copied at the end of it. */
export class Banner extends AbstractItem {


    constructor(
        /** How many allies and summons must die. */
        public readonly deaths: number,
    ){
        super("Fanion", visual("items/banner"), [
            "Après la mort de ", deaths, " alliés ou invocations, ajoute une copie de toute ta chaîne à la fin de ta chaîne. Une fois par combat.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        let fallen = 0
        let raised = false
        hold(battle.unitDied.add(({ unit: dead }) => {
            if(raised || dead === unit || dead.team !== unit.team || !unit.alive) return
            fallen++
            if(fallen < this.deaths) return
            raised = true
            battle.appendToChain(unit, [...unit.chain.cards])
        }))
    }
}

export const BANNER = new Banner(BANNER_DEATHS)
