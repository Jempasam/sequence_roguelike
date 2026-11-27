import type { Sprite } from "../../../../../../../engine/gpu"
import type { Point } from "../../../../../../../engine/math"
import { pick } from "../../../../../../../engine/particles"
import type { AmbientContext, AmbientUnit } from "../../AmbientContext"
import { between, colorOf, pictureOf, systemOf } from "../../scene/Grain"
import type { Grain } from "../../scene/Grain"
import type { Scene } from "../../scene/Scene"
import { following } from "../following"
import { Puppet } from "../Puppet"
import type { Pair } from "../selection"
import { Tracked } from "../Tracked"

/** What is shown of a turn: where, and how much of it is seen. */
export interface Shown {
    readonly at: Point
    readonly opacity: number
}

/** What makes an exchange between two units. */
export interface PairSpec {
    /** The pairs of units that may do it. */
    readonly pairs: (context: AmbientContext) => readonly Pair[]

    readonly grain: Grain

    /** The picture to draw instead of the one of the grain, such as the coin of the gold. */
    readonly picture?: (context: AmbientContext) => Sprite|null

    /** How many turns it takes, each going the other way than the one before. */
    readonly turns: number

    /** The seconds a turn takes. */
    readonly beat: number

    /** What a turn shows, from the one whose turn it is to the other, at a share of the turn. */
    readonly turn: (from: AmbientUnit, to: AmbientUnit, share: number) => Shown
}

/** Two units that take turns: a word over each head in turn, a thing tossed from one to the other. */
export function pair(spec: PairSpec): Scene {
    const { pairs, grain, picture, turns, beat, turn } = spec
    const duration = turns * beat
    return {
        playable: context => pairs(context).length > 0 && (!picture || picture(context) !== null),
        create(context){
            const sprite = picture ? picture(context) ?? undefined : pictureOf(context, grain)
            const found = pairs(context)
            if(sprite === undefined || found.length === 0) return null
            const { random } = context
            const units = pick(random, found).map(each => new Tracked(each))
            const thing = new Puppet({
                system: systemOf(context, grain), sprite, size: between(random, grain.size),
                color: colorOf(random, grain),
            }, duration)
            return following(context, units, duration, (dt, age) => {
                if(units.some(unit => unit.gone)){
                    thing.hide()
                    return false
                }
                const passed = Math.min(turns - 1, Math.floor(age / beat))
                const share = Math.min(1, age / beat - passed)
                const [from, to] = passed % 2 === 0 ? units : [units[1], units[0]]
                const { at, opacity } = turn(from.shown, to.shown, share)
                return thing.place(at, opacity * (grain.opacity ?? 1), dt)
            })
        },
    }
}
