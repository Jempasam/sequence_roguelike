import { Color } from "../../../../engine/math"
import type { Painter } from "../../../../engine/gpu"
import { Box, Component, Image, NineSlice, Panel, sizeHint, Stack } from "../../../../engine/ui"
import type { Rope, SizeHint, Theme } from "../../../../engine/ui"
import type { Text } from "../../../../semantic"
import { fightTypeById } from "../../sim/catalog/fightTypes"
import { haltById } from "../../sim/catalog/halts"
import type { FightType } from "../../sim/fight/FightType"
import type { HaltType } from "../../sim/halt/HaltType"
import type { SavedRoute, SavedRouteLayer } from "../../sim/save/historySave"

import { Detail } from "../hud/Detail"
import { paperBordered } from "../look/paper"
import type { UnitSprites } from "../look/UnitSprites"

/** The colors of the marks of a fight and of a halt crossed, and of the fall. */
const FIGHT = new Color(0.9, 0.45, 0.35)
const HALT = new Color(0.45, 0.75, 0.95)
const FALL = new Color(1, 0.15, 0.15)

/** The color of the outline of a picture while it is hovered. */
const HOVER = new Color(1, 1, 1)

/** How big a mark without a picture is, around its center, and how thick the red frame of the fall is. */
const MARK_PADDING = 4
const FALL_FRAME = 2

/** The color and thickness of the one line behind all the marks, and how far it stops from the ends. */
const LINE = new Color(0.3, 0.2, 0.13)
const LINE_THICKNESS = 2
const LINE_INSET = 6

/** The room left for the outline of a mark, the border of the paper and the room inside it. */
const OUTLINE = 1
const PAPER_BORDER = 4
const SHEET_PADDING = 6

/**
 * The one line drawn behind the marks of a route, in the rope of the maps once it is loaded. It stops at the
 * center of the last mark crossed, or is not drawn when none was.
 */
class RouteLine extends Component {

    constructor(
        private readonly rope: Rope|null,
        private readonly row: Component,
        private readonly last: Component|null,
    ){
        super()
    }

    protected computeHint(): SizeHint {
        return sizeHint(0, LINE_THICKNESS)
    }

    protected paint(painter: Painter): void {
        if(!this.last) return
        const { height } = this.bounds
        const endX = this.row.bounds.x - this.bounds.x + this.last.bounds.x + this.last.bounds.width / 2
        const from = { x: 0, y: height / 2 }
        const to = { x: Math.max(0, endX), y: height / 2 }
        painter.setTint(LINE)
        if(this.rope) this.rope.draw(painter, from, to, LINE_THICKNESS)
        else painter.thickLine(from, to, LINE_THICKNESS)
    }
}

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

/** A square of a color: the mark of a crossed row that has no picture. */
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

/**
 * The mark of a row: the picture of its place when the party crossed it and the sprites are there, nothing
 * visible for a row not reached yet.
 */
function markOf(
    theme: Theme, sprites: UnitSprites, layer: SavedRouteLayer, fight: FightType|null, halt: HaltType|null,
): Component {
    if(!layer.taken){
        const empty = new Panel(theme, { background: null, padding: MARK_PADDING, interactive: false })
        empty.content = new Box("row")
        return empty
    }
    const icon = fight?.icon ?? halt?.icon ?? null
    const sprite = icon ? sprites.thing(icon) : null
    if(sprite) return new Image(sprite)
    return square(theme, layer.kind === "fight" ? FIGHT : HALT, MARK_PADDING)
}

/**
 * The way the party took across the map of a floor, a row at a time, on a sheet of paper: the picture of the
 * place of each row it crossed, a dim mark for each it did not, a line drawn between the marks, and a red
 * outline on the row it fell on. A crossed row tells its fight and its halt when hovered.
 */
export function routeStrip(theme: Theme, sprites: UnitSprites, route: SavedRoute): RouteView {
    const row = new Box("row", { gap: 8, align: "center" })
    const details: Detail[] = []
    let last: Component|null = null
    route.layers.forEach((layer, index) => {
        const fight = known(fightTypeById, layer.fight)
        const halt = known(haltById, layer.halt)
        const fell = index === route.fallAt
        const mark = markOf(theme, sprites, layer, fight, halt)
        const outlined = fell && mark instanceof Image
        if(outlined) mark.edge = FALL
        const framed = fell && !outlined
        const cell = new Panel(theme, {
            background: framed ? NineSlice.flat(theme.white, FALL) : null,
            padding: framed ? FALL_FRAME : OUTLINE,
        })
        cell.content = mark
        if(mark instanceof Image){
            const resting = outlined ? FALL : null
            cell.listenHoverWithin(over => { mark.edge = over ? HOVER : resting })
        }
        row.add(cell)
        if(layer.taken) last = cell
        if(fight || halt || fell) details.push(Detail.on(cell, placeText(fight, halt, fell)))
    })
    const paper = sprites.paper
    const sheet = new Panel(theme, {
        background: paper ? paperBordered(paper, PAPER_BORDER) : null, padding: SHEET_PADDING,
    })
    const layers = new Stack()
    layers.add(new RouteLine(sprites.rope, row, last), { x: "stretch", y: "center", offsetX: LINE_INSET })
    layers.add(row, { x: "stretch", y: "center" })
    sheet.content = layers
    return { view: sheet, details }
}
