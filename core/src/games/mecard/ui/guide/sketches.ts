import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Box, Component, EMPTY_HINT, Label, NineSlice, Panel, Stack, WrapBox, sizeHint } from "../../../../engine/ui"
import type { SizeHint, Theme } from "../../../../engine/ui"

import { CHOSEN_TEXT, DIM_TEXT } from "../look/theme"

//// The round, in six steps ////

/** The steps of a round, in order, as the guide names them. */
const ROUND_STEPS: readonly string[] = [
    "Pioche", "Préparation", "Fin de préparation", "Révélation", "Exécution", "Fin de round",
]

/** The six steps of a round, numbered, side by side, going to the next line when the room is short. */
export function roundTimeline(theme: Theme): Component {
    const wrap = new WrapBox({ gap: 3 })
    ROUND_STEPS.forEach((step, index) => {
        const panel = new Panel(theme, { padding: 2 })
        const row = new Box("row", { gap: 2, align: "center" })
        row.add(new Label(theme, `${index + 1}`, { color: CHOSEN_TEXT }))
        row.add(new Label(theme, step))
        panel.content = row
        wrap.add(panel)
    })
    return wrap
}

//// The map, in a sketch ////

/** The size of a token of the sketch of a map, and the space between its columns and rows, in pixels. */
const TOKEN = 16
const MAP_COLUMN = 56
const MAP_ROW = 26
const MAP_MARGIN = 4

/** A place of the sketch: its letter, its color, and where it lies, as a column and a row. */
interface MapPlace {
    readonly letter: string
    readonly color: Color
    readonly column: number
    readonly row: number
}

const FIGHT_COLOR = new Color(0.75, 0.3, 0.25)
const HALT_COLOR = new Color(0.3, 0.55, 0.8)
const BOSS_COLOR = new Color(0.5, 0.2, 0.55)
const PATH_COLOR = new Color(0.8, 0.35, 0.3)

/** The places of the sketch, and the paths between them: they never cross, and fights and halts alternate. */
const MAP_PLACES: readonly MapPlace[] = [
    { letter: "C", color: FIGHT_COLOR, column: 0, row: 0 },
    { letter: "C", color: FIGHT_COLOR, column: 0, row: 1 },
    { letter: "H", color: HALT_COLOR, column: 1, row: 0 },
    { letter: "C", color: FIGHT_COLOR, column: 1, row: 1 },
    { letter: "B", color: BOSS_COLOR, column: 2, row: 0.5 },
]
const MAP_PATHS: readonly (readonly [number, number])[] = [[0, 2], [1, 3], [2, 4], [3, 4]]

/** Where the middle of a place of the sketch lies, from the top left of the sketch. */
function centerOf({ column, row }: MapPlace): readonly [number, number] {
    return [MAP_MARGIN + TOKEN / 2 + column * MAP_COLUMN, MAP_MARGIN + TOKEN / 2 + row * MAP_ROW]
}

/** The paths of a sketch of a map, drawn under its places. */
class MapPaths extends Component {


    constructor(public readonly theme: Theme){
        super()
    }


    protected computeHint(): SizeHint {
        return EMPTY_HINT
    }

    protected paint(painter: Painter): void {
        painter.push()
        painter.setWhitePixel(this.theme.white)
        painter.setTint(PATH_COLOR)
        for(const [from, to] of MAP_PATHS){
            const [fromX, fromY] = centerOf(MAP_PLACES[from])
            const [toX, toY] = centerOf(MAP_PLACES[to])
            painter.thickLine({ x: fromX, y: fromY }, { x: toX, y: toY }, 2)
        }
        painter.pop()
    }
}

/**
 * A map of three columns in a sketch: fights (C), a halt (H) and the boss (B), joined by paths that never
 * cross.
 */
