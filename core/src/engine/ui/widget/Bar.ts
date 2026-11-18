import type { Painter } from "../../gpu"
import { Color } from "../../math"

import { Component } from "../Component"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"

/** A plain bar of one color, of a fixed size: a line that sets things apart. It takes no input. */
export class Bar extends Component {


    constructor(
        /** Its width, in virtual pixels. */
        public readonly width: number,

        /** Its height, in virtual pixels. */
        public readonly height: number,

        /** Its color, white by default. */
        color: Readonly<Color> = new Color(1, 1, 1),
    ){
        super()
        this.#color = new Color(color.r, color.g, color.b, color.a)
    }


    protected computeHint(): SizeHint {
        return sizeHint(this.width, this.height, this.width, this.height)
    }

    protected override get interactive(): boolean {
        return false
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        painter.push()
        painter.setBlend("alpha")
        painter.setTint(this.#color)
        painter.rect(0, 0, width, height)
        painter.pop()
    }


    readonly #color: Color
}
