import { Vector2 } from "../../base/Vector2"
import type { Pose } from "../Action"
import type { Area } from "../Area"
import type { Arena } from "../Arena"
import * as Areas from "../area/Areas"

import type { Box } from "./Box"
import type { Hitbox, SavedHitbox } from "./Hitbox"

/** A round body: the shape of every unit by default. */
export class Disk implements Hitbox {


    constructor(
        /** Its radius, in meters. */
        public readonly radius: number,
    ){}


    public save(): SavedHitbox { return ["disk", this.radius] }

    public get reach(): number { return this.radius }

    public get inner(): number { return this.radius }

    public get extent(): readonly [number, number] { return [this.radius * 2, this.radius * 2] }

    public scaled(factor: number): Disk {
        return new Disk(this.radius * factor)
    }

    public gap(at: Pose, other: Hitbox, otherAt: Pose): number {
        return other.gapToDisk(otherAt, this, at)
    }

    public gapToDisk(at: Pose, disk: Disk, diskAt: Pose): number {
        return at.position.distance(diskAt.position) - (this.radius + disk.radius)
    }

    public gapToBox(at: Pose, box: Box, boxAt: Pose): number {
        return box.gapToDisk(boxAt, this, at)
    }

    public separation(at: Pose, other: Hitbox, otherAt: Pose): Vector2 {
        const gap = this.gap(at, other, otherAt)
        if(gap >= 0) return Vector2.ZERO
        const away = at.position.minus(otherAt.position).normalized ?? Vector2.UP
        return away.times(-gap)
    }

    public entry(at: Pose, from: Vector2, direction: Vector2): number|null {
        const offset = at.position.minus(from)
        const along = direction.dot(offset)
        const across = offset.dot(offset) - along * along
        if(across > this.radius * this.radius) return null
        const half = Math.sqrt(this.radius * this.radius - across)
        if(along + half < 0) return null
        return Math.max(0, along - half)
    }

    public normal(at: Pose, point: Vector2): Vector2|null {
        return point.minus(at.position).normalized
    }

    public edge(_at: Pose, _direction: Vector2): number { return this.radius }

    public grown(at: Pose, margin: number): Area {
        return Areas.circle(at.position, this.radius + margin)
    }

    public outline(at: Pose): Area {
        return Areas.circle(at.position, this.radius)
    }

    public touches(at: Pose, area: Area): boolean {
        return Areas.checkCircle(area, at.position, this.radius)
    }

    public crossesWalls(at: Pose, arena: Arena): boolean {
        return arena.solid(at.position, this.radius)
    }
}
