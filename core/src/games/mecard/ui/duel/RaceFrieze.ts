import type { Painter, Sprite } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import type { NineSlice, Rope } from "../../../../engine/ui"
import type { TextLayout } from "../../../../engine/text"
import { RED_HEART } from "../../sim/heart/subs/RedHeartKind"
import { heartColorOf } from "../look/colors"

/** One player on a frieze. */
export interface FriezeEntry {
    readonly id: string

    /** The color of its line or of its dot, a faded one for a player that is out. */
    readonly color: Color

    /** How far it went, from 0 (the start) to 1 (the end of what is shown). */
    readonly ratio: number

    /** The text above its frieze, none when empty: written in its color. */
    readonly top: string

    /** The text under its frieze, none when empty: written in its color. */
    readonly bottom: string

    /** The lives it has left, shown under its frame as full hearts. */
    readonly lives: number

    /** The lives it started with, shown as hearts, those lost empty: 0 for none to show. */
    readonly maxLives: number
}

/**
 * How the players are laid out: `"columns"` has a small frame for each, its vertical line crossed by its cursor,
 * and `"track"` has one frame with a horizontal line and a dot for each.
 */
export type FriezeLayout = "columns"|"track"

/** The room a frieze is drawn in, in virtual pixels, and what its texts take of its height. */
export interface FriezeBox {
    readonly width: number
    readonly height: number

    /** How much of the height the text above takes, 0 for none. */
    readonly top: number

    /** How much of the height the text under takes, 0 for none. */
    readonly bottom: number

    /** The height under the frames, out of their paper, for the lives: 0 for none. */
    readonly lives: number
}

/** What a frieze is drawn with. */
export interface FriezeLook {
    /** The white pixel of the theme, which the cursors are cut from. */
    readonly white: Sprite

    /** The line of the paths of the map, the lines of the frieze are drawn with, none before it loads. */
    readonly rope: Rope|null

    /** The small frame of paper each frieze lies on. */
    readonly card: NineSlice

    /** The small text of the frames. */
    readonly text: TextLayout

    /** The color of the limits between floors. */
    readonly ink: Color
}

/** Where a frame lies across a frieze. */
export interface FriezeCard {
    readonly x: number
    readonly width: number
}

/** Where a mark lies on a frieze, in virtual pixels from its top left. */
export interface FriezeMark {
    readonly x: number
    readonly y: number
}

/** The widest a frame of a column is, in virtual pixels: a frame is as wide as it can be, not as the room is. */
export const COLUMN_CARD_MAX = 34

/** The widest the frame of the track is. */
export const TRACK_CARD_MAX = 120

/** The room between two frames. */
const CARD_GAP = 2

/** The room between a frame and what it holds, in virtual pixels. */
export const CARD_PAD = 8

/** The room kept at each end of the track inside its frame. */
const TRACK_PAD = 8

/** How thick the lines are drawn, as the thin paths of the map are, in virtual pixels: the line and the limits. */
const ROPE_WIDTH = 2
const TICK_WIDTH = 1

/** How far apart dots that overlap are put, in virtual pixels. */
const LANES = [0, -5, 5, -10, 10] as const

/** How near a dot the pointer must be to be over it, in virtual pixels. */
const DOT_REACH = 4

/** How wide the whole of the frames is, with the room between them, in virtual pixels. */
export function friezeGroupWidth(layout: FriezeLayout, count: number): number {
    if(layout === "track") return TRACK_CARD_MAX
    return Math.max(0, count) * COLUMN_CARD_MAX + Math.max(0, count - 1) * CARD_GAP
}

/**
 * Where the frames lie across a width: one for each of the columns, as wide as can be up to their maximum and
 * the group centered, or the one of the track, centered.
 */
export function friezeCards(layout: FriezeLayout, count: number, width: number): FriezeCard[] {
    if(count <= 0) return []
    if(layout === "track"){
        const card = Math.min(TRACK_CARD_MAX, width)
        return [{ x: Math.floor((width - card) / 2), width: card }]
    }
    const card = Math.max(1, Math.min(COLUMN_CARD_MAX, Math.floor((width - CARD_GAP * (count - 1)) / count)))
    const total = card * count + CARD_GAP * (count - 1)
    const left = Math.floor((width - total) / 2)
    return Array.from({ length: count }, (_, index) => ({ x: left + index * (card + CARD_GAP), width: card }))
}

