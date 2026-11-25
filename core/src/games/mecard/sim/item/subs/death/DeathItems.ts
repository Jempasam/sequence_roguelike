import { UNIT } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import { BAD_PILLS } from "../status/Pillbox"

import { AbstractItem } from "../AbstractItem"

/** The levels a funeral notice gives. */
const NOTICE_LEVEL = 2

/** An urn: when its unit dies, its positive statuses go to its allies. */
export class Urn extends AbstractItem {


    constructor(){
        super("Urne", visual("items/urn"), ["À ta mort, tes status positifs sont donnés à chacun de tes alliés."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.unitDied.add(({ unit: dead }) => {
            if(dead !== unit) return
            const gifts = [...unit.statuses.values()].filter(status => status.type.polarity === "positive" && status.level > 0)
            for(const ally of battle.living){
                if(ally === unit || ally.team !== unit.team) continue
                for(const status of gifts) battle.applyStatus(ally, status.type, status.level)
            }
        }))
    }
}

export const URN = new Urn()

/** A funeral notice: when its unit dies, each enemy gains levels of a negative status, drawn for each. */
export class FuneralNotice extends AbstractItem {


    constructor(){
        super("Faire-part", visual("items/funeral_notice"), [
            "À ta mort, chaque ", UNIT, " ennemie gagne ", NOTICE_LEVEL, " niveaux d'un status négatif au hasard.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.unitDied.add(({ unit: dead }) => {
            if(dead !== unit) return
            for(const enemy of battle.enemiesOf(unit)){
                const type = battle.rng.pick(BAD_PILLS)
                if(type) battle.applyStatus(enemy, type, NOTICE_LEVEL)
            }
        }))
    }
}

export const FUNERAL_NOTICE = new FuneralNotice()
