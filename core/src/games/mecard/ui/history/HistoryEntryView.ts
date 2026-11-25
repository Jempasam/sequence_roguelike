import { Box } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import type { ClipboardPort } from "../../../../platform"
import type { HistoryEntry } from "../../sim/save/historySave"
import { loadedHeroes } from "../../sim/save/runSave"

import type { Detail } from "../hud/Detail"
import type { FloorBorders } from "../look/borders"
import type { UnitSprites } from "../look/UnitSprites"
import type { Wood } from "../look/wood"
import { borderedFrame } from "./BorderedFrame"
import { entryHeader } from "./EntryHeader"
import { floorTypeOf } from "./historyFormat"
import type { Medal } from "./historyOrder"
import { partyRow } from "./PartyRow"
import { routeStrip } from "./RouteStrip"

/** What a game of the history is drawn with. */
export interface EntryContext {
    readonly theme: Theme
    readonly sprites: UnitSprites
    readonly borders: FloorBorders

    /** The clipboard the seeds are copied to, none when it has none. */
    readonly clipboard: ClipboardPort|null
}

/** A game of the history as drawn, which opens out and folds up without being drawn again. */
export interface EntryView {
    readonly root: Component

    /** Is it opened out? */
    readonly opened: boolean

    /** What its route tells when hovered, nothing while it is folded up. */
    readonly details: readonly Detail[]

    /** Open it out, or fold it up. */
    setOpened(opened: boolean): void
}

/**
 * A game of the history: its header in a wooden frame, in the frame of the floor it ended on, and, once
 * opened out, the way the party took across the map and the cards of its heroes. The body is made the first
 * time it is opened, then kept: opening and folding only take it out of the frame and put it back.
 *
 * @param changed - Called once the game opened out or folded up, for the hover to be read again.
 */
export function historyEntryView(
    context: EntryContext, wood: Wood|null, entry: HistoryEntry, medals: readonly Medal[], opened: boolean,
    changed: () => void,
): EntryView {
    const { theme, sprites, borders, clipboard } = context
    const floor = floorTypeOf(entry)
    const frame = borderedFrame(theme, wood, floor ? borders.of(floor.look) : null)
    const heroes = loadedHeroes(entry.heroes)
    let body: Box|null = null
    let routeDetails: readonly Detail[] = []
    let isOpened = false
    let listening = false
    const header = entryHeader({
        theme, sprites, entry, heroes, medals, opened, clipboard, toggle: () => view.setOpened(!isOpened),
    })
    frame.content.add(header.view)
    const view: EntryView = {
        root: frame.root,
        get opened(){ return isOpened },
        get details(){ return isOpened ? [...header.details, ...routeDetails] : header.details },
        setOpened(open: boolean){
            if(open === isOpened) return
            isOpened = open
            header.foldLabel.text = open ? "-" : "+"
            if(!open){
                if(body) frame.content.remove(body)
                if(listening) changed()
                return
            }
            if(!body){
                body = new Box("column", { gap: 3, align: "stretch" })
                if(entry.route){
                    const route = routeStrip(theme, sprites, entry.route)
                    body.add(route.view, { align: "center" })
                    routeDetails = route.details
                }
                body.add(partyRow(theme, sprites, heroes))
            }
            frame.content.add(body)
            if(listening) changed()
        },
    }
    if(opened) view.setOpened(true)
    listening = true
    return view
}
