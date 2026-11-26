import { follow, pick } from "../../../../../../../engine/particles"
import { ALL_ITEMS, ALL_USABLES } from "../../../../../sim"
import type { HaltType, Visual } from "../../../../../sim"
import { AmbientEffect } from "../../AmbientEffect"
import { ITEM_HALTS, USABLE_HALTS } from "../../themes"
import { haltsAmong } from "../../trip/places"

/** How long a thing takes to be tossed, to fall, bounce and fade, in seconds. */
const DURATION = 2.8

/** The height of a toss and of each bounce, in pixels, and the share of the time each one ends at. */
const ARCS: readonly (readonly [number, number])[] = [[26, 0.4], [10, 0.65], [4, 0.8]]

/** How far below its halt a thing lands, in pixels. */
const FALL = 16

/** The height above the ground of something that bounces, at a progress from 0 to 1. */
function heightAt(progress: number): number {
    let start = 0
    for(const [height, end] of ARCS){
        if(progress < end) return Math.sin((progress - start) / (end - start) * Math.PI) * height
        start = end
    }
    return 0
}

/** What an ejection throws out: any of them, by the visual it is drawn with. */
interface Thing {
    readonly icon: Visual
}

/** An effect of a halt that tosses a thing out: it falls to the ground, bounces and fades. */
function ejection(id: string, givers: readonly HaltType[], things: readonly Thing[]): AmbientEffect {
    const places = haltsAmong(givers)
    return new AmbientEffect({
        id,
        spacing: 25,
        stackable: false,
        isPlayable: context => places(context).length > 0,
        weight: () => 2,
        effect: {
            create(context){
                const { random } = context
                const stops = places(context)
                if(stops.length === 0) return null
                const { position } = pick(random, stops)
                const sprite = context.sprite(pick(random, things).icon)
                if(!sprite) return null
                const aside = (random() < 0.5 ? -1 : 1) * (28 + random() * 30)
                return follow({
                    system: context.alpha, sprite, size: 9, duration: DURATION,
                    path: progress => ({
                        x: position.x + aside * Math.min(1, progress / 0.6),
                        y: position.y + FALL * Math.min(1, progress / 0.4) - heightAt(progress),
                    }),
                })
            },
        },
    })
}

/** An item is tossed out of a halt that gives one. */
export const ITEM_EJECT: AmbientEffect = ejection("item-eject", ITEM_HALTS, ALL_ITEMS)

/** Something to use is tossed out of a halt that gives one. */
export const USABLE_EJECT: AmbientEffect = ejection("usable-eject", USABLE_HALTS, ALL_USABLES)