export function mapSketch(theme: Theme): Component {
    const stack = new Stack()
    stack.fixedSize = {
        width: 2 * MAP_COLUMN + TOKEN + 2 * MAP_MARGIN, height: MAP_ROW + TOKEN + 2 * MAP_MARGIN,
    }
    stack.add(new MapPaths(theme), { x: "stretch", y: "stretch" })
    for(const place of MAP_PLACES){
        const [x, y] = centerOf(place)
        const token = new Panel(theme, {
            background: NineSlice.flat(theme.white, place.color), padding: 0, interactive: false,
        })
        token.fixedSize = { width: TOKEN, height: TOKEN }
        const letter = new Box("row", { align: "center" })
        letter.add(new Box("row"), { grow: 1 })
        letter.add(new Label(theme, place.letter, { color: CHOSEN_TEXT }))
        letter.add(new Box("row"), { grow: 1 })
        token.content = letter
        stack.add(token, { x: "start", y: "start", offsetX: x - TOKEN / 2, offsetY: y - TOKEN / 2 })
    }
    return stack
}

//// The arena, in a sketch ////

/** How many virtual pixels a metre of the sketch of the arena is. */
const METRE = 14

/** The size of a cell of the sketch of the arena, in virtual pixels. */
const CELL_WIDTH = 70
const CELL_HEIGHT = 58

const FLOOR_COLOR = new Color(0.12, 0.11, 0.17)
const UNIT_COLOR = new Color(0.35, 0.6, 1)
const ZONE_COLOR = new Color(1, 0.45, 0.35, 0.6)
const ARROW_COLOR = new Color(1, 1, 1)

/** What a unit hits, drawn from its middle, facing an angle in radians, clockwise since `y` is down. */
export type Zone = (painter: Painter, x: number, y: number, facing: number) => void

/** A slice of a disk in front of the unit: a sweep. */
export function sector(radius: number, spread: number): Zone {
    return (painter, x, y, facing) => {
        painter.arc(x, y, radius * METRE, facing - spread / 2, facing + spread / 2)
    }
}

/** A band straight ahead: a thrust, a shot. */
export function band(length: number, width: number): Zone {
    return (painter, x, y, facing) => {
        const direction = { x: Math.cos(facing), y: Math.sin(facing) }
        const end = { x: x + direction.x * length * METRE, y: y + direction.y * length * METRE }
        painter.thickLine({ x, y }, end, width * METRE)
    }
}

/** A disk all around the unit. */
export function ring(radius: number): Zone {
    return (painter, x, y) => painter.circle(x, y, radius * METRE)
}

/** One unit on a floor, an arrow for where it faces, and what it hits. */
class ArenaScene extends Component {


    constructor(
        public readonly theme: Theme,

        /** Where the unit faces, in radians, clockwise from the right. */
        public readonly facing: number,

        public readonly zone: Zone,
    ){
        super()
    }


    protected computeHint(): SizeHint {
        return sizeHint(CELL_WIDTH, CELL_HEIGHT)
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        const x = Math.round(width / 2 - 8 * Math.cos(this.facing))
        const y = Math.round(height / 2 - 8 * Math.sin(this.facing))
        painter.push()
        painter.clip(0, 0, width, height)
        painter.setWhitePixel(this.theme.white)
        painter.setTint(FLOOR_COLOR)
        painter.rect(0, 0, width, height)
        painter.setTint(ZONE_COLOR)
        this.zone(painter, x, y, this.facing)
        painter.setTint(UNIT_COLOR)
        painter.circle(x, y, 5)
        // The arrow of where the unit faces, from its edge.
        painter.setTint(ARROW_COLOR)
        const tip = { x: x + 9 * Math.cos(this.facing), y: y + 9 * Math.sin(this.facing) }
        painter.thickLine({ x: x + 5 * Math.cos(this.facing), y: y + 5 * Math.sin(this.facing) }, tip, 2)
        painter.pop()
    }
}

/** A scene of the sketch: how the unit faces, what it hits, and what is written under it. */
export interface ArenaCell {
    readonly facing: number
    readonly zone: Zone
    readonly caption: string
}

/** Scenes of the arena side by side, each with its caption under it. */
export function arenaSketch(theme: Theme, cells: readonly ArenaCell[]): Component {
    const row = new Box("row", { gap: 6, align: "start" })
    for(const { facing, zone, caption } of cells){
        const column = new Box("column", { gap: 2, align: "center" })
        column.add(new ArenaScene(theme, facing, zone))
        column.add(new Label(theme, caption, { color: DIM_TEXT, align: "center" }))
        row.add(column)
    }
    return row
}
