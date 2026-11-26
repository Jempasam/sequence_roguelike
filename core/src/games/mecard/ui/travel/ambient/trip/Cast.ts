import type { Sprite } from "../../../../../../engine/gpu"
import { pick } from "../../../../../../engine/particles"
import type { Visual } from "../../../../sim/base/Visual"
import type { HaltType } from "../../../../sim/halt/HaltType"
import type { AmbientContext } from "../AmbientContext"
import type { Stop } from "./Stop"

/**
 * Who makes a trip: the sprites of what travels, the first leading and the others following. None while their
 * pictures are not loaded.
 *
 * @param anchor - The stop of a place the trip is tied to, none for a trip out of every place.
 */
export type Cast = (context: AmbientContext, anchor: Stop|null) => readonly Sprite[]|null

/**
 * The sprites of visuals whose picture exists: one without is left out, so a missing file does not stop a
 * trip. None when no picture is there at all, as before the sprites are loaded.
 */
export function spritesOf(context: AmbientContext, visuals: readonly Visual[]): Sprite[]|null {
    const sprites: Sprite[] = []
    for(const visual of visuals){
        const sprite = context.sprite(visual)
        if(sprite) sprites.push(sprite)
    }
    return sprites.length > 0 ? sprites : null
}

/** Always the same visuals. */
export function fixed(...visuals: readonly Visual[]): Cast {
    return context => spritesOf(context, visuals)
}

/** The sprite of a visual when its picture is loaded, none at all when it is not: the trip goes on. */
export function optional(visual: Visual): Cast {
    return context => {
        const sprite = context.sprite(visual)
        return sprite ? [sprite] : []
    }
}

/** The first of some visuals whose picture is loaded: a picture still to be drawn is stood in for. */
export function firstLoaded(...visuals: readonly Visual[]): Cast {
    return context => {
        for(const visual of visuals){
            const sprite = context.sprite(visual)
            if(sprite) return [sprite]
        }
        return null
    }
}

/** Some of the visuals of a pool, drawn at random, as many as a number between two. */
export function manyOf(pool: readonly Visual[], least: number, most: number = least): Cast {
    return context => {
        const count = least + Math.floor(context.random() * (most - least + 1))
        return spritesOf(context, Array.from({ length: count }, () => pick(context.random, pool)))
    }
}

/** A cast whose pool is read from the map: the icons of the fights it holds. */
export function manyOfFights(least: number, most: number = least): Cast {
    return context => {
        const icons = context.places().flatMap(({ place }) => place.fight ? [place.fight.icon] : [])
        if(icons.length === 0) return null
        return manyOf(icons, least, most)(context, null)
    }
}

/**
 * The icon of the fight of the anchor, else the icon of one of the fights of the map: whoever stands for the
 * monsters of the map.
 */
export const enemyOfMap: Cast = (context, anchor) => {
    const own = anchor?.place?.fight
    if(own) return spritesOf(context, [own.icon])
    return manyOfFights(1)(context, anchor)
}

/** One of some casts, drawn at random. */
export function randomOf(...casts: readonly Cast[]): Cast {
    return (context, anchor) => pick(context.random, casts)(context, anchor)
}

/** The casts of each sort of halt: the one of the halt of the anchor, none for another halt. */
export function byHalt(casts: ReadonlyMap<HaltType, Cast>): Cast {
    return (context, anchor) => {
        const halt = anchor?.place?.halt
        const cast = halt ? casts.get(halt) : undefined
        return cast ? cast(context, anchor) : null
    }
}

/** The sprites of some casts, one behind another: none when one of them is none. */
export function party(...casts: readonly Cast[]): Cast {
    return (context, anchor) => {
        const sprites: Sprite[] = []
        for(const cast of casts){
            const made = cast(context, anchor)
            if(!made) return null
            sprites.push(...made)
        }
        return sprites
    }
}
