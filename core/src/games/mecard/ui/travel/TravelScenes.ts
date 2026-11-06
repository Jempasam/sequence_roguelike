import { AssetError } from "../../../../engine/assets"
import type { Assets } from "../../../../engine/assets"
import { Sprite, Texture } from "../../../../engine/gpu"
import type { Gpu } from "../../../../engine/gpu"
import { NineSlice, Parallax } from "../../../../engine/ui"
import { PNJ_HATS, PNJ_ITEMS, PNJ_MASKS } from "../../sim/halt/PnjHats"
import type { PnjHatLook } from "../../sim/halt/PnjHats"
import type { ScenePnj, SceneLook } from "../../sim/halt/SceneLook"

import { engineColor } from "../look/colors"
import { Pnj } from "../pnj/Pnj"
import { PnjActor } from "../pnj/PnjActor"
import { PNJ_SHRINK, PnjRig } from "../pnj/PnjRig"
import { PnjView } from "../pnj/PnjView"
import type { PnjAccessory, PnjPointer } from "../pnj/PnjView"

/** How far the farthest and the nearest layers of a scene follow the pointer, in virtual pixels. */
const FAR_DEPTH = 5
const NEAR_DEPTH = 48

/** Where the feet of the character of a halt stand along the width: a little left of the middle. */
const PNJ_CENTER = 0.42

/**
 * What is drawn of a place: its parallax behind the panels, its character before the parallax, and its
 * frame over them.
 */
export interface TravelScene {
    readonly backdrop: Parallax
    readonly border: NineSlice

    /** The character standing there, none where nobody stands. */
    readonly pnj: PnjView|null
}

/** Something worn or carried, its picture loaded, and how its look says to draw it. */
interface Worn {
    readonly texture: Texture
    readonly look: PnjHatLook
}

/** What a character wears and carries, in the order of its hat, its mask and its object, none for the missing. */
function wornLooks(pnj: ScenePnj|undefined): readonly (PnjHatLook|null)[] {
    if(!pnj) return [null, null, null]
    return [
        pnj.hat ? PNJ_HATS[pnj.hat] : null,
        pnj.mask ? PNJ_MASKS[pnj.mask] : null,
        pnj.item ? PNJ_ITEMS[pnj.item] : null,
    ]
}

/** A scene asked for: none while it loads, or when it could not be. */
interface Kept {
    readonly look: SceneLook
    scene: TravelScene|null
    textures: Texture[]
    rig: PnjRig|null
}

/**
 * The scenes of the journey, loaded from their pictures and their characters when first asked for: that of
 * the map of one floor and that of one halt at a time, asking for another letting the textures of the last
 * one go.
 *
 * @remarks
 * A scene that cannot be loaded is not drawn, the panels lying on their own color, and its failure is
 * told. Only the tests run without the pictures, whose paths are checked when the game compiles.
 */
export class TravelScenes {


    constructor(
        public readonly gpu: Gpu,
        public readonly assets: Assets,

        /** Where the characters read the pointer from, to look at it and move with the parallax. */
        public readonly pointer: PnjPointer,
    ){}


    /**
     * The scene of the map of a floor, none while it loads: loading starts at the first ask, and `loaded` is
     * called once it is done, if the scene is still wanted, `failed` if it could not be.
     */
    public mapScene(
        look: SceneLook, loaded: () => void, failed: (error: AssetError) => void,
    ): TravelScene|null {
        if(this.#map?.look === look) return this.#map.scene
        this.#release(this.#map)
        this.#map = this.#ask(look, loaded, failed)
        return null
    }

    /** The scene of a halt, none while it loads, as {@link mapScene} tells. */
    public haltScene(
        look: SceneLook, loaded: () => void, failed: (error: AssetError) => void,
    ): TravelScene|null {
        if(this.#halt?.look === look) return this.#halt.scene
        this.#release(this.#halt)
        this.#halt = this.#ask(look, loaded, failed)
        return null
    }


    #map: Kept|null = null
    #halt: Kept|null = null

    /** Start loading a scene, to be held at once: what is loaded waits for its pictures, so comes after. */
    #ask(look: SceneLook, loaded: () => void, failed: (error: AssetError) => void): Kept {
        const kept: Kept = { look, scene: null, textures: [], rig: null }
        void this.#load(kept, loaded, failed)
        return kept
    }

    /** Is a scene asked for still the one held for its place? */
    #holds(kept: Kept): boolean {
        return this.#map === kept || this.#halt === kept
    }

