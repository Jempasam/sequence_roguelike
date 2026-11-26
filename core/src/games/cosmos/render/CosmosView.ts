import type { Painter } from "../../../engine/gpu"
import { Color, Vec3 } from "../../../engine/math"
import type { Landmark } from "../level/Landmark"
import type { Rgb } from "../level/Level"
import { Pose } from "../level/Pose"
import { conjugate, Frame, rotate } from "../space/Frame"
import type { Anchor } from "../space/Anchor"
import type { Space } from "../space/Space"

/** The size of the picture, in pixels. The view is as wide as the view size of the space, top to bottom. */
export const WIDTH = 320
export const HEIGHT = 180

/** The side of the cells the ground and the clouds are sampled in, in pixels. */
const GROUND_CELL = 6
const SPHERE_CELL = 3
const CLOUD_CELL = 8

/** A landmark to draw: its center and size in the picture, and how it shows itself at that size. */
interface Mark {
    readonly landmark: Landmark
    readonly x: number
    readonly y: number
    readonly depth: number
    readonly radius: number
    readonly frame: Frame
    readonly stage: "point" | "fog" | "children"
}

type Project = (point: Vec3) => [number, number, number]

/**
 * Draws what the player sees, from above: the space of the current level, then what each level of the
 * chain holds around, each at the size and place the conversions of the levels give it. An element shows
 * itself by its size on the screen: a glowing dot, its fog of density, then what it holds, placed.
 */
export class CosmosView {

    private readonly tint = new Color()


    /** Draw the view of a space at a time in seconds, with the points put in it. */
    public draw(painter: Painter, space: Space, anchors: readonly Anchor[], time: number): void {
        const { level, pose } = space.current
        const pixels = HEIGHT / space.viewSize
        const turn = conjugate(pose.orientation)
        const project: Project = point => {
            const { x, y, z } = pose.position
            const v = rotate(turn, point.x - x, point.y - y, point.z - z)
            return [WIDTH / 2 + v[0] * pixels, HEIGHT / 2 + v[2] * pixels, v[1]]
        }

        // SPACE //
        if(level.look === "sphere") this.sphere(painter, space, time, pixels)
        else this.field(painter, space, time, pixels, level.look === "cloud")

        // LANDMARKS //
        const marks = this.marks(space, time, project, pixels)
        marks.sort((a, b) => a.depth - b.depth)
        for(const mark of marks) this.mark(painter, mark, project, pixels, time)

        // POINTS //
        for(const anchor of anchors){
            const [x, y] = project(anchor.in(space, time))
            if(x < -8 || x > WIDTH + 8 || y < -8 || y > HEIGHT + 8) continue
            this.color(1, 0.2, 0.2, 1, painter)
            painter.rect(x - 1, y - 4, 2, 8)
            painter.rect(x - 4, y - 1, 8, 2)
        }

        // RETICLE //
        this.color(1, 1, 1, 0.6, painter)
        painter.rect(WIDTH / 2 - 5, HEIGHT / 2, 3, 1)
        painter.rect(WIDTH / 2 + 3, HEIGHT / 2, 3, 1)
        painter.rect(WIDTH / 2, HEIGHT / 2 - 5, 1, 3)
        painter.rect(WIDTH / 2, HEIGHT / 2 + 3, 1, 3)
    }

    private color(r: number, g: number, b: number, a: number, painter: Painter): void {
        this.tint.set(r, g, b, a)
        painter.setTint(this.tint)
    }

    private rgb(color: Rgb, alpha: number, painter: Painter, shade = 1): void {
        const lit = (value: number) => Math.min(1, value * shade)
        this.color(lit(color[0]), lit(color[1]), lit(color[2]), alpha, painter)
    }

    /** The space of the current level, sampled over the plane of the view: its cloud or its ground. */
    private field(painter: Painter, space: Space, time: number, pixels: number, cloud: boolean): void {
        const { level, pose } = space.current
        const cell = cloud ? CLOUD_CELL : GROUND_CELL
        const probe = pose.clone()
        for(let y = 0; y < HEIGHT; y += cell){
            for(let x = 0; x < WIDTH; x += cell){
                const a = (x + cell / 2 - WIDTH / 2) / pixels
                const b = (y + cell / 2 - HEIGHT / 2) / pixels
                const turned = rotate(pose.orientation, a, 0, b)
                probe.position.set(
                    pose.position.x + turned[0], pose.position.y + turned[1], pose.position.z + turned[2],
                )
                const info = level.sample(probe, time)
                if(cloud){
                    if(info.density < 0.02) continue
                    this.rgb(info.color, Math.min(0.9, info.density), painter)
                } else {
                    const light = 0.75 + Math.max(-0.3, Math.min(0.3, info.height * 0.12))
                    this.rgb(info.color, 1, painter, info.liquid ? 1 : light)
                }
                painter.rect(x, y, cell, cell)
            }
        }
    }

