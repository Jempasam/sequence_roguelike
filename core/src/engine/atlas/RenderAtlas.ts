import { RenderTexture } from "../gpu"

import { PagedAtlas } from "./PagedAtlas"

/**
 * An atlas whose pages are render textures, so its zones can be drawn into, through a `TextureSurface` on
 * a page. Its sprites are the same as those of an `Atlas`.
 *
 * @remarks
 * Animated tiles live in one: each has a reservation, into which the current frame is copied from another
 * atlas, so a tilemap baked once animates without touching its texture coordinates. The frames are in
 * another atlas, since a surface does not read its own texture.
 */
export class RenderAtlas extends PagedAtlas<RenderTexture> {


    protected newPage(width: number, height: number): RenderTexture {
        return new RenderTexture(this.gpu, width, height)
    }
}
