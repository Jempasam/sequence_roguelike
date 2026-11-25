import { BATTLE_ROUND } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import { HeartCount } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { SHIELD_HEART } from "../../../heart/subs/ShieldHeartKind"
import type { Survivor } from "../../Item"

import { AbstractItem } from "../AbstractItem"

/** A patch: after its unit first loses a heart in the battle, it is healed at the end of the round. */
export class Patch extends AbstractItem {


    constructor(){
        super("Rustine", visual("items/patch"), [
            "Après la première perte de ", new HeartCount(1), " du combat, soigne ", new HeartCount(1),
            " à la fin du ", BATTLE_ROUND, ".",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        let lost = false
        let owed = false
        hold(unit.hearts.onDamage.add(() => {
            if(lost) return
            lost = true
            owed = true
        }))
        hold(battle.roundEnded.add(() => {
            if(!owed) return
            owed = false
            if(unit.alive) unit.hearts.heal(1)
        }))
    }
}

export const PATCH = new Patch()

/** A campfire soup: once a fight is won, a lost heart of its carrier comes back. */
export class CampSoup extends AbstractItem {


    constructor(){
        super("Soupe du campement", visual("items/camp_soup"), [
            "Après un combat gagné : soigne ", new HeartCount(1), ".",
        ])
    }


    public init(ctx: PlugContext): void {
        void ctx
    }

    public afterFight({ hearts }: Survivor): void {
        const empty = hearts.find(heart => heart.isEmpty)
        if(empty) empty.isEmpty = false
    }
}

export const CAMP_SOUP = new CampSoup()

/**
 * A plumb line: a unit that started with no shield heart, before any item was plugged in, gains one.
 * Each plumb line reads that same start, so they stack.
 */
export class PlumbLine extends AbstractItem {


    constructor(){
        super("Fil à plomb", visual("items/plumb_line"), [
            "Début du combat : si tu avais moins de ", new HeartCount(1), " ", SHIELD_HEART,
            " avant l'exécution des objets, gagne ", new HeartCount(1), " ", SHIELD_HEART, ".",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundStarted.add(round => {
            if(round === 1 && unit.bareShields < 1) unit.hearts.give(new Heart(SHIELD_HEART))
        }))
    }
}

export const PLUMB_LINE = new PlumbLine()
