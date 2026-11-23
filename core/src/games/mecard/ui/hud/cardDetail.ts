import { Rect } from "../../../../engine/ui"
import type { Text } from "../../../../semantic"
import type { Card } from "../../sim/card/Card"
import { cardText } from "../../sim/halt/subs/shown"

import type { CardView } from "./CardView"
import { Detail } from "./Detail"
import type { DetailLook } from "./Detail"

/**
 * What a card shown tells while the pointer is over it, and what each card it holds tells while the pointer
 * is over that one, at every depth: a fusion tells about itself, and about each of its cards where they are
 * drawn, which is what the text is about.
 *
 * @remarks
 * The card is read when the pointer comes: it is the one the view shows then.
 */
export function cardDetail(view: CardView): Detail {
    const card = view.card
    if(!card) return Detail.none()
    const texts = new Map<Card, Text>()
    const point = { x: 0, y: 0 }
    const part = new Rect()
    return Detail.under(view, (x, y): DetailLook|null => {
        if(!view.localPoint(x, y, point)) return null
        const path = deepestPath(view, card, point, part)
        const held = cardAt(card, path)
        let text = texts.get(held)
        if(text === undefined){
            text = cardText(held)
            texts.set(held, text)
        }
        if(path.length === 0) return { text }
        const area = new Rect()
        if(!view.layerRectOf(part, area)) return { text }
        return { text, area }
    })
}

/**
 * The place of the deepest card held that lies over a point of the view, among the cards of the others, in
 * the order of the cards held, the last above the others: empty when the point is over no card held. The
 * rectangle of that card is written.
 */
function deepestPath(
    view: CardView, card: Card, point: { readonly x: number, readonly y: number }, out: Rect,
): number[] {
    const path: number[] = []
    const rect = new Rect()
    let current = card
    for(;;){
        const contents = current.contents
        if(!contents) return path
        let found = -1
        for(let index = contents.length - 1; index >= 0; index--){
            if(view.partRect([...path, index], rect) && rect.containsPoint(point.x, point.y)){
                found = index
                break
            }
        }
        if(found < 0) return path
        path.push(found)
        out.copyFrom(rect)
        current = contents[found]
    }
}

/** The card held at a place, which is the card itself for the empty place. */
function cardAt(card: Card, path: readonly number[]): Card {
    let held = card
    for(const index of path) held = held.contents![index]
    return held
}
