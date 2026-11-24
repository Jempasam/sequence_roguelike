import { Bar, Box, Label } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import type { Hero } from "../../sim/run/Hero"
import { allCards } from "../../sim/run/Hero"
import { DIM_TEXT } from "../look/theme"
import type { UnitSprites } from "../look/UnitSprites"
import { THING_ICON_SIZE } from "./AbsItemIcon"
import { itemIcons, usableIcons } from "./thingIcons"

/** The space between two pictures, and around a bar, in virtual pixels. */
const GAP = 3

/**
 * What a character comes with, on one row: how many cards it has when asked, then its items, then its
 * usables, as pictures, each group set apart from the one before by a vertical bar. A group it has none of
 * is left out.
 *
 * @param count - Tell how many cards it has?
 * @param bare - Tell the count alone, without the word "cartes"?
 * @returns The row, none when it has nothing to tell.
 */
export function stuffRow(
    theme: Theme, sprites: UnitSprites, hero: Hero, count: boolean, bare = false,
): Component|null {
    const groups = [
        itemIcons(theme, sprites, hero.items),
        usableIcons(theme, sprites, hero.usables.map(carried => carried.usable)),
    ].filter(group => group.length > 0)
    if(!count && groups.length === 0) return null
    const row = new Box("row", { gap: GAP, align: "center" })
    if(count){
        const total = allCards(hero).length
        row.add(new Label(theme, bare ? `${total}` : `${total} cartes`, { color: DIM_TEXT }))
    }
    for(const group of groups){
        if(count || group !== groups[0]) row.add(new Bar(1, THING_ICON_SIZE, DIM_TEXT))
        for(const icon of group) row.add(icon)
    }
    return row
}
