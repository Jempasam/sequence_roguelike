import { Color } from "../../../../engine/math"
import { Box, Image, NineSlice, Panel } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import type { Text } from "../../../../semantic"
import { fightTypeById } from "../../sim/catalog/fightTypes"
import { haltById } from "../../sim/catalog/halts"
import type { FightType } from "../../sim/fight/FightType"
import type { HaltType } from "../../sim/halt/HaltType"
import type { SavedRoute, SavedRouteLayer } from "../../sim/save/historySave"

import { Detail } from "../hud/Detail"
import type { UnitSprites } from "../look/UnitSprites"

/** The colors of the marks of a row not crossed, of a fight and of a halt crossed, and of the fall. */
const LEFT = new Color(0.28, 0.25, 0.3)
const FIGHT = new Color(0.9, 0.45, 0.35)
const HALT = new Color(0.45, 0.75, 0.95)
const FALL = new Color(1, 0.15, 0.15)

/** How big a mark without a picture is, around its center, and how thick the red frame of the fall is. */
const MARK_PADDING = 4
const FALL_FRAME = 2

/** The way a route is shown: the row of its marks, and what each of them tells when hovered. */
export interface RouteView {
    readonly view: Component
    readonly details: readonly Detail[]
}

/** The type of a catalog id, none for an id the catalog no longer has. */
function known<T>(lookup: (id: string) => T, id: string|undefined): T|null {
    if(id === undefined) return null
    try {
        return lookup(id)
    } catch{
        return null
    }
}

/** A square of a color: the mark of a row that has no picture. */
function square(theme: Theme, color: Color, padding: number): Component {
    const mark = new Panel(theme, {
        background: NineSlice.flat(theme.white, color), padding, interactive: false,
    })
    mark.content = new Box("row")
    return mark
}

/** What a place of the route tells: its fight and its halt, and whether the party fell there. */
function placeText(fight: FightType|null, halt: HaltType|null, fell: boolean): Text {
    const parts: Text[] = []
    if(fight) parts.push(fight.name, " : ", fight.description)
    if(fight && halt) parts.push(" ")
    if(halt) parts.push(halt.name, " : ", halt.description)
    if(fell) parts.push(" Le groupe est tombé ici.")
    return parts
}

/** The mark of a row: the picture of its place when the party crossed it and the sprites are there. */
function markOf(
    theme: Theme, sprites: UnitSprites, layer: SavedRouteLayer, fight: FightType|null, halt: HaltType|null,
): Component {
    if(!layer.taken) return square(theme, LEFT, MARK_PADDING)
    const icon = fight?.icon ?? halt?.icon ?? null
    const sprite = icon ? sprites.thing(icon) : null
    if(sprite) return new Image(sprite)
    return square(theme, layer.kind === "fight" ? FIGHT : HALT, MARK_PADDING)
}

/**
 * The way the party took across the map of a floor, a row at a time: the picture of the place of each row
 * it crossed, a dim mark for each it did not, and a red frame on the row it fell on. A crossed row tells its
 * fight and its halt when hovered.
 */
export function routeStrip(theme: Theme, sprites: UnitSprites, route: SavedRoute): RouteView {
    const row = new Box("row", { gap: 4, align: "center" })
    const details: Detail[] = []
    route.layers.forEach((layer, index) => {
        const fight = known(fightTypeById, layer.fight)
        const halt = known(haltById, layer.halt)
        const fell = index === route.fallAt
        const cell = new Panel(theme, {
            background: fell ? NineSlice.flat(theme.white, FALL) : null, padding: fell ? FALL_FRAME : 0,
        })
        cell.content = markOf(theme, sprites, layer, fight, halt)
        row.add(cell)
        if(fight || halt || fell) details.push(Detail.on(cell, placeText(fight, halt, fell)))
    })
    return { view: row, details }
}
