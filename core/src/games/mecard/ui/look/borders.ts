import type { Assets } from "../../../../engine/assets"
import { Sprite, Texture } from "../../../../engine/gpu"
import type { Gpu } from "../../../../engine/gpu"
import { NineSlice } from "../../../../engine/ui"
import type { FloorType } from "../../sim/floor/Floor"
import type { SceneLook } from "../../sim/halt/SceneLook"

import { pathOf } from "./visualPath"

/** How many virtual pixels a pixel of the frame of a scene takes: how thick it is drawn. */
export const BORDER_SCALE = 2

/** The frame of a scene, cut from its picture in three by three equal parts, drawn over the interface. */
export function borderSlice(texture: Texture): NineSlice {
    const side = Math.floor(texture.width / 3)
    const end = Math.floor(texture.height / 3)
    const across = side * BORDER_SCALE
    const down = end * BORDER_SCALE
    return new NineSlice(Sprite.whole(texture), { left: side, right: side, top: end, bottom: end }, {
        border: { left: across, right: across, top: down, bottom: down },
    })
}

/**
 * The frames of the floors, loaded once and kept: what the screens that lay a floor around something draw
 * with, apart from the scenes of the journey, which load their own.
 */
export class FloorBorders {


    /** Is every frame loaded? */
    public get loaded(): boolean { return this.#ready }

    /** The frame of a look, none before they are loaded, or for a look whose picture could not be. */
    public of(look: SceneLook): NineSlice|null {
        return this.#slices.get(pathOf(look.border)) ?? null
    }

    /** Call something once the frames are loaded: at once when they already are. */
    public whenLoaded(listener: () => void): void {
        if(this.#ready) listener()
        else this.#listeners.push(listener)
    }

    /** Load the frame of every floor. A picture that cannot be loaded leaves its floor without a frame. */
    public async load(gpu: Gpu, assets: Assets, floors: readonly FloorType[]): Promise<void> {
        const paths = [...new Set(floors.map(floor => pathOf(floor.look.border)))]
        await Promise.all(paths.map(async path => {
            try {
                const texture = Texture.fromPixels(gpu, await assets.image(path))
                this.#slices.set(path, borderSlice(texture))
            } catch{
                return
            }
        }))
        this.#ready = true
        for(const listener of this.#listeners.splice(0)) listener()
    }


    readonly #slices = new Map<string, NineSlice>()
    readonly #listeners: (() => void)[] = []
    #ready = false
}
