import { Forced, ModifierKey } from "../../base/Attribute"
import type { PlugContext } from "../../battle/Action"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"
import * as Leap from "../../battle/mecanic/leap"

/**
 * An unsubstantial body until the end of the round: it takes no room, is aimed at by nobody, touched by no
 * blow or zone and moved by no other. It goes through the others as it moves. The moment it wounds someone,
 * it takes its body back, and the process is over.
 */
export class Ethereal extends AbstractProcess {


    constructor(){
        super("forme éthérée", visual("processes/ethereal", { color: [0.7, 0.85, 1] }),
            "Ne prend pas de place, ne peut être ni visé, ni touché, ni déplacé par les autres, et traverse les unités. Prend corps dès qu'elle blesse quelqu'un.",
        )
    }


    public override init({ battle, unit, hold }: PlugContext): void {
        const key = new ModifierKey("éthéré")
        unit.stats.tangible.add(key, new Forced(false))
        unit.stats.targetable.add(key, new Forced(false))
        unit.stats.touchable.add(key, new Forced(false))
        unit.stats.movable.add(key, new Forced(false))
        // Taking the body back, it may stand in another: it is moved out of it.
        hold(() => {
            unit.stats.tangible.remove(key)
            unit.stats.targetable.remove(key)
            unit.stats.touchable.remove(key)
            unit.stats.movable.remove(key)
            Leap.unblock(battle, unit)
        })
        hold(unit.hitting.add(() => {
            battle.events.push({ type: "status", unit, text: "prend corps" })
            battle.endProcess(unit, this)
        }))
    }
}
