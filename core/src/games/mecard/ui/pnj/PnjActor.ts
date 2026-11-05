import type { Pnj } from "./Pnj"
import { trackAt } from "./PnjAnimation"
import type { PnjAnimation } from "./PnjAnimation"
import type { Gaze } from "./PnjPose"

/**
 * How fast the head and the body go from where they looked before to the new point, per second: the share
 * of the way left covered in a second is `1 - exp(-rate)`. The head is faster, so it leads and the body
 * follows.
 */
const HEAD_RATE = 9
const BODY_RATE = 3.5

/** An animation being played, and since how long, in seconds. */
interface Playing {
    readonly animation: PnjAnimation
    time: number
}

/** Where the character looks now, moved in place at each update. */
interface Looking {
    /** The orientation of its body. */
    orientation: number

    /** The side its head faces, as an orientation: that of the body plus the head turn. */
    headFacing: number

    head: number
    lean: number
}

/**
 * A character brought to life: it looks where it is told, going there over a moment from where it looked
 * before, and plays animations over that gaze.
 *
 * @remarks
 * The gaze goes from the old one to the new one by its values, not by the point looked at: a point
 * crossing in front of the character turns it through its side, as a sheet turning, rather than sweeping
 * its head across. The head, its turn and its direction, goes faster than the body, its orientation and its
 * lean: the head turns toward the point first, the body follows when it has to. The side the head faces
 * is followed rather than its turn, so the head keeps looking at the point while the body turns under it.
 *
 * The animations playing at once add up, their sum kept in the ranges of the pose.
 */
export class PnjActor {


    constructor(
        /** The character it moves. */
        public readonly pnj: Pnj,
    ){
        const { orientation, headTurn, head, lean } = pnj
        this.#looking = { orientation, headFacing: orientation + headTurn, head, lean }
        this.#goal = { orientation, headTurn, head, lean }
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
        const looking = this.#looking
        looking.orientation = goal.orientation
        looking.headFacing = goal.orientation + goal.headTurn
        looking.head = goal.head
        looking.lean = goal.lean
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

    /** Move the gaze and the animations on by a frame, then pose the character. */
    public update(dt: number): void {
        const looking = this.#looking
        const goal = this.#goal
        const head = 1 - Math.exp(-HEAD_RATE * dt)
        const body = 1 - Math.exp(-BODY_RATE * dt)
        looking.orientation += (goal.orientation - looking.orientation) * body
        looking.lean += (goal.lean - looking.lean) * body
        looking.headFacing += (goal.orientation + goal.headTurn - looking.headFacing) * head
        looking.head += (goal.head - looking.head) * head
        for(const each of this.#playing) each.time += dt
        if(this.#playing.some(each => each.time >= each.animation.duration)){
            this.#playing = this.#playing.filter(each => each.time < each.animation.duration)
        }
        this.#pose()
    }


    readonly #looking: Looking
    #goal: Gaze

    /** The pose written at each update, kept so posing allocates nothing. */
    readonly #posed = { orientation: 0, headTurn: 0, head: 0, lean: 0 }

    #playing: Playing[] = []

    /**
     * Pose the character: the gaze, and over it the sum of the animations. `turn` turns the body and the
     * head together, `headTurn` turns the head from the side the body faces toward the other.
     */
    #pose(): void {
        const looking = this.#looking
        let { orientation, headFacing, head, lean } = looking
        let headTurn = 0
        let squash = 0
        for(const { animation, time } of this.#playing){
            const turn = trackAt(animation, "turn", time)
            orientation *= turn
            headFacing *= turn
            headTurn += trackAt(animation, "headTurn", time)
            head += trackAt(animation, "head", time)
            lean += trackAt(animation, "lean", time)
            squash += trackAt(animation, "squash", time)
        }
        const side = orientation < 0 ? -1 : 1
        const posed = this.#posed
        posed.orientation = clamp(orientation, -1, 1)
        posed.headTurn = clamp(headFacing - side * headTurn - posed.orientation, -1, 1)
        posed.head = clamp(head, -1, 1)
        posed.lean = clamp(lean, -1, 1)
        this.pnj.setGaze(posed)
        this.pnj.squash = clamp(squash, 0, 1)
    }
}

function clamp(value: number, low: number, high: number): number {
    return Math.max(low, Math.min(high, value))
}
