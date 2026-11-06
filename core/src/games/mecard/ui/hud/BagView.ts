import type { Assets, ImagePath } from "../../../../engine/assets"
import { Atlas } from "../../../../engine/atlas"
import type { Gpu } from "../../../../engine/gpu"
import { NineSlice, Panel, WrapBox } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"

import { ICON_SIZE } from "./ThingView"

/** The picture of a bag: leather around a slot, the slot being the repeated center. */
const BAG_PICTURE: ImagePath = "mecard/hud/bag.png"

/** The leather around the slots in the picture, in texels. */
const MARGIN = 3

/** The space around a picture inside its slot, in virtual pixels. */
const SLOT_PADDING = 4

/** How long a slot is, in virtual pixels: the picture of a thing and its padding. */
export const SLOT_SIZE = ICON_SIZE + 2 * SLOT_PADDING

/**
 * Things in a bag: a leather frame with one slot behind each picture. It grows with its things, a line of
 * slots at a time, as wide as its room lets it.
 */
export class BagView extends Panel {


    /**
     * The frame of a bag, whose slots are as long as a slot of the view.
     *
     * @throws {@link AssetError} When its picture cannot be loaded.
     */
    public static async loadFrame(gpu: Gpu, assets: Assets): Promise<NineSlice> {
        const atlas = new Atlas(gpu, { initialSize: 32 })
        const sprite = atlas.sprite(atlas.addAll([{ pixels: await assets.image(BAG_PICTURE) }])[0])
        const margins = { left: MARGIN, top: MARGIN, right: MARGIN, bottom: MARGIN }
        return NineSlice.withPeriod(sprite, margins, SLOT_SIZE, { opaqueCenter: true })
    }

    constructor(theme: Theme, things: readonly Component[], frame: NineSlice|null){
        super(theme, { background: frame, padding: frame ? frame.border.left : 0, interactive: false })
        const slots = new WrapBox({ align: "start" })
        for(const thing of things){
            const slot = new Panel(theme, { background: null, padding: SLOT_PADDING, interactive: false })
            slot.content = thing
            slots.add(slot)
        }
        this.content = slots
    }
}
