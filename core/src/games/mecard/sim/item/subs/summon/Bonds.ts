import { BATTLE_ROUND } from "../../../base/keywords"
import { INVOCATION } from "../../../battle/mecanic/summon/keyword"
import * as Summons from "../../../battle/mecanic/summon"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import type { Preview } from "../../../battle/preview/Preview"
import type { PreviewContext } from "../../../battle/preview/PreviewContext"
import * as Previews from "../../../battle/preview/Previews"
import { CONTROL_COLOR, MOVE_WIDTH } from "../../../battle/previewColors"
import type { Unit } from "../../../battle/Unit"
import { HeartCount } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { BLUE_HEART } from "../../../heart/subs/BlueHeartKind"

import { AbstractItem } from "../AbstractItem"

/** A cord: half of what its unit is about to lose is lost by its nearest summon instead. */
export class Cord extends AbstractItem {


    constructor(){
        super("Cordon", visual("items/cord"), [
            "Quand tu subis des dégâts, ton ", INVOCATION.as("invocation"), " la plus proche en subit la moitié à ta place.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(unit.hearts.onIncoming.add(incoming => {
            if(incoming.derived || incoming.amount <= 0) return
            const nearest = nearestSummon(battle, unit)
            const shared = Math.floor(incoming.amount / 2)
            if(!nearest || shared <= 0) return
            incoming.amount -= shared
            nearest.hearts.damage(shared, incoming.nature, incoming.source)
        }))
    }

    /** The summon that would take half of the damage, from where the unit stands now. */
    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const nearest = nearestSummon(battle, unit)
        if(!nearest) return Previews.still(pose)
        return Previews.still(
            pose,
            Previews.arrow([pose.position, nearest.position], MOVE_WIDTH / 2, CONTROL_COLOR),
            ...Previews.strike([], [nearest]),
        )
    }
}

/** The living summon of a unit nearest to it, none when it has none. */
function nearestSummon(battle: Battle, unit: Unit): Unit|null {
    let nearest: Unit|null = null
    let best = Infinity
    for(const body of Summons.summonsOf(battle, unit)){
        const distance = body.position.distance(unit.position)
        if(!body.alive || distance >= best) continue
        nearest = body
        best = distance
    }
    return nearest
}

export const CORD = new Cord()

/** A bone to chew: a round without any new summon gives the oldest summon a blue heart. */
export class ChewBone extends AbstractItem {


    constructor(){
        super("Os à ronger", visual("items/chew_bone"), [
            "Un ", BATTLE_ROUND, " où tu n'invoques rien : ton ", INVOCATION.as("invocation"), " la plus ancienne gagne ",
            new HeartCount(1), " ", BLUE_HEART, ".",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        let summoned = false
        hold(battle.signals.spawned.add(({ unit: body }) => {
            if(body.owner === unit) summoned = true
        }))
        hold(battle.roundEnded.add(() => {
            const oldest = Summons.summonsOf(battle, unit).find(body => body.alive)
            if(!summoned && oldest) oldest.hearts.give(new Heart(BLUE_HEART))
            summoned = false
        }))
    }
}

export const CHEW_BONE = new ChewBone()
