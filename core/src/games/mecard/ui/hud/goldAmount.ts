import type { Painter, Sprite } from "../../../../engine/gpu"
import type { Color } from "../../../../engine/math"
import { Box, Component, Label, sizeHint } from "../../../../engine/ui"
import type { SizeHint, Theme } from "../../../../engine/ui"
import { TEXT_OUTLINE } from "../look/theme"
import type { UnitSprites } from "../look/UnitSprites"

/** The side of the square the gold coin is drawn in, in virtual pixels. */
const COIN_SIDE = 12

/** The gold coin, shrunk to a square of {@link COIN_SIDE}: drawn smaller than its picture. */
class Coin extends Component {


    constructor(private readonly sprite: Sprite|null){
        super()
    }


    protected computeHint(): SizeHint {
        return this.sprite ? sizeHint(COIN_SIDE, COIN_SIDE) : sizeHint(0, 0)
    }

    protected paint(painter: Painter): void {
        const { sprite } = this
        if(!sprite) return
        painter.translate((this.bounds.width - COIN_SIDE) / 2, (this.bounds.height - COIN_SIDE) / 2)
        painter.scale(COIN_SIDE / sprite.width)
        painter.sprite(sprite, sprite.originX, sprite.originY)
    }
}

/**
 * An amount of gold: the number outlined in black, then the gold coin. Before the sprites are loaded, the
 * coin is missing, and the screen draws it again once they are.
 */
export function goldAmount(theme: Theme, sprites: UnitSprites, amount: number, color: Color): Component {
    const row = new Box("row", { gap: 1, align: "center" })
    row.add(new Label(theme, `${amount}`, { color, outline: TEXT_OUTLINE }))
    row.add(new Coin(sprites.gold))
    return row
}
