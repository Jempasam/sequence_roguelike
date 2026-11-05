/**
 * What an animation of a character moves, added to where it looks:
 * - `head`, `lean`, `squash`: added to its pose, in the units of {@link PnjPose}.
 * - `turn`: multiplies its orientation and that of its head, 1 leaving them, -1 turning them to the other
 *   side, 0 seeing them from the side. It is 1 where the animation does not say.
 * - `headTurn`: turns its head from the side its body faces toward the other, in orientation: 1 sees the
 *   head at its narrowest when the body faces a side whole. The head never passes to the other side.
 */
export type PnjTrack = "head"|"headTurn"|"lean"|"squash"|"turn"

/** A value an animation reaches at a moment, in seconds from its start. */
export type PnjKey = readonly [time: number, value: number]

/**
 * A move of a character, as keys by track: between two keys the value eases in and out, before the first
 * and after the last it holds. A track starts and ends at its rest, 0, or 1 for `turn`, so the animation
 * joins the pose it lies over.
 */
export interface PnjAnimation {
    /** What it is called on the buttons, in french. */
    readonly label: string

    /** How long it plays, in seconds. */
    readonly duration: number

    readonly tracks: Readonly<Partial<Record<PnjTrack, readonly PnjKey[]>>>
}

/** The value of a track of an animation at a moment, its rest when the animation does not move it. */
export function trackAt(animation: PnjAnimation, track: PnjTrack, time: number): number {
    const keys = animation.tracks[track]
    if(!keys || keys.length === 0) return track === "turn" ? 1 : 0
    const next = keys.findIndex(([at]) => at > time)
    if(next === 0) return keys[0][1]
    if(next < 0) return keys[keys.length - 1][1]
    const [fromTime, from] = keys[next - 1]
    const [toTime, to] = keys[next]
    const along = (time - fromTime) / (toTime - fromTime)
    return from + (to - from) * along * along * (3 - 2 * along)
}

/**
 * Keys going back and forth around a value, to make a track tremble or bounce: `count` swings of
 * `amplitude` each side, evenly from `start` to `end`, the first and last at the value itself.
 */
export function shiver(
    start: number, end: number, count: number, value: number, amplitude: number,
): PnjKey[] {
    const keys: PnjKey[] = [[start, value]]
    for(let i = 1; i <= count; i++){
        keys.push([start + (end - start) * i / (count + 1), value + (i % 2 === 0 ? -amplitude : amplitude)])
    }
    keys.push([end, value])
    return keys
}


//// The animations ////

/** A squash and its rebounds, as a sack dropped. */
export const POMP_ANIMATION: PnjAnimation = {
    label: "Pwomp",
    duration: 0.7,
    tracks: {
        squash: [[0, 0], [0.08, 0.75], [0.2, 0], [0.3, 0.35], [0.42, 0], [0.5, 0.12], [0.6, 0]],
        head: [[0, 0], [0.08, -0.15], [0.2, 0.05], [0.3, 0], [0.6, 0]],
    },
}

/** A blow forward: drawn back, thrown forward, held, back up. */
export const STRIKE_ANIMATION: PnjAnimation = {
    label: "Frappe",
    duration: 0.95,
    tracks: {
        lean: [[0, 0], [0.22, 0.3], [0.32, -0.6], [0.5, -0.6], [0.95, 0]],
        head: [[0, 0], [0.22, 0.1], [0.32, -0.15], [0.5, -0.15], [0.95, 0]],
        squash: [[0, 0], [0.22, 0.2], [0.3, 0], [0.36, 0.1], [0.5, 0]],
    },
}

/** A fright: recoiled backward and huddled, trembling, then slowly back. */
export const FEAR_ANIMATION: PnjAnimation = {
    label: "Peur",
    duration: 1.9,
    tracks: {
        lean: [[0, 0], [0.15, 0.35], ...shiver(0.2, 1.4, 14, 0.3, 0.05), [1.9, 0]],
        head: [[0, 0], [0.15, -0.25], [1.4, -0.25], [1.9, 0]],
        squash: [[0, 0], [0.15, 0.3], ...shiver(0.2, 1.4, 10, 0.25, 0.05), [1.9, 0]],
    },
}

/** A nod, twice. */
export const YES_ANIMATION: PnjAnimation = {
    label: "Oui",
    duration: 0.8,
    tracks: {
        head: [[0, 0], [0.15, -0.3], [0.3, 0.05], [0.45, -0.3], [0.6, 0.05], [0.8, 0]],
    },
}

/** A shake of the head, turning it toward the viewer and back, the body still. */
export const NO_ANIMATION: PnjAnimation = {
    label: "Non",
    duration: 0.9,
    tracks: {
        headTurn: [[0, 0], [0.15, 0.85], [0.3, 0], [0.45, 0.85], [0.6, 0], [0.75, 0.45], [0.9, 0]],
        head: [[0, 0], [0.15, -0.1], [0.75, -0.1], [0.9, 0]],
    },
}

/** A start of surprise: a jolt, the head thrown up, then back. */
export const SURPRISE_ANIMATION: PnjAnimation = {
    label: "Surprise",
    duration: 1.4,
    tracks: {
        squash: [[0, 0], [0.1, 0.4], [0.2, 0], [0.26, 0.08], [0.32, 0]],
        head: [[0.1, 0], [0.25, 0.35], [0.9, 0.35], [1.4, 0]],
        lean: [[0.1, 0], [0.25, 0.18], [0.9, 0.18], [1.4, 0]],
    },
}

/** A laugh: leaning back, shaken by bounces. */
export const LAUGH_ANIMATION: PnjAnimation = {
    label: "Rire",
    duration: 1.6,
    tracks: {
        lean: [[0, 0], [0.2, 0.3], ...shiver(0.25, 1.2, 9, 0.3, 0.05), [1.6, 0]],
        head: [[0, 0], [0.2, 0.25], [1.2, 0.25], [1.6, 0]],
        squash: [[0, 0], ...shiver(0.2, 1.25, 8, 0.12, 0.1), [1.6, 0]],
    },
}

/** A turn on itself: away from what it looked at, and back. */
export const SPIN_ANIMATION: PnjAnimation = {
    label: "Volte",
    duration: 1,
    tracks: {
        turn: [[0, 1], [0.35, -1], [0.55, -1], [1, 1]],
        squash: [[0, 0], [0.1, 0.15], [0.35, 0], [0.55, 0], [0.7, 0.15], [1, 0]],
    },
}

/** Every animation of the characters, in the order of the buttons of the bench. */
export const PNJ_ANIMATIONS: readonly PnjAnimation[] = [
    POMP_ANIMATION, STRIKE_ANIMATION, FEAR_ANIMATION, YES_ANIMATION, NO_ANIMATION, SURPRISE_ANIMATION,
    LAUGH_ANIMATION, SPIN_ANIMATION,
]
