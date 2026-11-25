import { BATTLE_ROUND, USABLE } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import { CONCENTRATED } from "../../../status/subs/Calm"

import { AbstractItem } from "../AbstractItem"

/** A bandolier: the first usable its unit uses each round keeps the charge it spent. */
export class Bandolier extends AbstractItem {


    constructor(){
        super("Bandoulière", visual("items/bandolier"), [
            "Le premier ", USABLE.as("utilisable"), " de chaque ", BATTLE_ROUND, " ne consomme pas de charge.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        let spared = false
        hold(battle.signals.usableUsed.add(({ unit: user, carried }) => {
            if(user !== unit || spared) return
            spared = true
            if(unit.usables.includes(carried)) carried.charges += 1
            else {
                carried.charges = 1
                unit.usables.push(carried)
            }
        }))
        hold(battle.roundEnded.add(() => {
            spared = false
        }))
    }
}

export const BANDOLIER = new Bandolier()

/** A label: each usable its unit uses gives it a round of concentration. */
export class Label extends AbstractItem {


    constructor(){
        super("Étiquette", visual("items/label"), [
            "Chaque ", USABLE.as("utilisable"), " utilisé te donne ", 1, " ", BATTLE_ROUND, " de ", CONCENTRATED, ".",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.signals.usableUsed.add(({ unit: user }) => {
            if(user === unit) battle.applyStatus(unit, CONCENTRATED, 1)
        }))
    }
}

export const LABEL = new Label()
