import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Box, Component, sizeHint } from "../../../../engine/ui"
import type { SizeHint, Theme } from "../../../../engine/ui"
import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import type { Process } from "../../sim/process/Process"

import { LIT_EDGE } from "../look/colors"
import type { UnitSprites } from "../look/UnitSprites"

/** The size of the icon of a process, in virtual pixels. */
const ICON_SIZE = 7

/** The space between two icons, in virtual pixels. */
const ICON_GAP = 1

/**
 * A process going on for a unit: its icon, or a square in its color until the icons are loaded. It tells
 * when the pointer comes over it or leaves, so the interface says what the process is.
 */
export class ProcessView extends Component {


    /** What the pointer coming over it or leaving does, nothing when none. */
    public onHover: ((over: boolean) => void)|null = null

    /** Is it being looked at? */
    public lit = false

    constructor(
        public readonly theme: Theme,
        public readonly sprites: UnitSprites,
        public readonly process: Process,
    ){
        super()
    }


    protected computeHint(): SizeHint {
        return sizeHint(ICON_SIZE, ICON_SIZE)
    }

    /** Hit by the pointer, so its hover is told. */
    protected override get interactive(): boolean { return true }

    protected override hoverChanged(): void {
        this.onHover?.(this.hovered)
    }

    protected paint(painter: Painter): void {
        const top = Math.floor((this.bounds.height - ICON_SIZE) / 2)
        const icon = this.sprites.icon(this.process.icon)
        painter.push()
        if(this.lit){
            painter.setWhitePixel(this.theme.white)
            painter.setTint(LIT_EDGE)
            painter.rect(-1, top - 1, ICON_SIZE + 2, ICON_SIZE + 2)
        }
        if(icon) painter.sprite(icon, 0, top)
        else {
            const { r, g, b } = this.process.color
            painter.setWhitePixel(this.theme.white)
            painter.setTint(new Color(r, g, b))
            painter.rect(1, top + 1, ICON_SIZE - 2, ICON_SIZE - 2)
        }
        painter.pop()
    }
}

/** What a process is, for the player. */
export function processText(process: Process): Text {
    return concat("Processus ", process, " : jusqu'à la fin du round.")
}

/**
 * The processes of a unit in a row, each telling when the pointer comes over it or leaves.
 *
 * @param lit - The process being looked at, none by default.
 */
export function processRow(
    theme: Theme, sprites: UnitSprites, processes: readonly Process[],
    onHover: (process: Process, over: boolean) => void, lit: Process|null = null,
): Box {
    const row = new Box("row", { gap: ICON_GAP })
    for(const process of processes){
        const view = new ProcessView(theme, sprites, process)
        view.onHover = over => onHover(process, over)
        view.lit = process === lit
        row.add(view)
    }
    return row
}
