import { Quat, Vec3 } from "../../../engine/math"
import { Frame } from "./Frame"

/**
 * How a body moves in its parent, as a formula of the time and not as a simulation, so that its place at
 * any moment is known without having lived the moments before: it sits at `rest`, circles around that
 * point, and turns on itself.
 */
export interface Motion {

    /** The center of the circle, in the space of the parent. */
    readonly rest: Vec3

    /** The radius of the circle, in the space of the parent. 0 for a body that stays put. */
    readonly orbitRadius: number

    /** The tilt of the plane of the circle around the x axis, in radians. */
    readonly orbitTilt: number

    /** The seconds of a lap of the circle. 0 for a body that stays put. */
    readonly period: number

    /** Where on the circle the body is at the time 0, in radians. */
    readonly phase: number

    /** The seconds of a turn on itself. 0 for a body that does not turn. */
    readonly spinPeriod: number

    /** The tilt of the axis of the turn on itself, in radians. */
    readonly spinTilt: number

    /** The way the body faces at the time 0, before it turns. */
    readonly orientation: Quat

    /** The size of the body in the space of its parent: the factor from its units to the parent's. */
    readonly scale: number
}

/** A motion with nothing moving: a body that sits at a place with a size. */
export function staticMotion(rest: Vec3, scale: number, orientation = new Quat()): Motion {
    return {
        rest, orbitRadius: 0, orbitTilt: 0, period: 0, phase: 0, spinPeriod: 0, spinTilt: 0,
        orientation, scale,
    }
}

/** Where a motion puts a body at a time in seconds. */
export function frameAt(motion: Motion, time: number): Frame {
    const origin = motion.rest.clone()
    if(motion.orbitRadius > 0 && motion.period > 0){
        const angle = motion.phase + Math.PI * 2 * time / motion.period
        const x = Math.cos(angle) * motion.orbitRadius
        const z = Math.sin(angle) * motion.orbitRadius
        origin.x += x
        origin.y += -z * Math.sin(motion.orbitTilt)
        origin.z += z * Math.cos(motion.orbitTilt)
    }
    const rotation = motion.orientation.clone()
    if(motion.spinPeriod > 0){
        const angle = Math.PI * 2 * time / motion.spinPeriod
        const axis = new Vec3(Math.sin(motion.spinTilt), Math.cos(motion.spinTilt), 0)
        rotation.setAxisAngle(axis.x, axis.y, axis.z, angle).multiply(motion.orientation)
    }
    return new Frame(origin, rotation, motion.scale)
}
