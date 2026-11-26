import type { Vector2 } from "../../base/Vector2"
import type { PlugContext, UnitContext } from "../../battle/Action"
import type { Battle } from "../../battle/Battle"
import type { Preview } from "../../battle/preview/Preview"
import type { PreviewContext } from "../../battle/preview/PreviewContext"
import * as Previews from "../../battle/preview/Previews"
import { MOVE_WIDTH } from "../../battle/previewColors"
import { DamageType } from "../../battle/DamageType"
import type { Unit } from "../../battle/Unit"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"
import { BATTLE_ROUND } from "../../base/keywords"
import * as Walk from "../../battle/mecanic/walk"

/** How far a unit is flown, as a multiple of the distance that parts it from the slingshot. */
export const SLINGSHOT_FACTOR = 2

/** How many meters of a flight a collision must cut short to cost a heart: one heart for each. */
export const SLINGSHOT_METERS_PER_HEART = 2

/**
 * A unit tied to a slingshot: as the round ends, it is flown toward the slingshot, and past it, for twice the
 * distance that parted them. The unit it runs into is pushed the same way for the same distance, and both
 * pay a heart for each meters of the flight a collision cut short.
 */
export class SlingshotPull extends AbstractProcess {


    constructor(
        /** The slingshot it is tied to. */
        public readonly slingshot: Unit,
    ){
        super("lance-pierre", visual("processes/hook", { color: [0.85, 0.7, 0.45] }),
            [
                "À la fin du ", BATTLE_ROUND, ", est propulsé vers le lance-pierre sur le double de la distance qui le",
                " sépare de lui : l'unité touchée est repoussée de même, 1 dégât par 2 m de collision.",
            ],
        )
    }


    public override init({ battle, unit, hold }: PlugContext): void {
        hold(battle.tether(unit, this.slingshot, visual("tethers/laser", { color: [0.85, 0.7, 0.45] })))
    }


    /** The flight at the end of the round, from where the unit stands now, with nothing in the way. */
    public preview({ unit, pose }: PreviewContext): Preview {
        const toward = this.slingshot.position.minus(pose.position)
        const way = this.slingshot.alive ? toward.normalized : null
        if(!way) return Previews.still(pose)
        const to = pose.position.plus(way.times(toward.length * SLINGSHOT_FACTOR))
        return Previews.still(pose, ...Previews.moving(unit, pose.position, to, to, MOVE_WIDTH))
    }

    public dispose({ battle, unit }: UnitContext): void {
        const { slingshot } = this
        if(unit.alive && battle.phase !== "over" && slingshot.alive){
            const toward = slingshot.position.minus(unit.position)
            const way = toward.normalized
            if(way){
                const asked = toward.length * SLINGSHOT_FACTOR
                const trip = Walk.move(battle, unit, way, asked, true)
                if(trip.struck) hit(battle, unit, trip.struck, way, asked, asked - trip.distance)
            }
        }
        battle.vanish(slingshot)
    }
}

/**
 * The unit a flight ran into: it is pushed along for the whole flight, and the collision costs each a heart for
 * every meters it cut short, from either flight.
 */
function hit(battle: Battle, unit: Unit, struck: Unit, way: Vector2, asked: number, cut: number): void {
    const pushed = Walk.move(battle, struck, way, asked, true)
    const hearts = Math.floor((cut + (asked - pushed.distance)) / SLINGSHOT_METERS_PER_HEART)
    if(hearts <= 0) return
    struck.hearts.damage(hearts, DamageType.PHYSICAL, unit)
    unit.hearts.damage(hearts, DamageType.PHYSICAL, unit)
}
