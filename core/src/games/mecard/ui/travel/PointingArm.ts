import type { Assets, ImagePath } from "../../../../engine/assets"
import { Sprite, Texture } from "../../../../engine/gpu"
import type { Gpu, Painter } from "../../../../engine/gpu"
import { Component, EMPTY_HINT } from "../../../../engine/ui"
import type { SizeHint } from "../../../../engine/ui"

/** Where the pointer is, in virtual pixels of the interface: the interface itself. */
export interface PointerSource {
    readonly pointerX: number
    readonly pointerY: number
}

/** Where the forearm lies in its picture, in texels: the size of the picture and the tip of its finger. */
export interface ArmPoints {
    readonly width: number
    readonly height: number
    readonly tipX: number
    readonly tipY: number
}

/** How the forearm follows the pointer, appears and goes. */
export interface ArmSettings {
    /** Where its anchor stands along the bottom edge, from 0 on the left to 1 on the right. */
    baseShare: number

    /** The share of the way from its anchor to the pointer its tip stands at. */
    reachShare: number

    /** How far it turns from upright at most, either way, in degrees. */
    maxTilt: number

    /** How much larger than its picture it is drawn. */
    scale: number

    /** How long the point it aims at takes to cover two thirds of the way to the pointer, in seconds. */
    smoothing: number

    /** How long it takes to rise into the screen or to sink out of it, in seconds. */
    duration: number
}

/** Where the forearm stands: where its tip is, and how far it is turned from upright. */
export interface ArmPose {
    /** Where its tip is, in virtual pixels from the left. */
    readonly x: number

    /** Where its tip is, in virtual pixels from the top. */
    readonly y: number

    /** How far it is turned from upright, in radians, clockwise: to the left when negative. */
    readonly tilt: number
}

/** The picture of the forearm, the finger up, and where it lies in it. */
export const ARM_PICTURE: ImagePath = "mecard/travel/hand.png"
export const ARM_POINTS: ArmPoints = { width: 244, height: 629, tipX: 53, tipY: 0 }

/** How the forearm follows the pointer at first. */
export const ARM_SETTINGS: Readonly<ArmSettings> = {
    baseShare: 0.75,
    reachShare: 0.7,
    maxTilt: 30,
    scale: 0.55,
    smoothing: 0.08,
    duration: 0.35,
}

/** The least change worth drawing again for. */
const EPSILON = 0.01

/**
 * How far under the tip the highest corner of the picture lies, once turned and scaled, in virtual pixels:
 * above the tip when negative.
 */
function topOf(points: ArmPoints, scale: number, turn: number): number {
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    let top = Infinity
    for(const x of [0, points.width]){
        for(const y of [0, points.height]){
            const dx = (x - points.tipX) * scale
            const dy = (y - points.tipY) * scale
            top = Math.min(top, dx * sin + dy * cos)
        }
    }
    return top
}

/** A value kept between two others. */
function clamp(value: number, least: number, most: number): number {
    return Math.max(least, Math.min(most, value))
}

/**
 * Where the forearm stands to point at a point, in an interface of a size, whatever it did before. Its tip
 * stands a share of the way from its anchor, on the bottom edge, to the point, and it lies along that way.
 * It turns no farther than its most, nor so far that the higher end of its cut comes above the bottom edge.
 * When it is too short to reach the edge from there, it slides down along itself until it does.
 * The forearm keeps no state of its own: the same point always gives the same pose.
 */
export function armPose(
    pointX: number, pointY: number, width: number, height: number,
    points: ArmPoints, settings: Readonly<ArmSettings>,
): ArmPose {
    const { scale, reachShare } = settings
    const anchorX = width * settings.baseShare
    const towardX = pointX - anchorX
    const towardY = pointY - height
    const x = anchorX + reachShare * towardX
    const y = height + reachShare * towardY
    const room = height - y
    const aimed = towardX === 0 && towardY === 0 ? 0 : Math.atan2(towardX, -towardY)

    // Leaning left, the right side of the picture holds the higher end of the cut; leaning right, the left
    // one. That end stands `offset` across from the tip and `length` along, so `y + far · cos(tilt - lean)`
    // down: it stays under the edge while the tilt is within `spread` of `lean`.
    const offset = ((aimed < 0 ? points.width : 0) - points.tipX) * scale
    const length = (points.height - points.tipY) * scale
    const far = Math.hypot(offset, length)
    let tilt = aimed
    if(room < far){
        const lean = Math.atan2(offset, length)
        const spread = Math.acos(Math.max(-1, room / far))
        tilt = clamp(aimed, lean - spread, lean + spread)
    }
    const most = settings.maxTilt * Math.PI / 180
    tilt = clamp(tilt, -most, most)

    const sin = Math.sin(tilt)
    const cos = Math.cos(tilt)
    const endY = (endX: number) => y + (endX - points.tipX) * scale * sin + length * cos
    const down = Math.max(0, (height - Math.min(endY(0), endY(points.width))) / cos)
    return { x: x - down * sin, y: y + down * cos, tilt }
}

/**
 * A forearm rising from the bottom edge, its tip part of the way from its anchor to the pointer, turned
 * along that way no farther than its most, the cut at its bottom always under the edge. A pointer low on the
 * screen leaves it out of the screen. The point it aims at glides toward the pointer rather than jumping
 * there, its pose following from that point alone. It rises into the screen when it appears and sinks out
 * of it when it goes.
 *
 * @remarks
 * It takes the size it is given, asks none, and is drawn over the rest: the last child of the content of a
 * layer, stretched over the whole interface, since it reads the pointer in the coordinates of the
 * interface. It is not hit by the pointer. It ticks while shown, and draws again only when it moved.
 * Nothing is drawn before its picture is given, nor while it is gone.
 */
