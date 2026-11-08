import type { Animation, FrameClock } from "../../../../engine/ui"

/** How a replay plays: stopped, slowly, at its pace, or at once. */
export type PlayMode = "pause"|"slow"|"play"|"fast"

/** How long a stop of the replay lasts in each mode, in seconds, none in the fast one. */
const SPEED_TIME: Readonly<Record<PlayMode, number>> = { pause: 0.5, slow: 2, play: 0.5, fast: 0 }

/** How often the mode is read again while waiting, in seconds. */
const POLL_TIME = 0.05

/**
 * How a replay plays, chosen by the player: the animations it gives wait on its mode, read again as they
 * wait, so changing the mode changes what is going on.
 */
export class PlayControl {


    /** What hears the mode or the step change, nothing by default. */
    public onChange: (() => void)|null = null

    constructor(
        /** What the waits are timed by. */
        public readonly clock: FrameClock,
    ){}


    public get mode(): PlayMode { return this.#mode }

    public set mode(mode: PlayMode){
        if(mode === this.#mode) return
        this.#mode = mode
        this.#steps = 0
        this.onChange?.()
    }

    /** Let the next stop go by while paused. */
    public step(): void {
        if(this.#mode === "pause") this.#steps++
    }

    /** Release at once what waits on the control, so a replay dropped is not held by it. */
    public cancel(): void {
        this.#epoch++
        this.#steps = 0
    }

    /** An animation that stops the replay a while: 2 seconds slow, half a second playing or paused, no time fast. */
    public speed(): Animation {
        return async() => {
            const epoch = this.#epoch
            let share = 0
            while(share < 1 && epoch === this.#epoch){
                const time = SPEED_TIME[this.#mode]
                if(time <= 0) return
                await this.clock.wait(POLL_TIME)
                share += POLL_TIME / time
            }
        }
    }

    /** An animation that holds the replay while paused, until the pause is left or a step is asked. */
    public gate(): Animation {
        return async() => {
            const epoch = this.#epoch
            while(this.#mode === "pause" && epoch === this.#epoch){
                if(this.#steps > 0){
                    this.#steps--
                    return
                }
                await this.clock.wait(POLL_TIME)
            }
        }
    }


    #mode: PlayMode = "play"

    /** The steps asked and not taken yet. */
    #steps = 0

    #epoch = 0
}
