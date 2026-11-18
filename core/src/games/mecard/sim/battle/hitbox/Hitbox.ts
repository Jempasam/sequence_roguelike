import type { Vector2 } from "../../base/Vector2"
import type { Pose } from "../Action"
import type { Area } from "../Area"
import type { Arena } from "../Arena"

import type { Box } from "./Box"
import type { Disk } from "./Disk"

/**
 * The room the body of a unit takes: a shape that stands where its unit does and, for one that is not round,
 * faces where it faces. The collision of everything in a battle, walls, hazards and heroes alike, is read from
 * it, so none is told apart.
 *
 * @remarks
 * A gap is signed: how far apart two shapes are, negative once they overlap. Every test of the battle is a
 * comparison of a gap with a slack, so the smaller obstacles the moves are tried with, and the true ones
 * they are placed with, are the same test with two slacks.
 */
/** A shape written down: the name of its kind, then its measures in meters. */
export type SavedHitbox = readonly [string, ...number[]]

export interface Hitbox {
    /** What it is made of, to write down: its kind and its measures, which {@link loadedHitbox} reads back. */
    save(): SavedHitbox

    /** The radius of the disc around its middle that holds it whole, in meters. */
    readonly reach: number

    /** The radius of the largest disc around its middle that lies whole inside it, in meters. */
    readonly inner: number

    /**
     * The rectangle that holds it whole, turned with it: how long along where it faces, then how wide across,
     * in meters. A round shape is as long as it is wide.
     */
    readonly extent: readonly [length: number, width: number]

    /** The same shape, a factor of its size bigger. */
    scaled(factor: number): Hitbox

    /** How far it lies from another shape, negative when they overlap, each shape at its own pose. */
    gap(at: Pose, other: Hitbox, otherAt: Pose): number

    /**
     * How far it lies from a disc, negative when they overlap. For the shapes to ask each other: use
     * {@link Hitbox.gap}.
     */
    gapToDisk(at: Pose, disk: Disk, diskAt: Pose): number

    /** How far it lies from a box, negative when they overlap. For the shapes to ask each other. */
    gapToBox(at: Pose, box: Box, boxAt: Pose): number

    /**
     * How far a unit of this shape must go to stand clear of another shape, the way from the middle of the
     * other to its own: nothing when it already does. A turn may bring a shape into another, and this moves it
     * out; it may take a few tries for shapes that are not round.
     */
    separation(at: Pose, other: Hitbox, otherAt: Pose): Vector2

    /**
     * How far along a line, a meter long direction from a point, it enters the shape, none when it misses it
     * or the shape lies behind. A line starting inside enters it at once.
     */
    entry(at: Pose, from: Vector2, direction: Vector2): number|null

    /**
     * The direction a point close to its surface is pushed off it along, a meter long: what a bounce is
     * mirrored along. None when the point lies at its very middle.
     */
    normal(at: Pose, point: Vector2): Vector2|null

    /**
     * How far the edge of its shape lies from its middle along a direction, a meter long, in meters: where
     * a blow or a shot going that way starts from.
     */
    edge(at: Pose, direction: Vector2): number

    /**
     * Its outline pushed out by a margin on every side, in meters: the zone of a blow all around, which starts
     * on the body and not at its middle.
     */
    grown(at: Pose, margin: number): Area

    /** Its outline around where it stands, to draw it. */
    outline(at: Pose): Area

    /** Does it touch a zone? The shape counts whole, so a body touching the zone drawn is touched. */
    touches(at: Pose, area: Area): boolean

    /** Does it cross a wall of an arena? */
    crossesWalls(at: Pose, arena: Arena): boolean
}
