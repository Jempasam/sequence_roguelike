import { internals } from "./Component"
import type { ComponentHost } from "./Component"
import { Stack } from "./layout/Stack"

/** How a layer is set up. */
export interface LayerOptions {
    /**
     * Does it draw into a texture of its own, kept while it does not change? False by default: it then
     * shares the texture of the layers next to it with none of their own, drawn again whenever one of
     * them changes. A layer that changes rarely, over one that changes every frame, wants one.
     */
    readonly texture?: boolean
}

/**
 * A plane of the interface over the whole texture: the menus and the HUD, the popups, the debug panels.
 * The layers draw in the order the game created them, and take the pointer in the reverse order.
 *
 * @remarks
 * Its content is a {@link Stack} that draws nothing of its own, so what it covers is what its children
 * cover. A layer is modal while one of its children is: nothing below takes the pointer, the focus stays
 * within it, and a press outside its children is consumed and told to them, so a menu can close.
 *
 * A popup is never the child of what opens it, whose clip would cut it: it opens in a layer, at a position
 * in coordinates of the texture.
 */
export class Layer {


    /** What the layer shows, given the whole texture. */
    public readonly content = new Stack()

    /** Does it draw into a texture of its own? */
    public readonly hasOwnTexture: boolean

    /** Built by `UiRoot.addLayer`. */
    constructor(
        /** The name the game gave it, unique in its interface. */
        public readonly name: string,

        host: ComponentHost,

        options: LayerOptions = {},
    ){
        this.hasOwnTexture = options.texture ?? false
        internals.setLayerHost(this.content, host)
    }


    /** Does it hold the input, since one of its children shown is modal? */
    public get modal(): boolean {
        if(!this.content.visible) return false
        for(const child of this.content.children) if(child.visible && internals.isModal(child)) return true
        return false
    }

    /** Does it show anything? */
    public get isEmpty(): boolean {
        if(!this.content.visible) return true
        for(const child of this.content.children) if(child.visible) return false
        return true
    }
}
