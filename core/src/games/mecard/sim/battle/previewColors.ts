import { rgba } from "../base/Rgba"

// The colors previews and hazards show in. A card may take one of its own: these keep the common
// effects alike from one card to the next.

/** A move, a turn. */
export const MOVE_COLOR = rgba(0.15, 0.5, 0.9, 0.9)

/** The reach of an action: how far it looks or goes, a faint disc. */
export const RANGE_COLOR = rgba(0.25, 0.55, 0.95, 0.15)

/** A physical blow, as the arena is light: the pastel blue of a preview that reaches nobody. */
export const PHYSICAL_COLOR = rgba(0.55, 0.75, 1, 0.4)

/** The area of an attack, in a preview, while it would reach nobody: a pastel blue. */
export const MISS_COLOR = rgba(0.55, 0.75, 1, 0.4)

/** The area of an attack, in a preview, once it would reach someone. */
export const HIT_COLOR = rgba(0.95, 0.2, 0.2, 0.4)

/** A unit an attack would reach, in a preview: a red disc over it. */
export const MARK_COLOR = rgba(0.9, 0.1, 0.1, 0.6)

/** An elemental effect: fire, spells. */
export const ELEMENTAL_COLOR = rgba(1, 0.55, 0.2, 0.4)

/** An effect on another unit: a push, a charm, a hypnosis. */
export const CONTROL_COLOR = rgba(0.85, 0.5, 1, 0.9)

/** Something left behind: a bomb about to blow. */
export const HAZARD_COLOR = rgba(1, 0.3, 0.2, 0.3)

/** A word about the action itself: blocked, 50 %. Dark, to read on the light arena. */
export const NOTE_COLOR = rgba(0.12, 0.15, 0.35, 1)

/** How wide the arrow of a move is, in meters. */
export const MOVE_WIDTH = 0.08

/** How long the arrow of a turn is, in meters. */
export const TURN_LENGTH = 0.8
