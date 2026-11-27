import { between, colorOf, pictureOf, systemOf } from "../../scene/Grain"
import type { Grain } from "../../scene/Grain"
import type { Scene } from "../../scene/Scene"
import { following } from "../following"
import { emitPuff } from "../Puff"
import type { Puff } from "../Puff"
import { Puppet } from "../Puppet"
import type { Choice } from "../selection"
import { Tracked } from "../Tracked"

/** How many grains each row of a heap holds, from the bottom, and how far apart they lie, in pixels. */
const ROWS = [5, 4, 3, 2] as const
const SPACE = 2

/** The seconds a heap takes to melt away at the end. */
const MELT = 1.5

/** Where the grains of a full heap lie from the head, from the first one laid. */
const SPOTS = ROWS.flatMap((count, row) => Array.from({ length: count }, (_, index) => ({
    x: (index - (count - 1) / 2) * SPACE,
    y: -row * SPACE,
})))

/** What makes a cap. */
export interface CapSpec {
    readonly among: Choice
    readonly grain: Grain

    /** The seconds a heap takes to be full on a unit that stays still. */
    readonly gathering: number

    /** The seconds it stays, the melting included. */
    readonly duration: number
}

/**
 * A heap that gathers on the head of the units that stay still, grain after grain. It falls off as one when
 * its unit moves, then gathers again, and melts at the end.
 */
export function cap(spec: CapSpec): Scene {
    const { among, grain, gathering, duration } = spec
    const pause = gathering / SPOTS.length
    const fall: Puff = { grain, count: [1, 1], life: 0.6, vx: [-10, 10], vy: [-8, 8], ay: [130, 130] }
    return {
        playable: context => among(context).length > 0,
        create(context){
            const sprite = pictureOf(context, grain)
            if(sprite === undefined) return null
            const { random } = context
            const heaps = among(context).map(each => ({
                unit: new Tracked(each), grains: [] as Puppet[], wait: random() * pause,
            }))
            if(heaps.length === 0) return null
            const units = heaps.map(heap => heap.unit)
            return following(context, units, duration, (dt, age) => {
                const opacity = Math.max(0, Math.min(1, (duration - age) / MELT)) * (grain.opacity ?? 1)
                for(const heap of heaps){
                    const { unit, grains } = heap

                    // FALL //
                    if(unit.gone || unit.moving){
                        for(const flake of grains.splice(0)){
                            flake.hide()
                            if(!unit.gone) emitPuff(context, fall, sprite, flake.at)
                        }
                        continue
                    }

                    // GATHER //
                    const { head } = unit.shown
                    heap.wait -= dt
                    if(heap.wait <= 0 && grains.length < SPOTS.length && age < duration - MELT){
                        heap.wait += pause
                        grains.push(new Puppet({
                            system: systemOf(context, grain), sprite, size: between(random, grain.size),
                            color: colorOf(random, grain),
                        }, duration))
                    }

                    // SHOW //
                    grains.forEach((flake, index) => {
                        const spot = SPOTS[index]
                        flake.place({ x: head.x + spot.x, y: head.y + spot.y }, opacity, dt)
                    })
                }
                return units.some(unit => !unit.gone)
            })
        },
    }
}
