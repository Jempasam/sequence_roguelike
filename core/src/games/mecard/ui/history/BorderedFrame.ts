import { Box, NineSlice, Panel } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"

import { FRAME_THICKNESS } from "../look/wood"
import type { Wood } from "../look/wood"

/** A wooden frame, lying in the frame of a floor when it has one, and what lies inside the wood. */
export interface BorderedFrame {
    /** What to lay in the interface. */
    readonly root: Component

    /** Where to put what the frame holds. */
    readonly content: Box
}

/**
 * A wooden frame in the frame of a floor, a column to fill inside it.
 *
 * @param wood - The wood, none while it is not loaded: the frame of the theme is then drawn.
 * @param border - The frame of the floor, none to leave the wood alone.
 */
export function borderedFrame(theme: Theme, wood: Wood|null, border: NineSlice|null): BorderedFrame {
    const content = new Box("column", { gap: 3, align: "stretch" })
    const planks = new Panel(theme, { background: wood?.frame, padding: FRAME_THICKNESS + 1 })
    planks.content = content
    if(!border) return { root: planks, content }
    const outer = new Panel(theme, { background: border, padding: border.border.left, interactive: false })
    outer.content = planks
    return { root: outer, content }
}
