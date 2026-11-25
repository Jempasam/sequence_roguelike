import type { Color } from "../../../../engine/math"
import { Box, Label, NineSlice, Panel } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"

import { CHOSEN_TEXT } from "../look/theme"

/** The padding of a badge around its number, in virtual pixels. */
const BADGE_PADDING = 3

/** A badge holding a number of a floor, on the color of the floor. */
export function floorBadge(theme: Theme, number: number, color: Color): Component {
    const badge = new Panel(theme, {
        background: NineSlice.flat(theme.white, color), padding: BADGE_PADDING, interactive: false,
    })
    const content = new Box("row", { align: "center" })
    content.add(new Label(theme, String(number), { color: CHOSEN_TEXT, outline: color, align: "center" }))
    badge.content = content
    return badge
}
