import type { Sprite } from "../../../../../../../engine/gpu"
import type { Point } from "../../../../../../../engine/math"
import { pick } from "../../../../../../../engine/particles"
import type { AmbientContext } from "../../AmbientContext"
import { between, colorOf, pictureOf, systemOf } from "../../scene/Grain"
import type { Grain } from "../../scene/Grain"
import type { Scene } from "../../scene/Scene"
import { following } from "../following"
import { Puppet } from "../Puppet"
import type { Choice } from "../selection"
import { Tracked } from "../Tracked"

/** Where it comes from and where it leaves to, from the seat, in pixels. It goes from left to right. */
const FROM: Point = { x: -80, y: -50 }
const AWAY: Point = { x: 90, y: -60 }

/** The seconds it takes to arrive and to leave. */
const ARRIVAL = 1
const DEPARTURE = 1.2

/** The seconds kept past its longest time, for a departure that starts a frame late. */
const SLACK = 0.2

/** The seconds it takes to appear. */
const APPEAR = 0.25

/** How high it hops on its seat, in pixels, and how fast, in radians per second. */
const HOP = 1
const HOPPING = 6

/** What makes a perch. */
export interface PerchSpec {
    readonly among: Choice

    /** What comes to sit, chosen when it starts. */
    readonly being: (context: AmbientContext) => Grain

    /** The most seconds it stays seated. */
    readonly stay: number

    /** What it takes away from the head, none by default. */
    readonly loot?: (context: AmbientContext) => Sprite|null
}

/**
 * A being that flies in, sits on the head of a unit, and flies away once its time is over or as soon as the
 * unit moves.
 */
export function perch(spec: PerchSpec): Scene {
    const { among, being, stay, loot } = spec
    const total = ARRIVAL + stay + DEPARTURE + SLACK
    return {
        playable: context => among(context).length > 0 && (!loot || loot(context) !== null),
        create(context){
            const grain = being(context)
            const sprite = pictureOf(context, grain)
            const taken = loot?.(context) ?? null
            const candidates = among(context)
            if(sprite === undefined || candidates.length === 0 || loot && !taken) return null
            const { random } = context
            const unit = new Tracked(pick(random, candidates))
            const size = between(random, grain.size)
            const system = systemOf(context, grain)
            const bird = new Puppet({ system, sprite, size, color: colorOf(random, grain) }, total)
            const carried = taken
                && new Puppet({ system, sprite: taken, size: size * 0.6, color: 0xffffff }, total)
            const seatOf = (head: Point): Point => ({ x: head.x, y: head.y - size / 2 })

            let leaving: { readonly from: Point, readonly at: number, readonly loot: boolean }|null = null
            let landed = false
            return following(context, [unit], total, (dt, age) => {

                // LEAVE //
                const over = landed && age >= ARRIVAL + stay
                if(!leaving && (unit.gone || unit.moving || over)){
                    const seated = seatOf(unit.shown.head)
                    leaving = { from: age <= dt ? seated : bird.at, at: age, loot: landed }
                }
                if(leaving){
                    const share = Math.min(1, (age - leaving.at) / DEPARTURE)
                    const at = {
                        x: leaving.from.x + AWAY.x * share * share,
                        y: leaving.from.y + AWAY.y * share * share,
                    }
                    const seen = 1 - share
                    bird.place(at, seen, dt)
                    if(leaving.loot) carried?.place({ x: at.x, y: at.y + size / 2 }, seen, dt)
                    return share < 1
                }

                // ARRIVE //
                const seat = seatOf(unit.shown.head)
                if(age < ARRIVAL){
                    const left = (1 - age / ARRIVAL) ** 2
                    const at = { x: seat.x + FROM.x * left, y: seat.y + FROM.y * left }
                    return bird.place(at, Math.min(1, age / APPEAR), dt)
                }

                // SIT //
                landed = true
                const hop = Math.max(0, Math.sin((age - ARRIVAL) * HOPPING)) * HOP
                return bird.place({ x: seat.x, y: seat.y - hop }, 1, dt)
            })
        },
    }
}
