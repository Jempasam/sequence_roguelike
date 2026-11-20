import { Box, Image } from "../../../../engine/ui"
import type { Component } from "../../../../engine/ui"
import type { Visual } from "../../sim/base/Visual"
import type { UnitSprites } from "../look/UnitSprites"

/**
 * What stands for a unit in a panel, its sprite on the left of what tells about it: its name, its hearts,
 * its cards. The content alone while the sprites are not loaded, or for a unit with none.
 *
 * @param sprite - The name of its sprite, none for a unit with none.
 */
export function withPicture(
    sprites: UnitSprites, sprite: Visual|null, content: Component, gap = 2, grow = 0,
    onPicture?: (image: Image) => void,
): Component {
    const picture = sprites.of(sprite)
    if(!picture) return content
    const row = new Box("row", { gap, align: "center" })
    const image = new Image(picture)
    onPicture?.(image)
    row.add(image)
    row.add(content, { grow })
    return row
}
