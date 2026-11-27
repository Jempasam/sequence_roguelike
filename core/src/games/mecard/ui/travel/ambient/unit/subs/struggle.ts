import type { Point } from "../../../../../../../engine/math"
import { pick } from "../../../../../../../engine/particles"
import type { Visual } from "../../../../../sim/base/Visual"
import type { Scene } from "../../scene/Scene"
import { following } from "../following"
import { anchorOf } from "../Puff"
import { Puppet } from "../Puppet"
import type { Choice } from "../selection"
import { Tracked } from "../Tracked"

/** The seconds a double pulled back takes to be on its body again. */
const SNAP = 0.08

/** The seconds kept past its time, for an end a frame late. */
const SLACK = 0.2

/** Where the eyes lie from the middle of the double, as shares of its width and of its height. */
const EYE_ASIDE = 1 / 6
const EYE_UP = 1 / 4

/** The width of an eye, as a share of the width of the double. */
const EYE_SIZE = 5 / 16

/** A pose the double holds for a time. */
export interface Pose {
    readonly seconds: number

    /** How high it climbs from its body, from its first pixel to its last: none when it lies on it. */
    readonly climb: readonly [number, number]|null
}

/** What makes a struggle. */
export interface StruggleSpec {
    readonly among: Choice

    /** The color of the double as `0xRRGGBB`, and its opacity. */
    readonly color: number
    readonly opacity: number

    /** The picture drawn twice on the double, as its eyes, always fully seen. */
    readonly eye: Visual

    /** How far the double leans, in radians, and how far aside it lies, in pixels, when it is out. */
    readonly tilt: number
    readonly aside: number

    /** The poses it goes through, in order: it appears along the first one. */
    readonly poses: readonly Pose[]

    /** The seconds it takes to be pulled back and to vanish, after the last pose. */
    readonly recall: number
}

/** A double drawn at an angle, with its eyes. */
interface Figure {
    /** Show it with its middle at a point, as much of it as asked. @returns False when it cannot be. */
    show(middle: Point, seen: number, dt: number): boolean

    hide(): void
}

/**
 * The double of a unit, eyes dead, that tries to get out of its body: it lies on it, then leans out and
 * climbs, again and again, higher each time the poses say so, until it is pulled back at once.
 */
export function struggle(spec: StruggleSpec): Scene {
    const { among, color, opacity, eye, tilt, aside, poses, recall } = spec
    const held = poses.reduce((sum, pose) => sum + pose.seconds, 0)
    const duration = held + recall
    return {
        playable: context => among(context).length > 0,
        create(context){
            const eyes = context.sprite(eye)
            const doubles = among(context).flatMap(shown => {
                const sprite = context.sprite(shown.unit.sprite)
                return sprite ? [{ shown, sprite }] : []
            })
            if(!eyes || doubles.length === 0) return null
            const { random } = context
            const { shown, sprite } = pick(random, doubles)
            const unit = new Tracked(shown)
            const side = random() < 0.5 ? -1 : 1
            const height = shown.position.y - shown.head.y
            const width = height * sprite.width / sprite.height
            const mirrored = shown.facing.x < 0

            /** The double at an angle: itself, then its eyes, which are thus drawn over it. */
            const figure = (rotation: number): Figure => {
                const system = context.alpha
                const life = duration + SLACK
                const itself = new Puppet({ system, sprite, size: width, color, rotation, mirrored }, life)
                const [cos, sin] = [Math.cos(rotation), Math.sin(rotation)]
                const marks = [-1, 1].map(which => {
                    const x = which * width * EYE_ASIDE
                    const y = -height * EYE_UP
                    return {
                        puppet: new Puppet({
                            system, sprite: eyes, size: width * EYE_SIZE, color: 0xffffff, rotation,
                        }, life),
                        offset: { x: x * cos - y * sin, y: x * sin + y * cos },
                    }
                })
                return {
                    show(middle, seen, dt){
                        let shownAll = itself.place(middle, seen * opacity, dt)
                        for(const { puppet, offset } of marks){
                            const at = { x: middle.x + offset.x, y: middle.y + offset.y }
                            shownAll = puppet.place(at, seen, dt) && shownAll
                        }
                        return shownAll
                    },
                    hide(){
                        itself.hide()
                        for(const { puppet } of marks) puppet.hide()
                    },
                }
            }
            const upright = figure(0)
            const leaning = figure(tilt * side)
            const climbed = poses.reduce((height, pose) => pose.climb?.[1] ?? height, 0)

            return following(context, [unit], duration + SLACK, (dt, age) => {
                if(unit.gone){
                    upright.hide()
                    leaning.hide()
                    return false
                }

                // POSE //
                let since = age
                const pose = poses.find(each => {
                    if(since < each.seconds) return true
                    since -= each.seconds
                    return false
                })
                const middle = anchorOf(unit.shown, "middle")
                let at = middle
                let out = false
                let seen = 1
                if(pose?.climb){
                    // It climbs fast then slower and slower, as if held back.
                    const left = 1 - since / pose.seconds
                    const [from, to] = pose.climb
                    const lift = from + (to - from) * (1 - left * left)
                    at = { x: middle.x + aside * side, y: middle.y - lift }
                    out = true
                }
                else if(!pose){
                    const left = Math.max(0, 1 - since / SNAP)
                    at = { x: middle.x + aside * side * left, y: middle.y - climbed * left }
                    seen = since < SNAP ? 1 : Math.max(0, 1 - (since - SNAP) / (recall - SNAP))
                }
                if(age < poses[0].seconds) seen = age / poses[0].seconds

                // SHOW //
                const straight = upright.show(at, out ? 0 : seen, dt)
                const leant = leaning.show(at, out ? seen : 0, dt)
                return straight && leant && age < duration
            })
        },
    }
}
