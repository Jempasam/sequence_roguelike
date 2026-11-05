import { Texture } from "../gpu"

import { PagedAtlas } from "./PagedAtlas"

/**
 * An atlas whose pages are plain textures: what sprites, tiles and UI are drawn from.
 *
 * @remarks
 * ```ts
 * const atlas = new Atlas(gpu, { padding: 1, initialSize: 256 })
 * const goblin = atlas.add(goblinPixels, { origin: [8, 16] })
 * painter.sprite(atlas.sprite(goblin), x, y)
 * ```
 */
export class Atlas extends PagedAtlas<Texture> {


    protected newPage(width: number, height: number): Texture {
        return new Texture(this.gpu, width, height)
    }
}
