import type { Rgba } from "../../base/Rgba"
import type { Vector2 } from "../../base/Vector2"
import type { Pose } from "../Action"

import type { PreviewContext } from "./PreviewContext"

/** Something drawn over the arena to show what a thing would do, its sizes in meters. */
export type Indicator =
    | { readonly kind: "label", readonly at: Vector2, readonly text: string, readonly color: Rgba }
    | {
        readonly kind: "arrow",

        /** The line, its head at the last point. */
        readonly points: readonly Vector2[],

        /** The width of the line, in meters. */
        readonly width: number,

        readonly color: Rgba,
    }
    | {
        readonly kind: "polygon",

        /** An area, its points in turn around a shape its first point sees whole. */
        readonly points: readonly Vector2[],

        readonly color: Rgba,
    }

/** What a thing would do: what it shows, and where it would leave its unit. */
export interface Preview {
    readonly indicators: readonly Indicator[]

    /** Where the unit would stand and face after it. */
    readonly pose: Pose

    /**
     * What it sets going would do before each step after it, none when nothing: a horse carries its rider
     * ahead of each of its steps.
     */
    readonly beforeStep?: (ctx: PreviewContext) => Preview
}
