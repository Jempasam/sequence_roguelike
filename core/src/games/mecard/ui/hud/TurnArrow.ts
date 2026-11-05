import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Component, sizeHint } from "../../../../engine/ui"
import type { SizeHint, Theme } from "../../../../engine/ui"

/** The height of the arrow, in virtual pixels. */
const HEIGHT = 7

/** The width of the head of the arrow, in virtual pixels. */
const HEAD = 7

const COLOR = new Color(0.55, 0.53, 0.63)

/** An arrow pointing down, between two units in the order of play: the one above plays before. */
export class TurnArrow extends Component {


    constructor(
        public readonly theme: Theme,
    ){
        super()
    }


    protected computeHint(): SizeHint {
        return sizeHint(HEAD, HEIGHT)
    }

    protected paint(painter: Painter): void {
        const middle = Math.floor(this.bounds.width / 2)
        painter.push()
        painter.setWhitePixel(this.theme.white)
        painter.setTint(COLOR)
        painter.rect(middle - 1, 0, 2, HEIGHT - 3)
        // The head, row by row, narrowing to its tip.
        for(let row = 0; row < 3; row++){
            const half = 3 - row
            painter.rect(middle - half, HEIGHT - 3 + row, 2 * half, 1)
        }
        painter.pop()
    }
}
