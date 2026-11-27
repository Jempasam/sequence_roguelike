import type { Point } from "../../../../../../../engine/math"
import { pick } from "../../../../../../../engine/particles"
import type { Visual } from "../../../../../sim/base/Visual"
import type { AmbientUnit } from "../../AmbientContext"
import { countIn } from "../../scene/Grain"
import type { Range } from "../../scene/Grain"
import type { Scene } from "../../scene/Scene"
import { following } from "../following"
import { anchorOf } from "../Puff"
import { Puppet } from "../Puppet"
import type { Choice } from "../selection"
import { Tracked } from "../Tracked"

/** The seconds it takes to draw a thing out, to toss it once, and to put it back. */
const OUT = 0.4
const TOSS = 0.7
const BACK = 0.4

/** The seconds kept past its longest time, for a thing put back a frame late. */
const SLACK = 0.2

/** Where the pocket and the hand lie from the middle of a unit, on the side taken, in pixels. */
const POCKET: Point = { x: 2, y: 2 }
const HAND: Point = { x: 11, y: 0 }

/** What makes a juggle. */
export interface JuggleSpec {
    readonly among: Choice

    /** The pictures of the things a unit may juggle with. */
    readonly things: (unit: AmbientUnit) => readonly Visual[]

    /** The width a thing is drawn at, in pixels. */
    readonly size: number

    /** How many times it is tossed. */
    readonly tosses: Range

    /** How high a toss goes, in pixels. */
    readonly height: number
}

/** The point a share of the way between two points. */
function between(from: Point, to: Point, share: number): Point {
    return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share }
}

/**
 * A unit draws one of its things out of its pocket, to its side, tosses it up a few times, then puts it back.
 * It puts it back at once when it moves.
 */
export function juggle(spec: JuggleSpec): Scene {
    const { among, things, size, tosses, height } = spec
    const longest = OUT + tosses[1] * TOSS + BACK + SLACK
    return {
        playable: context => among(context).length > 0,
        create(context){

            // UNIT AND THING //
            const jugglers = among(context).flatMap(shown => {
                const sprites = things(shown).flatMap(thing => context.sprite(thing) ?? [])
                return sprites.length > 0 ? [{ shown, sprites }] : []
            })
            if(jugglers.length === 0) return null
            const { random } = context
            const { shown, sprites } = pick(random, jugglers)
            const unit = new Tracked(shown)
            const thing = new Puppet({
                system: context.alpha, sprite: pick(random, sprites), size, color: 0xffffff,
            }, longest)

            // WAY //
            const side = random() < 0.5 ? -1 : 1
            const pocket = { x: POCKET.x * side, y: POCKET.y }
            const hand = { x: HAND.x * side, y: HAND.y }
            const tossed = OUT + countIn(random, tosses) * TOSS

            /** Where it lies from the middle of its unit. */
            let offset: Point = pocket
            let stowing: { readonly from: Point, readonly since: number }|null = null
            return following(context, [unit], longest, (dt, age) => {
                if(unit.gone){
                    thing.hide()
                    return false
                }
                if(!stowing && (unit.moving || age >= tossed)) stowing = { from: offset, since: age }

                let opacity = 1
                let going = true
                if(stowing){
                    const share = Math.min(1, (age - stowing.since) / BACK)
                    offset = between(stowing.from, pocket, share)
                    opacity = 1 - share
                    going = share < 1
                }
                else if(age < OUT){
                    offset = between(pocket, hand, age / OUT)
                    opacity = age / OUT
                }
                else {
                    const share = (age - OUT) % TOSS / TOSS
                    offset = { x: hand.x, y: hand.y - Math.sin(share * Math.PI) * height }
                }
                const middle = anchorOf(unit.shown, "middle")
                return thing.place({ x: middle.x + offset.x, y: middle.y + offset.y }, opacity, dt) && going
            })
        },
    }
}
