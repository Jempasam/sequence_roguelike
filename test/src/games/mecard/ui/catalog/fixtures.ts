import { Label, WrapBox } from "@game/core"
import type { Component, Theme } from "@game/core"
import type { Entry, EntryFilter, Section } from "@game/core/mecard/entries"

// The fixture builders shared by the tests of the catalogue components.

/** An entry that is a label, holding a value. */
export function entry(theme: Theme, key: string, value: unknown = key): Entry {
    return { view: new Label(theme, key), text: key, key, value }
}

/** A section of entries made when it is asked, as the real ones are. */
export function section(
    theme: Theme, title: string, group: string, category: Section["category"], keys: readonly string[],
    filters: readonly EntryFilter[] = [],
): Section {
    return { title, group, category, filters, entries: () => keys.map(key => entry(theme, key)) }
}

/** Every component under another, itself included. */
export function allUnder(root: Component): Component[] {
    const found: Component[] = [root]
    const children = (root as { children?: readonly Component[] }).children ?? []
    for(const child of children) found.push(...allUnder(child))
    return found
}

/** The wrapping boxes under a component, in the order of the tree. */
export function wrapsUnder(root: Component): WrapBox[] {
    return allUnder(root).filter(component => component instanceof WrapBox) as WrapBox[]
}

/** Where the middle of a component is, in the coordinates of the texture. */
export function centerOf(component: Component): [number, number] {
    let x = component.bounds.width / 2
    let y = component.bounds.height / 2
    for(let each: Component|null = component; each; each = each.parent){
        x += each.bounds.x
        y += each.bounds.y
    }
    return [Math.floor(x), Math.floor(y)]
}
