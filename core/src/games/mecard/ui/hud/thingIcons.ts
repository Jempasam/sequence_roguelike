import type { Theme } from "../../../../engine/ui"
import { described, usableText } from "../../sim/halt/subs/shown"
import type { Item } from "../../sim/item/Item"
import type { Usable } from "../../sim/usable/Usable"
import type { UnitSprites } from "../look/UnitSprites"
import { AbsItemIcon, THING_ICON_SIZE } from "./AbsItemIcon"
import { countText, countTold, stacked, stackUsesText } from "./stacks"

/** The picture of an item, with how many there are over it when several, and what it does on hover. */
export function itemIcon(theme: Theme, sprites: UnitSprites, item: Item, count = 1): AbsItemIcon {
    const icon = new AbsItemIcon(theme, sprites, item.icon, countText(count) ?? "", 1, THING_ICON_SIZE)
    icon.detail = countTold(described(item, item), count)
    return icon
}

/**
 * The picture of a usable, with its uses over it and what it does on hover.
 *
 * @param count - How many there are of it.
 * @param left - The charges left of all of them added, all their charges by default.
 */
export function usableIcon(
    theme: Theme, sprites: UnitSprites, usable: Usable, count = 1, left = count * (usable.charges ?? 1),
): AbsItemIcon {
    const full = count * (usable.charges ?? 1)
    const icon = new AbsItemIcon(
        theme, sprites, usable.icon, stackUsesText(usable, left, full) ?? "", 1, THING_ICON_SIZE,
    )
    icon.detail = countTold(usableText(usable), count)
    return icon
}

/** The pictures of items, the same ones in one. */
export function itemIcons(theme: Theme, sprites: UnitSprites, items: readonly Item[]): AbsItemIcon[] {
    return stacked(items, item => item).map(({ first, members }) => {
        return itemIcon(theme, sprites, first, members.length)
    })
}

/** The pictures of usables, the same ones in one. */
export function usableIcons(theme: Theme, sprites: UnitSprites, usables: readonly Usable[]): AbsItemIcon[] {
    return stacked(usables, usable => usable).map(({ first, members }) => {
        return usableIcon(theme, sprites, first, members.length)
    })
}

/** The pictures of items, then of usables, the same ones in one. */
export function thingIcons(
    theme: Theme, sprites: UnitSprites, items: readonly Item[], usables: readonly Usable[],
): AbsItemIcon[] {
    return [...itemIcons(theme, sprites, items), ...usableIcons(theme, sprites, usables)]
}
