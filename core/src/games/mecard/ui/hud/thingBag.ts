import type { Theme } from "../../../../engine/ui"
import type { Item } from "../../sim/item/Item"
import type { Usable } from "../../sim/usable/Usable"
import type { UnitSprites } from "../look/UnitSprites"
import { BagView } from "./BagView"
import { thingIcons } from "./thingIcons"

/** Items and usables in a bag, the same ones in one picture. None when there is nothing to put in it. */
export function thingBag(
    theme: Theme, sprites: UnitSprites, items: readonly Item[], usables: readonly Usable[],
): BagView|null {
    const icons = thingIcons(theme, sprites, items, usables)
    return icons.length > 0 ? new BagView(theme, icons, sprites.bag) : null
}
