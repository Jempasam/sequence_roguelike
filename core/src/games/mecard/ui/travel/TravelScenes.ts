import { AssetError } from "../../../../engine/assets"
import type { Assets } from "../../../../engine/assets"
import { Sprite, Texture } from "../../../../engine/gpu"
import type { Gpu } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { NineSlice, Parallax } from "../../../../engine/ui"
import type { ParallaxAxes } from "../../../../engine/ui"
import type { Visual } from "../../sim/base/Visual"
import { PNJ_HATS, PNJ_ITEMS, PNJ_MASKS } from "../../sim/halt/PnjHats"
import type { PnjHatLook } from "../../sim/halt/PnjHats"
import type { ScenePnj, SceneLook } from "../../sim/halt/SceneLook"

import { borderSlice } from "../look/borders"
import { engineColor } from "../look/colors"
import { parallaxSource, pathOf } from "../look/visualPath"
import { loadParallaxPictures } from "./parallaxPictures"
import type { LayerRange, ParallaxPictures, SceneRanges } from "./parallaxPictures"
import { Pnj } from "../pnj/Pnj"
import { PnjActor } from "../pnj/PnjActor"
import { PNJ_SHRINK, PnjRig } from "../pnj/PnjRig"
import { PixelArtActor } from "../pnj/PixelArtActor"
import { PixelArtPnj } from "../pnj/PixelArtPnj"
import { PixelArtView } from "../pnj/PixelArtView"
import { PnjView } from "../pnj/PnjView"
import type { PnjAccessory, PnjPointer } from "../pnj/PnjView"

export type { LayerRange, SceneRanges } from "./parallaxPictures"

/** How far the layers of the scenes of the journey follow the pointer, in virtual pixels, where their painting does not say. */
export const SCENE_DEPTHS: SceneRanges = {
    x: { far: 20, near: 85 },
    y: { far: 20, near: 40 },
}

/** How strongly the layers of the scenes of the journey bend as they move: not at all. */
export const SCENE_WARPS: SceneRanges = {
    x: { far: 0, near: 0 },
    y: { far: 0, near: 0 },
}

/** The value of a layer, by its rank among a count, the farthest first: from far to near, on each axis. */
export function rangedOf(index: number, count: number, ranges: SceneRanges): ParallaxAxes {
    const share = index / Math.max(1, count - 1)
    const along = ({ far, near }: LayerRange) => far + (near - far) * share
    return { x: along(ranges.x), y: along(ranges.y) }
}

/** The hue the coloration of a visual gives every layer it is drawn with, none for none. */
export function tintOf(visual: Visual): Color|null {
    const coloration = visual.coloration
    return coloration ? new Color(...coloration) : null
}

