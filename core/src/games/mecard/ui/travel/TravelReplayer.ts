import type { Observable, Observer } from "../../sim/base/Observable"
import type { Place } from "../../sim/run/Journey"
import type { Travel } from "../../sim/travel/Travel"

import type { ShownParty } from "./ShownParty"

/** How long the party takes to slide from a place to another, in seconds, however far it is. */
export const WALK_TIME = 0.5

/** What the replay does with something heard when its time comes, and how long it stops on it, in seconds. */
type Play = () => number|void

/**
 * The journey played back, as a battle is: it hears what the travel tells, and plays it in the order it
 * came, each thing waiting for the one before.
 *
 * @remarks
 * The travel changes at once; the replay then shows it. The party slides to a place it moved to, and only
 * then is the way in shown. Once it has played all, it is drained, and the party shown takes where the
 * travel has it, which whatever was missed is caught up by.
 */
export class TravelReplayer {


    /** What hears that it played everything it heard, nothing by default. */
    public onDrained: (() => void)|null = null

    /** What shows the way into a place, nothing by default. */
    public onEnter: ((place: Place) => void)|null = null

    constructor(public readonly party: ShownParty){}


    /** Has it played everything it heard, nothing going on anymore? */
    public get drained(): boolean {
        return this.#queue.length === 0 && this.#hold <= 0
    }

    /** Hear a travel in place of the one before, the party shown taken as it is now. */
    public watch(travel: Travel): void {
        for(const observer of this.#observers.splice(0)) observer.remove()
        this.#queue.length = 0
        this.#hold = 0
        this.#toldDrained = true
        this.#travel = travel
        this.party.resync(travel)
        this.#listen(travel)
    }

    /** Play as far as the time of a frame goes. */
    public frame(dt: number): void {
        let left = dt
        while(left > 0 || this.#hold <= 0){
            if(this.#hold > 0){
                const spent = Math.min(this.#hold, left)
                this.#hold -= spent
                left -= spent
                if(this.#hold > 0) break
                this.party.land()
                continue
            }
            const play = this.#queue.shift()
            if(!play) break
            this.#hold = play() ?? 0
        }
        const { walk } = this.party
        if(walk) walk.share = 1 - this.#hold / WALK_TIME
        this.#checkDrained()
    }

    /** Play everything heard at once, nothing stopped on, and take the travel as it is. */
    public finish(): void {
        for(const play of this.#queue.splice(0)) play()
        this.#hold = 0
        this.#toldDrained = true
        if(this.#travel) this.party.resync(this.#travel)
    }


    readonly #observers: Observer[] = []
    readonly #queue: Play[] = []

    #travel: Travel|null = null

    /** How long the replay still stops, in seconds. */
    #hold = 0

    /** Was it drained when last told? So it tells once each time. */
    #toldDrained = true

    #enqueue(play: Play): void {
        this.#queue.push(play)
        this.#toldDrained = false
    }

    #checkDrained(): void {
        if(!this.drained || this.#toldDrained) return
        this.#toldDrained = true
        if(this.#travel) this.party.resync(this.#travel)
        this.onDrained?.()
    }

    #listen(travel: Travel): void {
        const { party } = this
        const on = <T>(observable: Observable<T>, handle: (event: T) => Play): void => {
            this.#observers.push(observable.add(event => this.#enqueue(handle(event))))
        }
        on(travel.moved, ({ to }) => () => {
            party.leave(to)
            return WALK_TIME
        })
        on(travel.phaseChanged, phase => () => {
            const { place } = travel
            if(phase === "entering" && place) this.onEnter?.(place)
        })
        on(travel.mapDrawn, () => () => {})
    }
}
