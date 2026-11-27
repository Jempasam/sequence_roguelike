import type { Point } from "../../../../../../../engine/math"
import { pick } from "../../../../../../../engine/particles"
import type { Random } from "../../../../../../../engine/particles"
import { between, colorOf, pictureOf, systemOf } from "../../scene/Grain"
import type { Grain } from "../../scene/Grain"
import type { Scene } from "../../scene/Scene"
import { envelope, following } from "../following"
import { emitPuff } from "../Puff"
import type { Puff } from "../Puff"
import { Puppet } from "../Puppet"
import type { Choice } from "../selection"
import { Tracked } from "../Tracked"

/** Where it comes from, from the first head, in pixels. */
const FROM: Point = { x: -40, y: -30 }

/** The seconds it takes to appear and to fade. */
const FADE = 0.4

/** The height of its circle as a share of its width, and how far over the head its middle lies. */
const FLATTEN = 0.5
const LIFT = 6

/** How fast it circles, in radians per second. */
const TURN = 4.5

/** The seconds between two puffs of its trail. */
const TRAIL_PAUSE = 0.05

/** What makes a hop. */
export interface HopSpec {
    readonly among: Choice

    /** The fewest units it needs. */
    readonly least: number

    readonly grain: Grain

    /** How many units it goes to, one after the other: the same one twice only when it is alone. */
    readonly stops: number

    /** The seconds it takes to fly to a unit, to circle it, and to rest on it. */
    readonly flight: number
    readonly circle: number
    readonly rest: number

    /** How far from the head it circles, in pixels. */
    readonly radius: number

    /** How high its way between two units bows, in pixels. */
    readonly arc: number

    /** What it leaves behind, nothing by default. */
    readonly trail?: Puff
}

/** The next unit to go to: another one than the last, when there is one. */
function nextOf(random: Random, units: readonly Tracked[], last: Tracked|null): Tracked|null {
    const shown = units.filter(unit => !unit.gone)
    const others = shown.filter(unit => unit !== last)
    if(others.length > 0) return pick(random, others)
    return shown[0] ?? null
}

/** A small being that goes from unit to unit: it circles each, rests on its head, then goes on. */
export function hop(spec: HopSpec): Scene {
    const { among, least, grain, stops, flight, circle, rest, radius, arc, trail } = spec
    const stay = flight + circle + rest
    const duration = stops * stay
    return {
        playable: context => among(context).length >= least,
        create(context){
            const sprite = pictureOf(context, grain)
            const candidates = among(context)
            if(sprite === undefined || candidates.length < least) return null
            const { random } = context
            const units = candidates.map(each => new Tracked(each))
            const size = between(random, grain.size)
            const color = colorOf(random, grain)
            const being = new Puppet({ system: systemOf(context, grain), sprite, size, color }, duration)

            /** A point of the circle of a head, which closes on it as the share left gets to 0. */
            const around = (head: Point, angle: number, left: number): Point => ({
                x: head.x + Math.cos(angle) * radius * left,
                y: head.y - size / 2 + (Math.sin(angle) * radius * FLATTEN - LIFT) * left,
            })

            let host = pick(random, units)
            let origin: Point = { x: host.shown.head.x + FROM.x, y: host.shown.head.y + FROM.y }
            let since = 0
            let wait = 0
            return following(context, units, duration, (dt, age) => {

                // GO ON //
                if(host.gone || age - since >= stay){
                    const next = nextOf(random, units, host)
                    if(!next){
                        being.hide()
                        return false
                    }
                    origin = being.at
                    host = next
                    since = age
                }

                // PLACE //
                const time = age - since
                const { head } = host.shown
                let at: Point
                if(time < flight){
                    const share = time / flight
                    const goal = around(head, 0, circle > 0 ? 1 : 0)
                    at = {
                        x: origin.x + (goal.x - origin.x) * share,
                        y: origin.y + (goal.y - origin.y) * share - Math.sin(share * Math.PI) * arc,
                    }
                }
                else {
                    const turned = time - flight
                    const left = turned < circle ? 1 - turned / circle : 0
                    at = around(head, turned * TURN, left)
                }

                // TRAIL //
                wait -= dt
                if(trail && wait <= 0){
                    wait += TRAIL_PAUSE
                    emitPuff(context, trail, null, at)
                }
                return being.place(at, envelope(age, duration, FADE) * (grain.opacity ?? 1), dt)
            })
        },
    }
}
