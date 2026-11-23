import { Box, Panel } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import { paperBordered } from "../look/paper"
import { CHOSEN_TEXT } from "../look/theme"
import type { UnitSprites } from "../look/UnitSprites"
import { Detail } from "./Detail"
import { goldAmount } from "./goldAmount"

/** How far the tag of a price lies over what is sold, in virtual pixels. */
const TAG_OVERLAP = 8

/** The width of the paper border of the tag of a price, in virtual pixels. */
const TAG_BORDER = 8

/** What is told of a good for sale: its price, then what it is. */
export function saleText(price: number, told: Text|null): Text {
    return told === null ? `${price} or` : concat(`${price} or`, " · ", told)
}

/** A good for sale: what is sold, over its price in gold. */
export function forSale(theme: Theme, sprites: UnitSprites, price: number, sold: Component): Component {
    const column = new Box("column", { gap: -TAG_OVERLAP, align: "center" })
    column.add(sold)
    const paper = sprites.paper
    const tag = new Panel(theme, {
        background: paper ? paperBordered(paper, TAG_BORDER) : null,
        padding: Math.ceil((TAG_BORDER + 1) / 2),
    })
    tag.content = goldAmount(theme, sprites, price, CHOSEN_TEXT)
    column.add(tag)
    return column
}

/**
 * What a good for sale tells while the pointer is over it. Over a part of what is sold, such as a card, it
 * is what that part tells; over what is sold elsewhere, what it tells of itself; over the rest of the good,
 * its price, then what it tells of itself.
 *
 * @param option - The component that holds the pointer for the good, such as the option of a choice.
 * @param sold - What is sold, as {@link forSale} was given it.
 * @param told - What it tells of itself, none when it tells nothing.
 * @param parts - What its parts tell, as {@link detailsOfParts} finds them.
 */
export function saleDetail(
    option: Component, sold: Component, price: number, told: Text|null, parts: readonly Detail[],
): Detail {
    return Detail.on(option, saleText(price, told), [Detail.on(sold, told, parts)])
}