/** The color of a heart of the lives. */
const HEART_COLOR = heartColorOf(RED_HEART)

/** How wide a heart of the lives is with the space beside it, and how tall with the space under it. */
const HEART_STEP = 4
const HEART_ROW = 6
const HEART_WIDTH = 3
const HEART_HEIGHT = 5

/** The room between the frame and the hearts under it. */
const HEARTS_GAP = 3

/** The face of an empty heart, inside its edge. */
const EMPTY_HEART = new Color(0.17, 0.1, 0.06)

/** How many hearts a row holds under a frame, at least one. */
function heartsPerRow(card: FriezeCard): number {
    return Math.max(1, Math.floor((card.width + 1) / HEART_STEP))
}

/**
 * The height the lives of the entries take under their frames: 0 when the layout has none or none has any,
 * else as many rows as the player with the most lives needs.
 */
export function friezeLivesHeight(layout: FriezeLayout, entries: readonly FriezeEntry[], width: number): number {
    if(layout !== "columns") return 0
    const cards = friezeCards(layout, entries.length, width)
    let rows = 0
    entries.forEach((entry, index) => {
        if(entry.maxLives > 0) rows = Math.max(rows, Math.ceil(entry.maxLives / heartsPerRow(cards[index])))
    })
    return rows > 0 ? HEARTS_GAP + rows * HEART_ROW : 0
}

/** The top and the bottom of the line of a column in its frame. */
function lineSpan(box: FriezeBox): { top: number, bottom: number } {
    return { top: CARD_PAD + box.top, bottom: box.height - CARD_PAD - box.bottom }
}

/** Where the marks of the entries lie on a frieze: the cursor of a column on its line, the dot on the track. */
export function friezeMarks(layout: FriezeLayout, entries: readonly FriezeEntry[], box: FriezeBox): FriezeMark[] {
    const cards = friezeCards(layout, entries.length, box.width)
    if(layout === "columns"){
        const { top, bottom } = lineSpan(box)
        return entries.map((entry, index) => ({
            x: cards[index].x + Math.floor(cards[index].width / 2),
            y: Math.round(bottom - 2 - entry.ratio * (bottom - top - 4)),
        }))
    }
    const card = cards[0]
    const middle = Math.floor(box.height / 2)
    const span = card ? card.width - 2 * TRACK_PAD : 0
    const taken: { x: number, lane: number }[] = []
    return entries.map(entry => {
        const x = Math.round((card?.x ?? 0) + TRACK_PAD + entry.ratio * span)
        // The first lane, from the middle one, that no dot beside it takes.
        let lane = 0
        while(taken.some(other => other.lane === lane && Math.abs(other.x - x) < 5)) lane++
        taken.push({ x, lane })
        return { x, y: middle + LANES[lane % LANES.length] }
    })
}

/** The id of the entry under a point of a frieze, none when none is: a whole frame of a column, a dot. */
export function friezeHit(
    layout: FriezeLayout, entries: readonly FriezeEntry[], box: FriezeBox, x: number, y: number,
): string|null {
    if(y < 0 || y > box.height + box.lives || x < 0 || x > box.width) return null
    if(layout === "columns"){
        const cards = friezeCards(layout, entries.length, box.width)
        const index = cards.findIndex(card => x >= card.x && x < card.x + card.width)
        return index >= 0 ? entries[index].id : null
    }
    if(y > box.height) return null
    const marks = friezeMarks(layout, entries, box)
    for(let index = marks.length - 1; index >= 0; index--){
        if(Math.abs(x - marks[index].x) <= DOT_REACH && Math.abs(y - marks[index].y) <= DOT_REACH) return entries[index].id
    }
    return null
}

/**
 * Draw a frieze at the origin of the painter: a small frame of paper for each column, or for the track, and in
 * it the line drawn as the paths of the map are, the limits between floors, the cursors, and the texts.
 * Only the cursor of the player hovered grows.
 *
 * @param ticks - Where the limits between floors lie, as shares of the line from 0 to 1.
 */
