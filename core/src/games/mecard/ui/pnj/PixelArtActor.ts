import type { PixelArtGaze, PixelArtPnj } from "./PixelArtPnj"
import { trackAt } from "./PnjAnimation"
import type { PnjAnimation } from "./PnjAnimation"

/**
 * How fast the body goes from where it looked before to the new point, per second: the share of the way left
 * covered in a second is `1 - exp(-rate)`.
 */
const BODY_RATE = 4

/**
 * How much of the track of the head of an animation leans the body, having no head: a nod bows the body, a
 * look up bends it back.
 */
const HEAD_AS_LEAN = 0.5

/**
 * How much of the track of the turn of the head of an animation narrows the body, having no head to turn: a
 * head shaken is a body turning a little from side to side.
 */
const HEAD_TURN_AS_NARROWING = 0.5

/** An animation being played, and since how long, in seconds. */
interface Playing {
    readonly animation: PnjAnimation
    time: number
}

/**
 * A character drawn from a sprite brought to life: it looks where it is told, going there over a moment from
 * where it looked before, and plays animations over that gaze.
 *
 * @remarks
 * It plays the animations of {@link PnjActor}, but has no head: the track of the direction of the head leans
 * the body, and that of its turn narrows it. The animations playing at once add up, their sum kept in the
 * ranges of the pose.
 */
export class PixelArtActor {


    constructor(
        /** The character it moves. */
        public readonly pnj: PixelArtPnj,
    ){
        const { orientation, lean } = pnj
        this.#looking = { orientation, lean }
        this.#goal = { orientation, lean }
    }


    /** The animations playing, the oldest first. */
    public get playing(): readonly PnjAnimation[] {
        return this.#playing.map(each => each.animation)
    }

    /** Turn the gaze toward a point, in the coordinates of the character, over a moment. */
    public look(x: number, y: number): void {
        this.#goal = this.pnj.gazeAt(x, y)
    }

    /** Take a gaze at once, with no moment to reach it. */
    public lookNow(x: number, y: number): void {
        const goal = this.pnj.gazeAt(x, y)
        this.#goal = goal
        this.#looking.orientation = goal.orientation
        this.#looking.lean = goal.lean
    }

    /** Play an animation from its start, over the others playing. Playing one already playing restarts it. */
    public play(animation: PnjAnimation): void {
        this.#playing = this.#playing.filter(each => each.animation !== animation)
        this.#playing.push({ animation, time: 0 })
    }

    /** Stop every animation, the character back to its gaze at the next update. */
    public stop(): void {
        this.#playing = []
    }

    /**
     * Move the gaze and the animations on by a frame, then pose the character.
     *
     * @returns Did the pose change, so the character is to be drawn again?
     */
    public update(dt: number): boolean {
        const looking = this.#looking
        const goal = this.#goal
        const body = 1 - Math.exp(-BODY_RATE * dt)
        looking.orientation += (goal.orientation - looking.orientation) * body
        looking.lean += (goal.lean - looking.lean) * body
        for(const each of this.#playing) each.time += dt
        if(this.#playing.some(each => each.time >= each.animation.duration)){
            this.#playing = this.#playing.filter(each => each.time < each.animation.duration)
        }
        return this.#pose()
    }


    readonly #looking: { orientation: number, lean: number }
    #goal: PixelArtGaze
    #playing: Playing[] = []

    /** Pose the character: the gaze, and over it the sum of the animations. Tells whether the pose changed. */
    #pose(): boolean {
        const looking = this.#looking
        let { orientation, lean } = looking
        let narrowing = 0
        let squash = 0
        for(const { animation, time } of this.#playing){
            orientation *= trackAt(animation, "turn", time)
            narrowing += Math.abs(trackAt(animation, "headTurn", time)) * HEAD_TURN_AS_NARROWING
            lean += trackAt(animation, "lean", time) + trackAt(animation, "head", time) * HEAD_AS_LEAN
            squash += trackAt(animation, "squash", time)
        }
        const side = orientation < 0 ? -1 : 1
        const pnj = this.pnj
        const was = [pnj.orientation, pnj.lean, pnj.squash]
        pnj.setGaze({
            orientation: clamp(side * Math.max(0, Math.abs(orientation) - narrowing), -1, 1),
            lean: clamp(lean, -1, 1),
        })
        pnj.squash = clamp(squash, 0, 1)
        return pnj.orientation !== was[0] || pnj.lean !== was[1] || pnj.squash !== was[2]
    }
}

function clamp(value: number, low: number, high: number): number {
    return Math.max(low, Math.min(high, value))
}
