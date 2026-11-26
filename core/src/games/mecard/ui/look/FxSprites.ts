import { Sprite } from "../../../../engine/gpu"
import { visual } from "../../sim/base/Visual"
import type { Visual } from "../../sim/base/Visual"

import type { FxAnimation } from "./fxAnimation"
import type { SpriteLook, SpriteTag } from "./spriteLook"
import { fxKey } from "./visualPath"

/** What the pictures of the blows are read from: the sprites of the screen. */
export interface FxSource {
    /** The sprite a key names, none before they are loaded. */
    of(visual: Visual|null): Sprite|null

    /** The file of data of the picture a key names. */
    look(visual: Visual|null): SpriteLook
}

/** How a blow is shown: by a picture and the way it plays, or drawn from its area when none fits. */
export type FxResolved =
    | {
        readonly kind: "sprite"

        /** The key, under `fx/`, of the picture found. */
        readonly key: string
        readonly sprite: Sprite
        readonly animation: FxAnimation

        /** How far down the chain it was found: 0 for the picture of the first tag of the target. */
        readonly rank: number
    }
    | {
        readonly kind: "vector"

        /** How many candidates were tried in vain. */
        readonly rank: number
    }

/** What a blow with no look is drawn as. */
export const VECTOR_FX: FxResolved = { kind: "vector", rank: 0 }

/**
 * Find how a blow is shown, from the most specific picture to the most general: `<name>_<tag>` for each tag
 * of the target, then `<name>`, then the area itself. A picture without an animation plays that of the
 * picture `<name>`, so a variant only has to be drawn. It never fails: the area is the last resort.
 *
 * @param looks - What the pictures of the blows are read from.
 * @param blow - How the blow looks, none when it has no look of its own.
 * @param tags - What the sprite of the unit hit says of it, none for a unit like any other.
 */
export function resolveFx(looks: FxSource, blow: Visual|null, tags: readonly SpriteTag[]): FxResolved {
    if(blow === null) return VECTOR_FX
    const name = blow.visual
    const candidates = [...tags.map(tag => `${name}_${tag}`), name]
    const general = looks.look(visual(fxKey(name))).animation
    for(let rank = 0; rank < candidates.length; rank++){
        const key = candidates[rank]
        const named = visual(fxKey(key))
        const sprite = looks.of(named)
        const animation = looks.look(named).animation ?? general
        if(sprite !== null && animation !== null) return { kind: "sprite", key, sprite, animation, rank }
    }
    return { kind: "vector", rank: candidates.length }
}

/** The frames of the pictures cut so far, each picture once. */
const FRAMES = new WeakMap<Sprite, Sprite[]>()

/**
 * One frame of a picture holding several side by side, cut once and kept.
 *
 * @param frames - How many frames the picture holds.
 * @param index - Which one, from the left.
 */
export function frameSprite(sprite: Sprite, frames: number, index: number): Sprite {
    if(frames <= 1) return sprite
    let cut = FRAMES.get(sprite)
    if(!cut){
        cut = []
        FRAMES.set(sprite, cut)
    }
    const width = Math.floor(sprite.width / frames)
    cut[index] ??= new Sprite(sprite.texture, sprite.x + index * width, sprite.y, width, sprite.height)
    return cut[index]
}