export function paintFrieze(
    painter: Painter, look: FriezeLook, layout: FriezeLayout, entries: readonly FriezeEntry[], box: FriezeBox,
    hovered: string|null, ticks: readonly number[] = [],
): void {
    const cards = friezeCards(layout, entries.length, box.width)
    const marks = friezeMarks(layout, entries, box)
    const { top, bottom } = lineSpan(box)
    const { rope, text } = look
    painter.push()
    painter.setWhitePixel(look.white)
    for(const card of cards) look.card.draw(painter, card.x, 0, card.width, box.height)
    const line = (ax: number, ay: number, bx: number, by: number, thickness: number): void => {
        const from = { x: ax, y: ay }
        const to = { x: bx, y: by }
        if(rope) rope.draw(painter, from, to, thickness)
        else painter.thickLine(from, to, Math.max(1, Math.round(thickness / 2)))
    }
    if(layout === "track" && cards[0]){
        painter.setTint(look.ink)
        const middle = Math.floor(box.height / 2)
        line(cards[0].x + TRACK_PAD - 2, middle, cards[0].x + cards[0].width - TRACK_PAD + 2, middle, ROPE_WIDTH)
    }
    // The limits between floors, thin lines across.
    painter.setTint(look.ink)
    for(const share of ticks){
        if(layout === "columns"){
            const y = Math.round(bottom - 2 - share * (bottom - top - 4))
            for(const card of cards) line(card.x + CARD_PAD, y, card.x + card.width - CARD_PAD, y, TICK_WIDTH)
        } else if(cards[0]){
            const x = Math.round(cards[0].x + TRACK_PAD + share * (cards[0].width - 2 * TRACK_PAD))
            line(x, Math.floor(box.height / 2) - 5, x, Math.floor(box.height / 2) + 5, TICK_WIDTH)
        }
    }
    entries.forEach((entry, index) => {
        painter.setTint(entry.color)
        if(layout === "columns") line(marks[index].x, top, marks[index].x, bottom, ROPE_WIDTH)
    })
    // The hovered one last, so nothing hides its cursor.
    const order = entries.map((_, index) => index).sort((a, b) =>
        Number(entries[a].id === hovered) - Number(entries[b].id === hovered))
    for(const index of order){
        const entry = entries[index]
        const mark = marks[index]
        const over = entry.id === hovered
        painter.setTint(entry.color)
        if(layout === "columns"){
            const half = over ? 5 : 3
            painter.rect(mark.x - half, mark.y - 1, 2 * half + 1, over ? 4 : 3)
        } else {
            const radius = over ? 4 : 3
            painter.rect(mark.x - radius + 1, mark.y - radius, 2 * radius - 1, 2 * radius + 1)
            painter.rect(mark.x - radius, mark.y - radius + 1, 2 * radius + 1, 2 * radius - 1)
        }
    }
    if(layout === "columns" && box.lives > 0){
        // The lives lie under the frames, on the tab itself: full hearts, then the empty ones of those lost.
        entries.forEach((entry, index) => {
            const card = cards[index]
            const perRow = heartsPerRow(card)
            for(let heart = 0; heart < entry.maxLives; heart++){
                const row = Math.floor(heart / perRow)
                const inRow = Math.min(perRow, entry.maxLives - row * perRow)
                const x = card.x + Math.floor((card.width - (inRow * HEART_STEP - 1)) / 2) + (heart % perRow) * HEART_STEP
                const y = box.height + HEARTS_GAP + row * HEART_ROW
                painter.setTint(HEART_COLOR)
                painter.rect(x, y, HEART_WIDTH, HEART_HEIGHT)
                if(heart >= entry.lives){
                    painter.setTint(EMPTY_HEART)
                    painter.rect(x + 1, y + 1, HEART_WIDTH - 2, HEART_HEIGHT - 2)
                }
            }
        })
    }
    painter.pop()
    if(layout !== "columns") return
    // The texts of a column, above and under its line, centered on its frame.
    entries.forEach((entry, index) => {
        const card = cards[index]
        for(const [value, y] of [[entry.top, CARD_PAD], [entry.bottom, box.height - CARD_PAD - text.lineHeight]] as const){
            if(value === "") continue
            const fitted = text.fit(value, card.width - 8)
            painter.push()
            painter.setTint(entry.color)
            text.draw(painter, fitted, card.x + Math.floor((card.width - text.widthOf(fitted)) / 2), y)
            painter.pop()
        }
    })
}
