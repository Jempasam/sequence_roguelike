import { Quat } from "../../../engine/math"
import type { Vec3 } from "../../../engine/math"
import type { Level } from "../level/Level"
import { Pose } from "../level/Pose"
import { Anchor } from "./Anchor"
import { rotate } from "./Frame"

/** The view is narrower than this many sizes of the place a pose falls in: the zoom has reached its level. */
const ENTER_VIEW = 3

/** The view is wider than this many units of its level: the zoom has left it. */
const LEAVE_VIEW = 6

/** A level the position goes through, and the pose in it. */
export interface Step {
    readonly level: Level
    pose: Pose
}

/**
 * Where the player is: a stack of levels from the whole down to the one the zoom has reached, with the pose
 * in each. Only the pose of the last level is real: the keys move it, and each frame the poses of the levels
 * above are made again from it by the conversions of the levels. The zoom decides the level: reaching the
 * scale of a place below, the pose is converted into it; widening past the scale of the level, into the one
 * above. The engine knows nothing of what a level is made of.
 */
export class Space {

    /** The levels from the whole to the current one, with the pose in each. */
    public readonly chain: Step[]

    /** How wide the view is, in the units of the current level. */
    public viewSize = 3


    constructor(whole: Level){
        this.chain = [{ level: whole, pose: new Pose() }]
    }


    /** The level and the pose where the player is. */
    public get current(): Step {
        return this.chain[this.chain.length - 1]
    }

    /** The width of the view in the units of each level of the chain, from the whole to the current one. */
    public viewSizes(): number[] {
        const sizes = new Array<number>(this.chain.length)
        let size = this.viewSize
        for(let i = this.chain.length - 1; i >= 0; i--){
            sizes[i] = size
            size *= this.chain[i].pose.scale
        }
        return sizes
    }

    /**
     * Move over the ground the camera looks down at, by fractions of the width of the view: to the right of
     * the screen and down it. It moves the pose of the current level.
     */
    public move(right: number, down: number): void {
        const { pose } = this.current
        const step = rotate(pose.orientation, right * this.viewSize, 0, down * this.viewSize)
        pose.position.set(pose.position.x + step[0], pose.position.y + step[1], pose.position.z + step[2])
    }

    /** Put the pose of the current level at a position. */
    public moveTo(position: Vec3): void {
        this.current.pose.position.copyFrom(position)
    }

    /** Turn the camera around the point, in radians. */
    public orbit(yaw: number, pitch: number): void {
        const { pose } = this.current
        const turn = new Quat().setAxisAngle(0, 1, 0, yaw).multiply(new Quat().setAxisAngle(1, 0, 0, pitch))
        pose.orientation = pose.orientation.clone().multiply(turn).normalize()
    }

    /** Make the view wider (factor above 1) or narrower (below 1). */
    public zoom(factor: number): void {
        this.viewSize *= factor
    }

    /** Put a point where the player is. */
    public anchorHere(): Anchor {
        return new Anchor(
            this.chain.map(step => step.level), this.chain.map(step => step.pose.at),
            this.current.pose.position.clone(),
        )
    }

    /**
     * Change level as the zoom asks, then make the poses of the levels above again from the current one, at a
     * time in seconds.
     */
    public update(time: number): void {
        for(let guard = 0; guard < 64; guard++){
            const { level, pose } = this.current
            const choice = level.pick(pose, time)
            if(choice){
                const inner = choice.level.enter(pose, choice.at, time, true)
                if(this.viewSize <= inner.scale * ENTER_VIEW){
                    this.viewSize /= inner.scale
                    this.chain.push({ level: choice.level, pose: inner })
                    continue
                }
            }
            if(this.chain.length > 1 && this.viewSize > LEAVE_VIEW){
                this.viewSize *= pose.scale
                const outer = level.leave(pose, time)
                this.chain.pop()
                this.current.pose = outer
                continue
            }
            break
        }
        for(let i = this.chain.length - 2; i >= 0; i--){
            const below = this.chain[i + 1]
            this.chain[i].pose = below.level.leave(below.pose, time)
        }
    }
}
