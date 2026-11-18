import { Vector2 } from "../../base/Vector2"
import type { Pose } from "../Action"
import type { Area } from "../Area"
import type { Arena } from "../Arena"
import * as Areas from "../area/Areas"

import type { Disk } from "./Disk"
import type { Hitbox, SavedHitbox } from "./Hitbox"

/** The cosine and the sine of each eighth of a turn of a quarter, written out: no trigonometry needed. */
const QUARTER: readonly (readonly [number, number])[] = [
    [1, 0], [0.9238795325112867, 0.3826834323650898], [0.7071067811865476, 0.7071067811865476],
    [0.3826834323650898, 0.9238795325112867], [0, 1],
]

/**
 * A body shaped as a rectangle, its length along where it faces and its width across: a wall, a ship. It
 * turns with its unit.
 */
export class Box implements Hitbox {


    constructor(
        /** How long it is, along where it faces, in meters. */
        public readonly length: number,

        /** How wide it is, across where it faces, in meters. */
        public readonly width: number,
    ){}


    public save(): SavedHitbox { return ["box", this.length, this.width] }

    public get reach(): number { return Math.hypot(this.length, this.width) / 2 }

    public get inner(): number { return Math.min(this.length, this.width) / 2 }

    public get extent(): readonly [number, number] { return [this.length, this.width] }

    public scaled(factor: number): Box {
        return new Box(this.length * factor, this.width * factor)
    }

    public gap(at: Pose, other: Hitbox, otherAt: Pose): number {
        return other.gapToBox(otherAt, this, at)
    }

    public gapToDisk(at: Pose, disk: Disk, diskAt: Pose): number {
        return this.#distanceTo(at, diskAt.position) - disk.radius
    }

    /**
     * The widest of the gaps along the four sides of the two boxes: positive when one axis keeps them apart.
     * Along an axis it is the true distance; between two corners it is a little under it, never over, and its
     * sign is exact.
     */
    public gapToBox(at: Pose, box: Box, boxAt: Pose): number {
        const between = boxAt.position.minus(at.position)
        const axes = [at.direction, at.direction.right, boxAt.direction, boxAt.direction.right]
        let widest = -Infinity
        for(const axis of axes){
            const gap = Math.abs(between.dot(axis)) - this.#halfAlong(at, axis) - box.#halfAlong(boxAt, axis)
            widest = Math.max(widest, gap)
        }
        return widest
    }

    public separation(at: Pose, other: Hitbox, otherAt: Pose): Vector2 {
        const gap = this.gap(at, other, otherAt)
        if(gap >= 0) return Vector2.ZERO
        const away = at.position.minus(otherAt.position).normalized ?? Vector2.UP
        return away.times(-gap)
    }

    public entry(at: Pose, from: Vector2, direction: Vector2): number|null {
        const offset = from.minus(at.position)
        const side = at.direction.right
        let near = -Infinity
        let far = Infinity
        const slabs: readonly (readonly [number, number, number])[] = [
            [offset.dot(at.direction), direction.dot(at.direction), this.length / 2],
            [offset.dot(side), direction.dot(side), this.width / 2],
        ]
        for(const [start, speed, half] of slabs){
            if(speed === 0){
                if(Math.abs(start) > half) return null
                continue
            }
            const first = (-half - start) / speed
            const second = (half - start) / speed
            near = Math.max(near, Math.min(first, second))
            far = Math.min(far, Math.max(first, second))
        }
        if(near > far || far < 0) return null
        return Math.max(0, near)
    }

    public normal(at: Pose, point: Vector2): Vector2|null {
        const offset = point.minus(at.position)
        const along = offset.dot(at.direction)
        const across = offset.dot(at.direction.right)
        if(along === 0 && across === 0) return null
        const beyondAlong = Math.abs(along) - this.length / 2
        const beyondAcross = Math.abs(across) - this.width / 2
        return beyondAlong >= beyondAcross
            ? at.direction.times(Math.sign(along))
            : at.direction.right.times(Math.sign(across))
    }

    public edge(at: Pose, direction: Vector2): number {
        const along = Math.abs(direction.dot(at.direction))
        const across = Math.abs(direction.dot(at.direction.right))
        const toFront = along > 0 ? this.length / 2 / along : Infinity
        const toSide = across > 0 ? this.width / 2 / across : Infinity
        return Math.min(toFront, toSide)
    }

    public grown(at: Pose, margin: number): Area {
        const { position, direction } = at
        const front = direction
        const right = direction.right
        const along = front.times(this.length / 2)
        const across = right.times(this.width / 2)
        // Each corner, with the way the rounding starts from and the way it ends toward, around the box.
        const corners: readonly (readonly [Vector2, Vector2, Vector2])[] = [
            [position.plus(along).plus(across), right, front],
            [position.plus(along).minus(across), front, right.opposite],
            [position.minus(along).minus(across), right.opposite, front.opposite],
            [position.minus(along).plus(across), front.opposite, right],
        ]
        return corners.flatMap(([corner, from, to]) => {
            return QUARTER.map(([cos, sin]) => corner.plus(from.times(cos * margin)).plus(to.times(sin * margin)))
        })
    }

    public outline(at: Pose): Area {
        const along = at.direction.times(this.length / 2)
        const across = at.direction.right.times(this.width / 2)
        const { position } = at
        return [
            position.plus(along).plus(across), position.plus(along).minus(across),
            position.minus(along).minus(across), position.minus(along).plus(across),
        ]
    }

    public touches(at: Pose, area: Area): boolean {
        return Areas.check(area, this.outline(at))
    }

    public crossesWalls(at: Pose, arena: Arena): boolean {
        return this.outline(at).some(corner => arena.solid(corner, 0))
    }


    /** How far a point lies from the rectangle, negative inside, down to the nearest side. */
    #distanceTo(at: Pose, point: Vector2): number {
        const offset = point.minus(at.position)
        const beyondAlong = Math.abs(offset.dot(at.direction)) - this.length / 2
        const beyondAcross = Math.abs(offset.dot(at.direction.right)) - this.width / 2
        if(beyondAlong > 0 || beyondAcross > 0) return Math.hypot(Math.max(beyondAlong, 0), Math.max(beyondAcross, 0))
        return Math.max(beyondAlong, beyondAcross)
    }

    /** How far the rectangle reaches from its middle along an axis, in meters. */
    #halfAlong(at: Pose, axis: Vector2): number {
        return Math.abs(axis.dot(at.direction)) * this.length / 2 + Math.abs(axis.dot(at.direction.right)) * this.width / 2
    }
}
