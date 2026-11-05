import { ActionMap, key, pad } from "../../input"
import type { ActionBindings, ActionMapOptions } from "../../input"

/**
 * What the interface is asked to do, whatever the device:
 * - `"up"`, `"down"`, `"left"`, `"right"`: move the focus, or change the value of the focused widget.
 * - `"accept"`: activate the focused widget.
 * - `"cancel"`: close what is open, or leave a field unchanged.
 * - `"next"`, `"previous"`: move the focus through every focusable widget in order, as `tab` does.
 */
export type UiAction = "up"|"down"|"left"|"right"|"accept"|"cancel"|"next"|"previous"

/**
 * The bindings of the `ui` table by default: the arrows, the cross and the left stick move, `enter`,
 * `space` and the south button accept, `escape` and the east button cancel, `tab` and the shoulders go
 * through the widgets. The game may change them: the interface knows no key and no button, only these
 * actions.
 */
export const UI_BINDINGS: ActionBindings<UiAction, never> = {
    buttons: {
        up: [key("ArrowUp"), pad("up"), pad("leftStickUp")],
        down: [key("ArrowDown"), pad("down"), pad("leftStickDown")],
        left: [key("ArrowLeft"), pad("left"), pad("leftStickLeft")],
        right: [key("ArrowRight"), pad("right"), pad("leftStickRight")],
        accept: [key("Enter"), key("NumpadEnter"), key("Space"), pad("south")],
        cancel: [key("Escape"), pad("east")],
        next: [key("Tab"), pad("r1")],
        previous: [pad("l1")],
    },
    axes: {},
}

/** A new `ui` table, with the bindings by default. */
export function uiActions(options: ActionMapOptions = {}): ActionMap<UiAction, never> {
    return new ActionMap(UI_BINDINGS, options)
}
