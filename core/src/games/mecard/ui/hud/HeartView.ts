import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Box, Component, sizeHint } from "../../../../engine/ui"
import type { SizeHint, Theme } from "../../../../engine/ui"
import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import { HEART } from "../../sim/base/keywords"
import type { Heart } from "../../sim/heart/Heart"

import { heartColorOf, LIT_EDGE } from "../look/colors"

/** The height of a heart, in virtual pixels. */
const HEART_HEIGHT = 5

/** The width of a heart, in virtual pixels. */
const HEART_WIDTH = 3

/** The space between two hearts, in virtual pixels. */
const HEART_GAP = 1

/** The face of an empty heart, inside its edge in the color of its kind. */
const EMPTY = new Color(0.17, 0.1, 0.06)

/**
 * A heart of a unit in the color of its kind; an empty one only its edge, dark inside. It tells when the
 * pointer comes over it or leaves, so the interface says what the heart is.
 */
export class HeartView extends Component {


    /** What the pointer coming over it or leaving does, nothing when none. */
    public onHover: ((over: boolean) => void)|null = null

    /** The color of the edge it is outlined in while it is looked at, none when it is not. */
    public edge: Color|null = null

    constructor(
        public readonly theme: Theme,
        public readonly heart: Heart,
    ){
        super()
    }


    protected computeHint(): SizeHint {
        return sizeHint(HEART_WIDTH, HEART_HEIGHT)
    }

    /** Hit by the pointer, so its hover is told. */
    protected override get interactive(): boolean { return true }

    protected override hoverChanged(): void {
        this.onHover?.(this.hovered)
    }

    protected paint(painter: Painter): void {
        const { kind, isEmpty } = this.heart
        painter.push()
        painter.setWhitePixel(this.theme.white)
        const top = Math.floor((this.bounds.height - HEART_HEIGHT) / 2)
        if(this.edge){
            painter.setTint(this.edge)
            painter.rect(-1, top - 1, HEART_WIDTH + 2, HEART_HEIGHT + 2)
        }
        painter.setTint(heartColorOf(kind))
        painter.rect(0, top, HEART_WIDTH, HEART_HEIGHT)
        if(isEmpty){
            painter.setTint(EMPTY)
            painter.rect(1, top + 1, HEART_WIDTH - 2, HEART_HEIGHT - 2)
        }
        painter.pop()
    }
}

/** What a heart is, for the player: its kind in its color, whether it is empty, and what it does. */
export function heartText(heart: Heart): Text {
    return concat(HEART, " ", heart, " : ", heart.kind.description)
}

/**
 * Hearts in a row, each telling when the pointer comes over it or leaves: wherever they show, in the
 * panels or over the arena.
 *
 * @param lit - The places of the hearts being looked at, none by default.
 * @param edge - The color they are outlined in.
 */
export function heartsRow(
    theme: Theme, hearts: readonly Heart[], onHover: (heart: Heart, over: boolean) => void,
    lit: readonly number[] = [], edge: Color = LIT_EDGE,
): Box {
    const row = new Box("row", { gap: HEART_GAP })
    hearts.forEach((heart, index) => {
        const view = new HeartView(theme, heart)
        view.onHover = over => onHover(heart, over)
        view.edge = lit.includes(index) ? edge : null
        row.add(view)
    })
    return row
}
