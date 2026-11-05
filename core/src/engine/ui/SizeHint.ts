/**
 * The sizes a component asks for, in virtual pixels. Only hints: its parent may give it less than its
 * minimum when room lacks, or more than its preferred size to stretch it.
 */
export interface SizeHint {
    readonly minWidth: number
    readonly minHeight: number
    readonly preferredWidth: number
    readonly preferredHeight: number
}

/** A size, in virtual pixels. */
export interface Size {
    readonly width: number
    readonly height: number
}

/** The hint of a component that asks for a size and accepts down to another. */
export function sizeHint(
    minWidth: number, minHeight: number, preferredWidth = minWidth, preferredHeight = minHeight,
): SizeHint {
    return {
        minWidth, minHeight,
        preferredWidth: Math.max(minWidth, preferredWidth),
        preferredHeight: Math.max(minHeight, preferredHeight),
    }
}

/** The hint of a component asking for nothing. */
export const EMPTY_HINT: SizeHint = sizeHint(0, 0)

/** A hint grown by a margin on each side, as a frame does around its content. */
export function paddedHint(hint: SizeHint, horizontal: number, vertical: number): SizeHint {
    return sizeHint(hint.minWidth + horizontal, hint.minHeight + vertical,
        hint.preferredWidth + horizontal, hint.preferredHeight + vertical)
}
