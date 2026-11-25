import { Color } from "../../../../engine/math"
import { Box, Button, Image, Label, NineSlice, Panel, Paragraph, WrapBox } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import type { ClipboardPort } from "../../../../platform"
import type { Hero } from "../../sim/run/Hero"
import type { HistoryEntry } from "../../sim/save/historySave"

import { Detail } from "../hud/Detail"
import { engineColor } from "../look/colors"
import { CHOSEN_TEXT, DIM_TEXT } from "../look/theme"
import type { UnitSprites } from "../look/UnitSprites"
import { floorBadge } from "./FloorBadge"
import { epitaph, floorTypeOf, formatDate, formatGold, formatSeed, formatStep } from "./historyFormat"
import { medalName } from "./historyOrder"
import type { Medal } from "./historyOrder"
import { partyHeads } from "./PartyHeads"

/** What the header of a game needs, and what it does. */
export interface EntryHeaderOptions {
    readonly theme: Theme
    readonly sprites: UnitSprites
    readonly entry: HistoryEntry

    /** The heroes of the game, as they stood. */
    readonly heroes: readonly Hero[]
    readonly medals: readonly Medal[]

    /** Is the game opened out? */
    readonly opened: boolean

    /** Open it out, or fold it up. */
    readonly toggle: () => void

    /** The clipboard the seed is copied to, none when it has none. */
    readonly clipboard: ClipboardPort|null
}

/** A header, and the label of its fold button, which says whether the game is opened out. */
export interface EntryHeaderView {
    readonly view: Component
    readonly foldLabel: Label

    /** What its parts tell when hovered. */
    readonly details: readonly Detail[]
}

/** The words of the button that copies a seed, and of the same once it did. */
const COPY_TEXT = "Copier"
const COPIED_TEXT = "Copiée"

/** The colors of a pill, and of the pill of a medal. */
const PILL = new Color(0.16, 0.1, 0.06)
const MEDAL_PILL = new Color(0.45, 0.33, 0.08)

/** The padding of a pill around what it holds, and the space between what it holds. */
const PILL_PADDING = 2
const PILL_GAP = 3

/** A small dark box around a few things on a row: one fact of a game. */
function pill(theme: Theme, color: Color, ...parts: readonly Component[]): Component {
    const box = new Panel(theme, {
        background: NineSlice.flat(theme.white, color), padding: PILL_PADDING, interactive: false,
    })
    const row = new Box("row", { gap: PILL_GAP, align: "center" })
    for(const part of parts) row.add(part)
    box.content = row
    return box
}

/** The button that copies a seed to the clipboard. */
function copyButton(theme: Theme, clipboard: ClipboardPort, seed: number): Component {
    const copied = new Label(theme, COPY_TEXT)
    const copy = new Button(theme, copied)
    copy.onActivate = () => {
        clipboard.write(String(seed)).then(() => { copied.text = COPIED_TEXT }, () => {})
    }
    return copy
}

/** The facts of a game, each in its own pill: when, how much gold, which seed, which version of the game. */
function facts(options: EntryHeaderOptions): Component {
    const { theme, sprites, entry, clipboard } = options
    const row = new WrapBox({ gap: 3 })
    row.add(pill(theme, PILL, new Label(theme, formatDate(entry), { color: DIM_TEXT })))
    const coin = sprites.gold
    const gold = new Label(theme, formatGold(entry), { color: DIM_TEXT })
    row.add(pill(theme, PILL, ...coin ? [new Image(coin), gold] : [gold]))
    const seed = new Label(theme, formatSeed(entry), { color: DIM_TEXT })
    row.add(pill(theme, PILL, ...clipboard ? [seed, copyButton(theme, clipboard, entry.seed)] : [seed]))
    if(entry.gameVersion) row.add(pill(theme, PILL, new Label(theme, `v${entry.gameVersion}`, { color: DIM_TEXT })))
    return row
}

/** The name of the floor, with its picture on its left when there is one, and what the floor is on hover. */
function floorTitle(options: EntryHeaderOptions, details: Detail[]): Component {
    const { theme, sprites, entry } = options
    const floor = floorTypeOf(entry)
    const title = new Panel(theme, { background: null, padding: 0 })
    const row = new Box("row", { gap: 3, align: "center" })
    const sprite = floor ? sprites.thing(floor.icon) : null
    if(sprite) row.add(new Image(sprite))
    row.add(new Label(theme, entry.floor, { color: CHOSEN_TEXT }))
    title.content = row
    if(floor) details.push(Detail.on(title, [floor.name, " : ", floor.description]))
    return title
}

/** Where the party fell: the step, and the number of the floor on a badge of its color. */
function where(options: EntryHeaderOptions): Component {
    const { theme, entry } = options
    const row = new Box("row", { gap: 3, align: "center" })
    const step = formatStep(entry)
    if(step) row.add(new Label(theme, step, { color: DIM_TEXT }))
    const floor = floorTypeOf(entry)
    if(entry.floorNumber !== undefined && floor){
        row.add(floorBadge(theme, entry.floorNumber, engineColor(floor.look.color)))
    }
    return row
}

/**
 * The head of a game of the history, shown folded up as well. On the left, from top to bottom: the floor,
 * the sentence that tells how it ended, and its facts, one pill each. Then the heads of the party, and on the
 * right the step and the number of the floor, with the medals under them. What a game did not tell is
 * left out.
 */
export function entryHeader(options: EntryHeaderOptions): EntryHeaderView {
    const { theme, sprites, entry, heroes, medals, opened, toggle } = options
    const row = new Box("row", { gap: 4, align: "center" })
    // THE FOLD BUTTON //
    const foldLabel = new Label(theme, opened ? "-" : "+")
    const fold = new Button(theme, foldLabel)
    fold.onActivate = toggle
    row.add(fold)
    // WHAT HAPPENED //
    const left = new Box("column", { gap: 3, align: "stretch" })
    const details: Detail[] = []
    left.add(floorTitle(options, details), { align: "start" })
    const saying = epitaph(entry)
    if(saying) left.add(new Paragraph(theme, saying, { color: DIM_TEXT }))
    left.add(facts(options))
    row.add(left, { grow: 1 })
    // THE PARTY //
    row.add(partyHeads(sprites, heroes))
    // WHERE //
    const right = new Box("column", { gap: 3, align: "end" })
    right.add(where(options))
    for(const medal of medals){
        right.add(pill(theme, MEDAL_PILL, new Label(theme, medalName(medal), { color: CHOSEN_TEXT })))
    }
    row.add(right)
    return { view: row, foldLabel, details }
}
