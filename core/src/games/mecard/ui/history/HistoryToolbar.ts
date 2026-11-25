import { Box, Button, Label, WrapBox } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"

import { DIM_TEXT } from "../look/theme"

/** One choice of a group of a toolbar. */
export interface ToolbarOption<V> {
    readonly label: string
    readonly value: V
}

/** A titled group of options, one of them chosen. */
export interface ToolbarGroup<V> {
    readonly title: string
    readonly options: readonly ToolbarOption<V>[]
    readonly chosen: V

    /** What is done when another option is picked. */
    readonly onChange: (value: V) => void
}

/** A row of buttons for the options of a group: the chosen one is between brackets. */
export function toolbarGroup<V>(theme: Theme, group: ToolbarGroup<V>): Component {
    const row = new WrapBox({ gap: 2 })
    row.add(new Label(theme, `${group.title} :`, { color: DIM_TEXT }))
    for(const { label, value } of group.options){
        const button = new Button(theme, value === group.chosen ? `[${label}]` : label)
        button.onActivate = () => group.onChange(value)
        row.add(button)
    }
    return row
}

/** Groups of options laid one under the other: to order and to filter a list. */
export function historyToolbar(groups: readonly Component[]): Component {
    const column = new Box("column", { gap: 2, align: "stretch" })
    for(const group of groups) column.add(group)
    return column
}
