import type { Gpu, Painter } from "../../../engine/gpu"
import { Color } from "../../../engine/math"
import { TextLayout } from "../../../engine/text"
import { pixelFont } from "../../mecard/ui/look/pixelFont"
import type { PanelModel } from "./LevelPanelModel"

/** The width of the panel, in pixels of the screen. */
export const PANEL_WIDTH = 280
const WIDTH = PANEL_WIDTH

/** The space around the content, in pixels. */
const PADDING = 8

/** The zoom the gauge ends at. */
const GAUGE_MAX = 16

/** The height of the gauge, in pixels. */
const GAUGE_HEIGHT = 10

const BACK = new Color(0, 0, 0, 0.6)
const TEXT = new Color(0.85, 0.85, 0.9)
const CURRENT = new Color(1, 0.9, 0.4)
const GAUGE = new Color(0.25, 0.25, 0.35)
const FILL = new Color(0.4, 0.7, 1)
const TICK = new Color(0.9, 0.9, 0.5)

/** A number with 2 digits and its power of ten, short enough for a column of the panel. */
function short(value: number): string {
    if(value === 0) return "0"
    return value.toExponential(1).toUpperCase().replace("E+", "E")
}

/**
 * The panel at the right of the screen: the levels crossed, from the largest to the one the zoom has
 * reached, with the width of the view, the size and the position in each, then a gauge of the zoom with the
 * place where each level starts. It is drawn at the resolution of the screen.
 */
export class LevelPanel {

    private readonly text: TextLayout


    constructor(gpu: Gpu){
        this.text = new TextLayout(pixelFont(gpu).font, 2)
    }


    /** Draw the panel in a painter on the screen, `width` pixels wide and `height` high. */
    public draw(painter: Painter, model: PanelModel, speed: number, width: number, height: number): void {
        const left = width - WIDTH
        const line = this.text.lineHeight
        painter.setTint(BACK)
        painter.rect(left, 0, WIDTH, height)
        let y = PADDING
        const write = (text: string, color: Color): void => {
            painter.setTint(color)
            this.text.draw(painter, this.text.fit(text, WIDTH - 2 * PADDING), left + PADDING, y)
            y += line
        }
        write(`ZOOM ${model.zoom.toFixed(1)}   TEMPS ×${speed}`, CURRENT)
        y += PADDING

        // LEVELS //
        for(const row of model.rows){
            const color = row.current ? CURRENT : TEXT
            write(`${row.current ? ">" : " "} ${row.label.toUpperCase()}`, color)
            write(`  VUE ${short(row.view)}  ECH ${short(row.scale)}`, color)
            const [x, py, z] = row.position
            write(`  ${short(x)} ${short(py)} ${short(z)}`, color)
            y += PADDING / 2
        }

        // GAUGE //
        y = Math.max(y + PADDING, height - PADDING - GAUGE_HEIGHT)
        const gaugeWidth = WIDTH - 2 * PADDING
        const at = (zoom: number) => left + PADDING + Math.min(1, Math.max(0, zoom / GAUGE_MAX)) * gaugeWidth
        painter.setTint(GAUGE)
        painter.rect(left + PADDING, y, gaugeWidth, GAUGE_HEIGHT)
        painter.setTint(FILL)
        painter.rect(left + PADDING, y, at(model.zoom) - left - PADDING, GAUGE_HEIGHT)
        painter.setTint(TICK)
        for(const row of model.rows) painter.rect(at(row.zoom), y - 3, 2, GAUGE_HEIGHT + 6)
    }
}
