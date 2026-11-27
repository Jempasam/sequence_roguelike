import type { FloorType } from "../../../../../sim/floor/Floor"
import { pictureOf } from "../../scene/Grain"
import type { Scene } from "../../scene/Scene"
import { following } from "../following"
import { emitPuff } from "../Puff"
import type { Puff } from "../Puff"
import type { Choice } from "../selection"
import { Tracked } from "../Tracked"

/** The longest way in a frame, in pixels, that is walked: a longer one is a jump, which raises nothing. */
const JUMP = 30

/** How far under the position of a unit its steps raise things, in pixels. */
const SOLE = 1

/** What makes a trail. */
export interface TrailSpec {
    readonly among: Choice

    /** What a step raises on a floor. */
    readonly raised: (floor: FloorType) => Puff

    /** The way a unit goes between two puffs, in pixels. */
    readonly stride: number

    /** The seconds the steps are listened for. */
    readonly duration: number
}

/** What the steps of the units raise from the ground while they move. */
export function trail(spec: TrailSpec): Scene {
    const { among, raised, stride, duration } = spec
    return {
        playable: context => among(context).length > 0,
        create(context){
            const puff = raised(context.floor())
            const sprite = pictureOf(context, puff.grain)
            if(sprite === undefined) return null
            const walkers = among(context).map(each => ({ unit: new Tracked(each), walked: 0 }))
            if(walkers.length === 0) return null
            const units = walkers.map(walker => walker.unit)
            return following(context, units, duration, () => {
                for(const walker of walkers){
                    const { unit } = walker
                    if(!unit.moving || unit.moved > JUMP) continue
                    walker.walked += unit.moved
                    if(walker.walked < stride) continue
                    walker.walked %= stride
                    const { x, y } = unit.shown.position
                    emitPuff(context, puff, sprite, { x, y: y + SOLE })
                }
                return units.some(unit => !unit.gone)
            })
        },
    }
}