export class PointingArm extends Component {


    /** How it follows the pointer, appears and goes, read at each frame. */
    public readonly settings: ArmSettings = { ...ARM_SETTINGS }

    /** What hears of each move of the forearm, nothing when none. */
    public onMove: ((arm: PointingArm) => void)|null = null

    /**
     * The picture of the forearm, on the GPU.
     *
     * @throws {@link AssetError} When it cannot be loaded.
     */
    public static async loadSprite(gpu: Gpu, assets: Assets): Promise<Sprite> {
        return Sprite.whole(Texture.fromPixels(gpu, await assets.image(ARM_PICTURE)))
    }

    constructor(
        /** Where the pointer is read from. */
        public readonly pointer: PointerSource,

        /** Where it lies in its picture. */
        public readonly points: ArmPoints = ARM_POINTS,
    ){
        super()
    }


    /** Its picture, none while it loads. Setting the same one does nothing. */
    public get sprite(): Sprite|null { return this.#sprite }

    public set sprite(sprite: Sprite|null){
        if(sprite === this.#sprite) return
        this.#sprite = sprite
        this.invalidate()
    }

    /** Where it stands now, none before it first followed the pointer. */
    public get pose(): ArmPose|null { return this.#pose }

    /** The point it aims at now, gliding toward the pointer, none before it first followed it. */
    public get aim(): Readonly<{ x: number, y: number }>|null { return this.#aim }

    /** How far it is in the screen, from 0 when gone to 1 when risen. */
    public get shown(): number { return this.#shown }

    /** Rise into the screen from under the bottom edge, from where it is when it is sinking. */
    public appear(): void {
        this.#wanted = true
    }

    /** Sink out of the screen under the bottom edge, from where it is when it is rising. */
    public disappear(): void {
        this.#wanted = false
    }

    /** Where it would stand to point at a point of the interface, whatever it did before. */
    public poseFor(x: number, y: number): ArmPose {
        const { width, height } = this.bounds
        return armPose(x, y, width, height, this.points, this.settings)
    }

    /**
     * Glide the point it aims at toward a point, for a time, stand where it puts it, and say whether it
     * moved: the aim covers two thirds of the way each {@link ArmSettings.smoothing}. It goes there
     * at once the first time, and while it is gone.
     */
    public glide(x: number, y: number, dt: number): boolean {
        let aim = this.#aim
        if(!aim || this.#shown === 0) aim = this.#aim = { x, y }
        else {
            const smoothing = this.settings.smoothing
            const share = smoothing > 0 ? 1 - Math.exp(-dt / smoothing) : 1
            aim.x += (x - aim.x) * share
            aim.y += (y - aim.y) * share
        }
        const from = this.#pose
        const pose = this.poseFor(aim.x, aim.y)
        if(from && samePose(from, pose)) return false
        this.#pose = pose
        return true
    }


    protected computeHint(): SizeHint {
        return EMPTY_HINT
    }

    /** Start following the pointer, already where it puts it, so the first drawing is right. */
    protected override arranged(): void {
        this.ticking = true
        this.glide(this.pointer.pointerX, this.pointer.pointerY, 0)
    }

    protected override tick(dt: number): void {
        const glided = this.glide(this.pointer.pointerX, this.pointer.pointerY, dt)
        const rose = this.#rise(dt)
        if(!glided && !rose) return
        this.invalidate()
        this.onMove?.(this)
    }

    protected paint(painter: Painter): void {
        const sprite = this.#sprite
        const pose = this.#pose
        if(!sprite || !pose || this.#shown === 0) return
        const { scale } = this.settings
        painter.push()
        painter.translate(pose.x, pose.y + this.#sunk(pose))
        painter.rotate(pose.tilt)
        painter.scale(scale)
        painter.translate(-this.points.tipX, -this.points.tipY)
        painter.sprite(sprite, 0, 0)
        painter.pop()
    }


    #sprite: Sprite|null = null
    #pose: ArmPose|null = null
    #aim: { x: number, y: number }|null = null

    /** How far it is in the screen, and whether it is rising into it or sinking out of it. */
    #shown = 0
    #wanted = false

    /** Move toward the screen or out of it, for a time, and say whether it moved. */
    #rise(dt: number): boolean {
        const goal = this.#wanted ? 1 : 0
        if(this.#shown === goal) return false
        const duration = this.settings.duration
        const step = duration > 0 ? dt / duration : 1
        this.#shown = goal > this.#shown ? Math.min(1, this.#shown + step) : Math.max(0, this.#shown - step)
        return true
    }

    /**
     * How far down it is drawn, rising or sinking: from nothing when risen to below its highest corner when
     * gone, slowing as it comes to rest in the screen.
     */
    #sunk(pose: ArmPose): number {
        const left = 1 - this.#shown
        if(left === 0) return 0
        const highest = pose.y + topOf(this.points, this.settings.scale, pose.tilt)
        const depth = Math.max(0, this.bounds.height - highest)
        return depth * left * left * left
    }
}

/** Are two poses too close to draw again for? */
function samePose(a: ArmPose, b: ArmPose): boolean {
    return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON
        && Math.abs(a.tilt - b.tilt) < EPSILON / 100
}
