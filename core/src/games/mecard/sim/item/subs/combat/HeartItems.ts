import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import { HeartCount } from "../../../battle/words"
import { EXPLOSIVE } from "../../../status/subs/Explosive"
import { RESURRECTED, revive } from "../../../status/subs/Resurrection"

import { AbstractItem } from "../AbstractItem"
import { BATTLE_ROUND } from "../../../base/keywords"

/** The level of the explosive status the heart bomb gives. */
const HEART_BOMB_LEVEL = 2

/** How many hearts a phoenix heart must see lost in a round, at the most, before it stops being quiet. */
export const PHOENIX_THRESHOLD = 3

/** A heart bomb: its carrier starts the battle explosive. */
export class HeartBomb extends AbstractItem {


    constructor(
        /** The level of the explosive status it gives. */
        public readonly level: number,
    ){
        super("Bombe cardiaque", visual("items/heart_bomb"), ["Début du combat : gagne ", EXPLOSIVE, " ", level, "."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        // Told at the first round alone, so a battle loaded in the middle of the fight does not give it twice.
        hold(battle.roundStarted.add(round => {
            if(round === 1) battle.applyStatus(unit, EXPLOSIVE, this.level)
        }))
    }
}

export const HEART_BOMB = new HeartBomb(HEART_BOMB_LEVEL)

/**
 * A phoenix heart: losing more than a few hearts in a single round, even the last ones, gives a resurrection.
 * What is lost is counted from the start of each round.
 */
export class PhoenixHeart extends AbstractItem {


    constructor(
        /** How many hearts it takes to lose in a round, more than this, for the resurrection to come. */
        public readonly threshold: number,
    ){
        super("Cœur de phénix", visual("items/phoenix_heart"), [
            "Si tu perds plus de ", new HeartCount(threshold), " dans le même ", BATTLE_ROUND, ", gagne ", RESURRECTED, " 1.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        let lost = 0
        let risen = false
        const rise = (): void => {
            if(risen) return
            risen = true
            battle.applyStatus(unit, RESURRECTED, 1)
        }
        hold(battle.roundStarted.add(() => {
            lost = 0
            risen = false
        }))
        hold(unit.hearts.onDamage.add(({ amount }) => {
            const before = lost
            lost += amount
            if(before <= this.threshold && lost > this.threshold) rise()
        }))
        // The blow that kills is counted before it lands, when its unit no longer takes a status: it is brought back
        // at once, as the resurrection it would have been.
        hold(unit.hearts.onEmptied.add(emptied => {
            const hearts = emptied.reduce((total, { indexes }) => total + indexes.length, 0)
            if(risen || lost + hearts <= this.threshold) return
            risen = true
            revive({ battle, unit })
        }))
    }
}

export const PHOENIX_HEART = new PhoenixHeart(PHOENIX_THRESHOLD)
