import type { Point } from "../../../../../../../engine/math"
import { between, colorOf, pictureOf, systemOf } from "../../scene/Grain"
import type { Grain } from "../../scene/Grain"
import type { Scene } from "../../scene/Scene"
import { envelope, following } from "../following"
import { anchorOf } from "../Puff"
import type { Anchor } from "../Puff"
import { Puppet } from "../Puppet"
import { distanceBetween, drawAmong } from "../selection"
import type { Choice } from "../selection"
import { Tracked } from "../Tracked"

/** The seconds a companion takes to run away, and how far it gets, in pixels. */
const ESCAPE = 0.8
const ESCAPE_REACH = 60

/** The least way another unit comes closer in a frame, in pixels, to scare it. */
const APPROACH = 0.2

/** How fast a flicker goes, in radians per second: two waves, so it is uneven. */
const FLICKERS = [11, 7] as const

/** The flight of a companion that runs away: from where to where, and the age it started at. */
interface Escape {
    readonly from: Point
    readonly to: Point
    readonly since: number
}

/** A unit and the companion that stays by it. */
interface Host {
    readonly unit: Tracked
    readonly puppet: Puppet

    /** Where its flicker and its way start, so no two go as one. */
    readonly phase: number

    /** Its flight, none while it stays. */
    escape: Escape|null
}

/** What makes a companion. */
export interface CompanionSpec {
    readonly among: Choice

    /** What it looks like. */
    readonly grain: Grain

    /** The most units that get one, drawn at random: all of them by default. */
    readonly most?: number

    /** The point of its unit it stays by. */
    readonly anchor: Anchor

    /** Where it lies from that point, in pixels, at an age and a share of its time. */
    readonly way?: (age: number, share: number) => Point

    readonly duration: number

    /** The seconds it takes to appear and to fade. */
    readonly fade: number

    /** The share of its opacity that flickers, none by default. */
    readonly flicker?: number

    /** How near another unit must come for it to run away, in pixels: it never does by default. */
    readonly flees?: number
}

/** What stays by a unit and follows it: a light, a wisp, a hand. */
export function companion(spec: CompanionSpec): Scene {
    const { among, grain, most, anchor, duration, fade, flicker = 0, flees } = spec
    const way = spec.way ?? (() => ({ x: 0, y: 0 }))
    return {
        playable: context => among(context).length > 0,
        create(context){
            const { random } = context
            const candidates = among(context)
            const chosen = drawAmong(random, candidates, most)
            if(chosen.length === 0) return null

            // PICTURE //
            const sprite = pictureOf(context, grain)
            if(sprite === undefined) return null

            // UNITS //
            const hosts: Host[] = chosen.map(each => {
                const puppet = new Puppet({
                    system: systemOf(context, grain), sprite, color: colorOf(random, grain),
                    size: between(random, grain.size),
                }, duration + ESCAPE)
                return { unit: new Tracked(each), puppet, phase: random() * Math.PI * 2, escape: null }
            })
            const others = flees === undefined ? []
                : candidates.filter(each => !chosen.includes(each)).map(each => new Tracked(each))
            const units = [...hosts.map(host => host.unit), ...others]
            const gaps = new Map<Tracked, number>()

            return following(context, units, duration + ESCAPE, (dt, age) => {
                let showing = false
                for(const host of hosts){
                    const { unit, puppet, phase } = host
                    if(unit.gone || !host.escape && age >= duration){
                        puppet.hide()
                        continue
                    }
                    const waver = FLICKERS.reduce((wave, speed) => wave * Math.sin(age * speed + phase), 1)
                    const strength = (grain.opacity ?? 1) * (1 - flicker * (0.5 + 0.5 * waver))

                    // FLEE //
                    if(host.escape){
                        const { from, to, since } = host.escape
                        const share = Math.min(1, (age - since) / ESCAPE)
                        const at = {
                            x: from.x + (to.x - from.x) * share,
                            y: from.y + (to.y - from.y) * share,
                        }
                        puppet.place(at, strength * (1 - share), dt)
                        showing ||= share < 1
                        continue
                    }

                    // FOLLOW //
                    const point = anchorOf(unit.shown, anchor)
                    const offset = way(age + phase * flicker, age / duration)
                    const at = { x: point.x + offset.x, y: point.y + offset.y }
                    if(!puppet.place(at, strength * envelope(age, duration, fade), dt)) continue
                    showing = true

                    // SCARE //
                    for(const other of others){
                        if(other.gone) continue
                        const gap = distanceBetween(unit.shown.position, other.shown.position)
                        const before = gaps.get(other)
                        gaps.set(other, gap)
                        if(before === undefined || gap >= (flees ?? 0) || before - gap < APPROACH) continue
                        const away = Math.atan2(at.y - other.shown.position.y, at.x - other.shown.position.x)
                        const to = {
                            x: at.x + Math.cos(away) * ESCAPE_REACH,
                            y: at.y + Math.sin(away) * ESCAPE_REACH - ESCAPE_REACH / 3,
                        }
                        host.escape = { from: at, to, since: age }
                        break
                    }
                }
                return showing
            })
        },
    }
}