    /** A planet seen from above, as a sphere lit by the sun at the middle of the level above. */
    private sphere(painter: Painter, space: Space, time: number, pixels: number): void {
        const { level, pose } = space.current
        const turn = conjugate(pose.orientation)
        const { x: px, y: py, z: pz } = pose.position
        const center = rotate(turn, -px, -py, -pz)
        const sun = level.frame(pose, time).unapply(new Vec3())
        const toSun = rotate(turn, sun.x - px, sun.y - py, sun.z - pz)
        const toSunLength = Math.hypot(toSun[0] - center[0], toSun[1] - center[1], toSun[2] - center[2]) || 1
        const light = [
            (toSun[0] - center[0]) / toSunLength, (toSun[1] - center[1]) / toSunLength,
            (toSun[2] - center[2]) / toSunLength,
        ]
        const probe = pose.clone()
        for(let y = 0; y < HEIGHT; y += SPHERE_CELL){
            for(let x = 0; x < WIDTH; x += SPHERE_CELL){
                const a = (x + SPHERE_CELL / 2 - WIDTH / 2) / pixels
                const b = (y + SPHERE_CELL / 2 - HEIGHT / 2) / pixels
                const dx = a - center[0]
                const dz = b - center[2]
                const rest = 1 - dx * dx - dz * dz
                if(rest <= 0) continue
                const dy = Math.sqrt(rest)
                const turned = rotate(pose.orientation, a, center[1] + dy, b)
                probe.position.set(px + turned[0], py + turned[1], pz + turned[2])
                const info = level.sample(probe, time)
                const lit = Math.max(0.12, dx * light[0] + dy * light[1] + dz * light[2])
                this.rgb(info.color, 1, painter, lit)
                painter.rect(x, y, SPHERE_CELL, SPHERE_CELL)
            }
        }
    }

    /**
     * What every level of the chain holds around, in the picture. The landmarks of a level are in its own
     * space; the frame of the level below, undone, carries them to the next one, down to the current level.
     */
    private marks(space: Space, time: number, project: Project, pixels: number): Mark[] {
        const marks: Mark[] = []
        const zero = new Vec3()
        const add = (landmark: Landmark, above: Frame): void => {
            const frame = above.after(landmark.frame)
            const [x, y, depth] = project(frame.apply(zero))
            const radius = frame.scale * pixels
            if(radius < 0.35 && landmark.glow === 0) return
            if(x + radius < 0 || x - radius > WIDTH || y + radius < 0 || y - radius > HEIGHT) return
            const stage = landmark.level.stageAt(radius)
            marks.push({ landmark, x, y, depth, radius, frame, stage })
            if(stage !== "children") return
            const inside = new Pose(zero.clone(), undefined, landmark.frame.scale, landmark.at)
            for(const child of landmark.level.landmarks(inside, time)) add(child, frame)
        }
        let above = Frame.identity()
        const chain = space.chain
        for(let i = chain.length - 1; i >= 0; i--){
            const { level, pose } = chain[i]
            const inside = i < chain.length - 1 ? chain[i + 1].pose.at : null
            for(const landmark of level.landmarks(pose, time)){
                if(inside && sameAddress(landmark.at, inside)) continue
                add(landmark, above)
            }
            if(i > 0) above = above.after(level.frame(pose, time).inverse())
        }
        return marks
    }

    private mark(painter: Painter, mark: Mark, project: Project, pixels: number, time: number): void {
        const { landmark, x, y, radius } = mark
        const glow = landmark.glow
        if(mark.stage !== "point") this.fog(painter, mark, project, pixels, time)
        if(mark.stage === "fog"){
            this.rgb(landmark.color, 0.9, painter)
            painter.circle(x, y, 1)
            return
        }
        if(mark.stage === "children") return
        if(glow > 0){
            this.rgb(landmark.color, 0.25 * glow, painter)
            painter.circle(x, y, Math.max(2.2, radius * 1.6))
        }
        this.rgb(landmark.color, 1, painter)
        painter.circle(x, y, Math.max(radius, glow > 0 ? 0.9 : 0.5))
    }

    /** The density cloud of an element seen from outside: its samples over its disk, placed by its frame. */
    private fog(painter: Painter, mark: Mark, project: Project, pixels: number, time: number): void {
        const { landmark, frame } = mark
        const cells = Math.min(24, Math.max(6, Math.round(mark.radius / 2)))
        const step = 2 / cells
        const size = Math.max(1.5, step * frame.scale * pixels * 1.4)
        const alpha = mark.stage === "children" ? 0.5 : 0.8
        const probe = new Pose(new Vec3(), undefined, frame.scale, landmark.at)
        const place = new Vec3()
        for(let i = 0; i < cells; i++){
            for(let j = 0; j < cells; j++){
                probe.position.set(-1 + (i + 0.5) * step, 0, -1 + (j + 0.5) * step)
                const info = landmark.level.sample(probe, time)
                if(info.density < 0.03) continue
                const [x, y] = project(frame.apply(probe.position, place))
                this.rgb(info.color, Math.min(1, info.density * alpha), painter)
                painter.rect(x - size / 2, y - size / 2, size, size)
            }
        }
    }
}

function sameAddress(a: readonly number[], b: readonly number[]): boolean {
    return a.length === b.length && a.every((value, i) => value === b[i])
}
