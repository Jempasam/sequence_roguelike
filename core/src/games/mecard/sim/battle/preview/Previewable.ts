import type { Preview } from "./Preview"
import type { PreviewContext } from "./PreviewContext"

/**
 * Something that can show what it would do over the arena: an action always, a status, a process, a usable
 * or an item when it covers a zone or reaches someone, as `Partial<Previewable>`.
 *
 * @remarks
 * A preview shares its geometry with what the thing really does, so what is shown is what is played. It
 * only reads: it never touches the battle nor draws any chance.
 */
export interface Previewable {
    /** What it would do from a pose. */
    preview(ctx: PreviewContext): Preview
}
