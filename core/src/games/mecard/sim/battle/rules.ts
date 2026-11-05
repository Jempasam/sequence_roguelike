import { Vector2 } from "../base/Vector2"

/** How many hearts a unit pushed into something before the whole distance takes. */
export const PUSH_BLOCKED_DAMAGE = 1

/** How many hearts a unit loses each time it is found where it has no room, and thrown aside. */
export const UNBLOCK_DAMAGE = 1

/** The eight ways around a unit, a meter long: where it may be thrown, or wander. */
export const EIGHT_WAYS: readonly Vector2[] = [
    Vector2.UP, Vector2.UP.eighth(1), Vector2.RIGHT, Vector2.RIGHT.eighth(1),
    Vector2.DOWN, Vector2.DOWN.eighth(1), Vector2.LEFT, Vector2.LEFT.eighth(1),
]

/**
 * How much smaller the pillars and the bodies are taken to be when testing what blocks a move, in meters:
 * enough to brush past them, too little to be seen going through them.
 */
export const COLLISION_SLACK = 0.08

/** How many ticks the simulation plays in a second: what the actions count their time in. */
export const TICKS_PER_SECOND = 60
