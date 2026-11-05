import type { Painter } from "../gpu"

/** How a container draws and hits its children: turned and scaled about a point of it. */
export interface Pose {
    /** The point it turns and scales about, in its own coordinates. */
    readonly x: number
    readonly y: number

    /** How far it turns, in radians, clockwise since `y` is down. */
    readonly angle: number

    /** How much larger it draws: 1 for the size they were placed at. */
    readonly scale: number
}

/**
 * Put a pose on a painter, for a container whose origin lies at a point of the texture: what is drawn
 * next, in coordinates of the texture, is turned and scaled about the point of the pose.
 */
export function applyPose(painter: Painter, pose: Pose, originX: number, originY: number): void {
    const x = originX + pose.x
    const y = originY + pose.y
    painter.translate(x, y)
    painter.rotate(pose.angle)
    painter.scale(pose.scale)
    painter.translate(-x, -y)
}

/** A point where the posed children are drawn, back to where they were placed, written in `out`. */
export function unposed(pose: Pose, x: number, y: number, out: { x: number, y: number }): void {
    const dx = (x - pose.x) / pose.scale
    const dy = (y - pose.y) / pose.scale
    const cos = Math.cos(-pose.angle)
    const sin = Math.sin(-pose.angle)
    out.x = pose.x + dx * cos - dy * sin
    out.y = pose.y + dx * sin + dy * cos
}
