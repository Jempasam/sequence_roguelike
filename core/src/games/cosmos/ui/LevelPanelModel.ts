import type { Space } from "../space/Space"

/** A level of the chain, as the panel shows it. */
export interface PanelRow {

    /** The name of the level, for the player. */
    readonly label: string

    /** The width of the view in the units of the level. */
    readonly view: number

    /** The size of one unit of the level, in the units of the level above. */
    readonly scale: number

    /** The position in the level. */
    readonly position: readonly [number, number, number]

    /** Is this the level the zoom has reached? */
    readonly current: boolean

    /** The zoom at which a unit of the level fills the view: where the level starts on the gauge. */
    readonly zoom: number
}

/** What the panel on the right shows: the levels crossed, and the zoom. */
export interface PanelModel {

    /** The levels from the whole to the current one. */
    readonly rows: readonly PanelRow[]

    /** The zoom now, as how many powers of ten the view is narrower than a unit of the whole. */
    readonly zoom: number
}

/** Read the panel off the chain of a space. */
export function panelModel(space: Space): PanelModel {
    const sizes = space.viewSizes()
    let size = 1
    const rows = space.chain.map((step, i): PanelRow => {
        size *= step.pose.scale
        const { x, y, z } = step.pose.position
        return {
            label: step.level.label,
            view: sizes[i],
            scale: step.pose.scale,
            position: [x, y, z],
            current: i === space.chain.length - 1,
            zoom: -Math.log10(size),
        }
    })
    return { rows, zoom: -Math.log10(sizes[0]) }
}