/** The color of a place, for what is drawn in its hue: its coloration, its own color where it has none. */
export function placeColorOf(visual: Visual): Color {
    return new Color(...(visual.coloration ?? visual.color))
}

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
    readonly pnj: PnjView|PixelArtView|null
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
    character: PnjRig|PixelArtPnj|null

    /** Done once its loading ended, whether it succeeded, failed or was dropped. */
    loading: Promise<void>
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

        /** Tell the players what could not be read of the settings of a scene. */
        public readonly report: (text: string) => void,

        /** How far the layers follow the pointer, where their painting does not say. */
        public readonly depths: SceneRanges = SCENE_DEPTHS,

        /** How strongly the layers bend, where their painting does not say. */
        public readonly warps: SceneRanges = SCENE_WARPS,
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

    /** Start loading the scene of a halt before it is shown, `failed` called if it could not be, done once it ended. */
    public loadHalt(look: SceneLook, failed: (error: AssetError) => void): Promise<void> {
        if(this.#halt?.look !== look){
            this.#release(this.#halt)
            this.#halt = this.#ask(look, () => {}, failed)
        }
        return this.#halt.loading
    }

    /** Start loading the scene of the map of a floor before it is shown, as {@link loadHalt} does. */
    public loadMap(look: SceneLook, failed: (error: AssetError) => void): Promise<void> {
        if(this.#map?.look !== look){
            this.#release(this.#map)
            this.#map = this.#ask(look, () => {}, failed)
        }
        return this.#map.loading
    }

    /** Is the scene of the map of a floor loaded? */
    public hasMap(look: SceneLook): boolean {
        return this.#map?.look === look && this.#map.scene !== null
    }

    /** Let the textures of the scene of the halt go, once it is left: the next visit loads its own. */
    public releaseHalt(): void {
        this.#release(this.#halt)
        this.#halt = null
    }

    /** Let every scene go: one still loading is freed when it arrives, as it is no longer held. */
    public dispose(): void {
        this.releaseHalt()
        this.#release(this.#map)
        this.#map = null
    }


    #map: Kept|null = null
    #halt: Kept|null = null

    /** Start loading a scene, to be held at once: what is loaded waits for its pictures, so comes after. */
    #ask(look: SceneLook, loaded: () => void, failed: (error: AssetError) => void): Kept {
        const kept: Kept = { look, scene: null, textures: [], character: null, loading: Promise.resolve() }
        kept.loading = this.#load(kept, loaded, failed)
        return kept
    }

    /** Is a scene asked for still the one held for its place? */
    #holds(kept: Kept): boolean {
        return this.#map === kept || this.#halt === kept
    }

    async #load(kept: Kept, loaded: () => void, failed: (error: AssetError) => void): Promise<void> {
        const { look } = kept
        const paths = [pathOf(look.border)]
        const worn = wornLooks(look.pnj)
        for(const piece of worn) if(piece) paths.push(pathOf(piece.path))
        let pictures
        let backdrop: ParallaxPictures
        let character: PnjRig|PixelArtPnj|null
        try {
            [pictures, backdrop, character] = await Promise.all([
                Promise.all(paths.map(path => this.assets.image(path))),
                loadParallaxPictures(this.assets, parallaxSource(look.parallax)),
                this.#loadCharacter(look.pnj),
            ])
        } catch(error){
            if(!(error instanceof AssetError)) throw error
            failed(error)
            return
        }
        if(!this.#holds(kept)){
            character?.dispose()
            return
        }
        kept.character = character
        kept.textures = pictures.map(picture => Texture.fromPixels(this.gpu, picture))
        // What the character wears came last, in the order of `worn`: taken off the scene's own pictures.
        const wornTextures = kept.textures.splice(kept.textures.length - worn.filter(Boolean).length)
        const accessories = worn.map(piece => piece ? { texture: wornTextures.shift()!, look: piece } : null)
        const [border] = kept.textures
        for(const warning of backdrop.warnings) this.report(warning)
        // The ranges of the painting, else those of the journey.
        const depths = backdrop.ranges.depth ?? this.depths
        const warps = backdrop.ranges.warp ?? this.warps
        const layers = backdrop.layers.map(layer => ({ ...layer, texture: Texture.fromPixels(this.gpu, layer.pixels) }))
        kept.textures.push(...layers.map(layer => layer.texture))
        kept.scene = {
            backdrop: new Parallax(layers.map((layer, index) => ({
                sprite: Sprite.whole(layer.texture),
                // What the painting sets for a layer, else its share of the ranges.
                depth: layer.depth ?? rangedOf(index, layers.length, depths),
                warp: layer.warp ?? rangedOf(index, layers.length, warps),
                ...layer.place && { place: layer.place },
            })), {
                tint: tintOf(look.parallax),
                opaque: true,
                ...backdrop.viewport && { viewport: backdrop.viewport },
            }),
            border: borderSlice(border),
            pnj: character && look.pnj ? this.#pnjView(character, look.pnj, accessories, depths) : null,
        }
        for(const accessory of accessories) if(accessory) kept.textures.push(accessory.texture)
        loaded()
    }

    /** Load the character of a scene, from its unit when it says one, else from its painting. */
    #loadCharacter(look: ScenePnj|undefined): Promise<PnjRig|PixelArtPnj|null> {
        if(!look) return Promise.resolve(null)
        if(look.unit) return PixelArtPnj.load(this.gpu, this.assets, look.unit)
        return PnjRig.load(this.gpu, this.assets, look.painting, PNJ_SHRINK)
    }

    /**
     * The view of the character of a halt, a little left of the middle, wearing what it says.
     *
     * @param accessories - Its hat, its mask and its object, as {@link wornLooks} lists them, none for one it
     * does not wear.
     */
    #pnjView(
        character: PnjRig|PixelArtPnj, look: ScenePnj,
        accessories: readonly (Worn|null)[], depths: SceneRanges,
    ): PnjView|PixelArtView {
        const options = {
            centerShare: PNJ_CENTER,
            pointer: this.pointer,
            depth: { x: depths.x.near, y: depths.y.near },
            interactive: false,
        }
        const clothes = look.clothes && engineColor(look.clothes)
        let view: PnjView|PixelArtView
        if(character instanceof PixelArtPnj){
            character.clothes = clothes
            view = new PixelArtView(new PixelArtActor(character), options)
        } else {
            const pnj = new Pnj(character)
            pnj.clothes = clothes
            view = new PnjView(new PnjActor(pnj), options)
        }
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
        kept?.character?.dispose()
    }
}
