import { Vector2 } from "../../base/Vector2"
import type { PlugContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"

import { tieTo } from "./Links"

/** How far a unit has to be moved for it to have moved, in meters: what a rounding leaves is not a move. */
const MOVED_SLACK = 1e-6

/**
 * A spear stuck in a unit until the end of the round, the reverse of a hook: as the unit it pierced moves or
 * turns, the one who threw it follows, keeping where it stands and faces next to it. Any move of its own, of
 * its own will or not, a step, a push, a jump, a swap, pulls the spear out.
 */
export class Skewering extends AbstractProcess {


    constructor(
        /** The unit pierced, followed by the unit this process is for. */
        public readonly target: Unit,
    ){
        super("lance", visual("processes/skewer", { color: [0.75, 0.75, 0.85] }),
            "Quand l'unité transpercée bouge ou tourne, tu la suis en gardant ta place et ton orientation par rapport à elle. Tout déplacement qui n'est pas ce suivi retire la lance.",
        )
    }


    public override init(ctx: PlugContext): void {
        const { battle, unit, hold } = ctx
        const { target } = this
        tieTo(ctx, target, this, "tethers/grapple")
        // Where the unit stands and faces in the frame of its target, ahead and to its right.
        const offset = unit.position.minus(target.position)
        const ahead = offset.dot(target.direction)
        const side = offset.dot(target.direction.right)
        const facingAhead = unit.direction.dot(target.direction)
        const facingSide = unit.direction.dot(target.direction.right)
        let following = false
        const pulledOut = (from: Vector2, to: Vector2): void => {
            if(following || from.distance(to) <= MOVED_SLACK) return
            battle.events.push({ type: "status", unit, text: "lance retirée" })
            battle.endProcess(unit, this)
        }
        hold(battle.signals.moved.add(event => {
            if(event.unit === unit) return pulledOut(event.from.position, event.to.position)
            if(event.unit !== target || following || !unit.alive) return
            following = true
            try {
                const wanted = target.position.plus(Vector2.relative(target.direction, ahead, side))
                const way = wanted.minus(unit.position)
                const toward = way.normalized
                if(toward) battle.move(unit, toward, way.length, true)
                battle.turn(unit, Vector2.relative(target.direction, facingAhead, facingSide))
            } finally {
                following = false
            }
        }))
        hold(battle.signals.blinked.add(event => {
            if(event.unit === unit) pulledOut(event.from.position, event.to.position)
        }))
    }
}