    async #load(kept: Kept, loaded: () => void, failed: (error: AssetError) => void): Promise<void> {
        const { look } = kept
        const paths = [look.border, ...look.layers]
        const worn = wornLooks(look.pnj)
        for(const piece of worn) if(piece) paths.push(piece.path)
        let pictures
        let rig: PnjRig|null
        try {
            [pictures, rig] = await Promise.all([
                Promise.all(paths.map(path => this.assets.image(path))),
                look.pnj ? PnjRig.load(this.gpu, this.assets, look.pnj.painting, PNJ_SHRINK) : null,
            ])
        } catch(error){
            if(!(error instanceof AssetError)) throw error
            failed(error)
            return
        }
        if(!this.#holds(kept)){
            rig?.dispose()
            return
        }
        kept.rig = rig
        kept.textures = pictures.map(picture => Texture.fromPixels(this.gpu, picture))
        // What the character wears came last, in the order of `worn`: taken off the scene's own pictures.
        const wornTextures = kept.textures.splice(kept.textures.length - worn.filter(Boolean).length)
        const accessories = worn.map(piece => piece ? { texture: wornTextures.shift()!, look: piece } : null)
        const [border, ...layers] = kept.textures
        const count = layers.length
        const side = Math.floor(border.width / 3)
        const end = Math.floor(border.height / 3)
        const across = side * look.borderScale
        const down = end * look.borderScale
        kept.scene = {
            backdrop: new Parallax(layers.map((texture, index) => ({
                sprite: Sprite.whole(texture),
                depth: Math.round(FAR_DEPTH + (NEAR_DEPTH - FAR_DEPTH) * index / Math.max(1, count - 1)),
            }))),
            border: new NineSlice(Sprite.whole(border), { left: side, right: side, top: end, bottom: end }, {
                border: { left: across, right: across, top: down, bottom: down },
            }),
            pnj: rig && look.pnj ? this.#pnjView(rig, look.pnj, accessories) : null,
        }
        for(const accessory of accessories) if(accessory) kept.textures.push(accessory.texture)
        loaded()
    }

    /**
     * The view of the character of a halt, a little left of the middle, wearing what it says.
     *
     * @param accessories - Its hat, its mask and its object, as {@link wornLooks} lists them, none for one it
     * does not wear.
     */
    #pnjView(rig: PnjRig, look: ScenePnj, accessories: readonly (Worn|null)[]): PnjView {
        const pnj = new Pnj(rig)
        pnj.clothes = look.clothes && engineColor(look.clothes)
        const view = new PnjView(new PnjActor(pnj), {
            centerShare: PNJ_CENTER, pointer: this.pointer, depth: NEAR_DEPTH, interactive: false,
        })
        const [hat, mask, item] = accessories
        const accessoryOf = (worn: Worn|null): PnjAccessory|null => worn && {
            sprite: Sprite.whole(worn.texture), size: worn.look.size, anchor: worn.look.anchor,
        }
        view.hat = accessoryOf(hat)
        view.hatColor = look.hatColor && engineColor(look.hatColor)
        view.mask = accessoryOf(mask)
        view.maskColor = look.maskColor && engineColor(look.maskColor)
        view.item = accessoryOf(item)
        view.itemColor = look.itemColor && engineColor(look.itemColor)
        return view
    }

    #release(kept: Kept|null): void {
        for(const texture of kept?.textures ?? []) texture.dispose()
        kept?.rig?.dispose()
    }
}
