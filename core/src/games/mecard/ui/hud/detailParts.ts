import { Container } from "../../../../engine/ui"
import type { Component } from "../../../../engine/ui"

import { Detail } from "./Detail"
import type { DetailText } from "./Detail"

/**
 * The details of the parts of a component that tell something, found by going down into it: the first part
 * on a way that tells is a detail, and what it holds is not looked into. They come in the order the parts are
 * drawn, so the last is above the others.
 *
 * @param tellOf - What a part tells: a text, or the detail of the part itself when it has parts of its own to
 *   tell apart, none for a part that tells nothing, which is then looked into.
 * @param skipped - The parts to leave out, with what they hold.
 */
export function detailsOfParts(
    root: Component,
    tellOf: (part: Component) => DetailText|Detail|null,
    skipped: ReadonlySet<Component> = new Set(),
): Detail[] {
    const details: Detail[] = []
    const visit = (part: Component): void => {
        if(skipped.has(part)) return
        const told = tellOf(part)
        if(told !== null){
            details.push(told instanceof Detail ? told : Detail.on(part, told))
            return
        }
        if(part instanceof Container) for(const child of part.children) visit(child)
    }
    if(root instanceof Container) for(const child of root.children) visit(child)
    return details
}
