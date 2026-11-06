/** The space around the zones of the battle screen, in virtual pixels. */
export const MARGIN = 4

/** The space between two zones of the battle screen, in virtual pixels. */
export const GAP = 3

/** The share of the width of the interface each side column takes: the middle one takes the rest. */
const SIDE_SHARE = 0.29

/** How wide each side column is for an interface of a width, in virtual pixels. */
export function sideWidth(width: number): number {
    return Math.floor(width * SIDE_SHARE)
}

/** A rectangle of the interface, in virtual pixels. */
export interface UiRect {
    readonly left: number
    readonly top: number
    readonly right: number
    readonly bottom: number
}

/** How tall the rows under the map are, in virtual pixels: what they show sets it. */
export interface BattleRows {
    readonly chain: number
    readonly hand: number
    readonly info: number

    /** How tall the usables above the journal are, none when the unit selected carries none. */
    readonly usables: number
}

/** Where each zone of the battle screen lies. */
export interface BattleGrid {
    /** The stats of the unit selected. */
    readonly stats: UiRect

    /** What the unit selected carries to use, between the stats and the journal. */
    readonly usables: UiRect

    /** What happened lately. */
    readonly journal: UiRect

    /** The arena. */
    readonly map: UiRect

    /** The units in the order they play. */
    readonly units: UiRect

    /** The chain of the unit selected. */
    readonly chain: UiRect

    /** The hand of the unit selected. */
    readonly hand: UiRect

    /** The decks of the unit selected. */
    readonly decks: UiRect

    /** What tells about what the pointer hovers. */
    readonly info: UiRect
}

/**
 * Lay out the battle screen, in three columns, the two on the sides of the same width:
 *
 * ```
 * stats    map    units
 * usables  map    units
 * journal  chain  units
 * journal  hand   decks
 * journal  info   info
 * ```
 *
 * The rows under the map keep the height they ask for, and the first one takes what they leave.
 *
 * @param width - The size of the interface, in virtual pixels.
 */
export function battleGrid(width: number, height: number, rows: BattleRows): BattleGrid {
    const side = sideWidth(width)
    const firstRight = MARGIN + side
    const lastLeft = width - MARGIN - side
    const middleLeft = firstRight + GAP
    const middleRight = lastLeft - GAP
    const bottom = height - MARGIN
    const infoTop = bottom - rows.info
    const handBottom = infoTop - GAP
    const handTop = handBottom - rows.hand
    const chainBottom = handTop - GAP
    const chainTop = chainBottom - rows.chain
    const mapBottom = Math.max(MARGIN, chainTop - GAP)
    const usablesTop = mapBottom - rows.usables
    const statsBottom = rows.usables > 0 ? Math.max(MARGIN, usablesTop - GAP) : mapBottom
    return {
        stats: { left: MARGIN, top: MARGIN, right: firstRight, bottom: statsBottom },
        usables: { left: MARGIN, top: rows.usables > 0 ? statsBottom + GAP : mapBottom, right: firstRight, bottom: mapBottom },
        journal: { left: MARGIN, top: chainTop, right: firstRight, bottom },
        map: { left: middleLeft, top: MARGIN, right: middleRight, bottom: mapBottom },
        units: { left: lastLeft, top: MARGIN, right: width - MARGIN, bottom: chainBottom },
        chain: { left: middleLeft, top: chainTop, right: middleRight, bottom: chainBottom },
        hand: { left: middleLeft, top: handTop, right: middleRight, bottom: handBottom },
        decks: { left: lastLeft, top: handTop, right: width - MARGIN, bottom: handBottom },
        info: { left: middleLeft, top: infoTop, right: width - MARGIN, bottom },
    }
}
