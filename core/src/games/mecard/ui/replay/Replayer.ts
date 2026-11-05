import { rgba } from "../../sim/base/Rgba"
import type { Rgba } from "../../sim/base/Rgba"
import type { Observable, Observer } from "../../sim/base/Observable"
import { Vector2 } from "../../sim/base/Vector2"
import { TICKS_PER_SECOND } from "../../sim/battle/Battle"
import type { Battle } from "../../sim/battle/Battle"
import type { Indicator, Pose } from "../../sim/battle/Action"
import { Heart } from "../../sim/heart/Heart"
import type { Effect, HeartsSignal } from "../../sim/battle/signals"
import type { Unit } from "../../sim/battle/Unit"

import type { BattleScene } from "./BattleScene"

/** How long a number of damage or healing floats, in seconds. */
const NUMBER_TIME = 0.9

/** How far a number floats up over its life, in meters. */
const NUMBER_RISE = 0.5

/** How long the replay stops on what is about to act, in seconds. */
const NOTICE_TIME = 0.35

/** How long the replay stops on each card drawn, in seconds. */
export const DRAW_TIME = 0.25

/**
 * How long the replay stops on a hand, in seconds: before the first card a unit draws, once the view is on
 * it, then after each card, so each one can be read.
 */
export const DRAW_PAUSE = 0.5

/** How long the replay stops on what it lights up, a card, a heart, a process, in seconds. */
export const HIGHLIGHT_TIME = 0.5

/** How long a unit takes to fade out, then in, when it blinks, in seconds. */
const BLINK_FADE = 0.08

const DAMAGE_COLOR = rgba(1, 0.4, 0.4)
const HEAL_COLOR = rgba(0.5, 1, 0.5)

/**
 * What the replay does with a signal when its time comes: change the scene, start what plays out over a
 * while, and say how long the replay stops on it, in seconds, none by default.
 */
type Play = () => number|void

/** A signal heard, waiting for its time. */
interface Entry {
    /** When it starts, in seconds of the simulation. */
    readonly at: number
    readonly play: Play

    /** Is it part of a draw, so the view stays on the hand for it? */
    readonly draws: boolean
}

/** Something playing out over a while, in the time of the simulation. */
interface Running {
    readonly at: number
    readonly duration: number

    /** Show it once a share of its life went by, from 0 to 1, then 1 once over. */
    show(share: number): void
}

/** A drawing over the arena for a while, in the time of the simulation. */
interface Shown {
    readonly at: number
    readonly effect: Effect
}

/**
 * The battle played back: it hears each signal of the battle, at the time of the simulation it was told,
 * and plays them in the order they came, the scene changing as they do.
 *
 * @remarks
 * The battle plays a round out at once; the replay then follows the clock of the simulation. Some signals
 * stop it a moment, a card drawn, something about to act, so what comes after waits: those are played one
 * after the other. Once it has played all, it is drained, and the scene takes the state of the battle, which
 * whatever was missed is caught up by.
 */
export class Replayer {


    /** What hears that it played everything it heard, nothing by default. */
    public onDrained: (() => void)|null = null

    /** Are the cards a unit draws shown going to its hand, one after the other? None by default. */
    public animates: (unit: Unit) => boolean = () => false

    /** What hears that the view goes to a unit, about to draw or play a card, nothing by default. */
    public onSelect: ((unit: Unit) => void)|null = null

    constructor(public readonly scene: BattleScene){}


    /** Has it played everything it heard, nothing going on anymore? */
    public get drained(): boolean {
        return this.#queue.length === 0 && this.#hold <= 0 && this.#clock >= this.#end
    }

    /** Hear a battle in place of the one before, its scene taken as it is now. */
    public watch(battle: Battle): void {
        for(const observer of this.#observers.splice(0)) observer.remove()
        this.#queue.length = 0
        this.#running.length = 0
        this.#shown.length = 0
        this.#hold = 0
        this.#battle = battle
        this.#clock = this.#now()
        this.#end = this.#clock
        this.scene.resync(battle)
        this.#listen(battle)
    }

    /** Tell once drained again, even when nothing more is heard: a round with nothing to show. */
    public expect(): void {
        this.#toldDrained = false
    }

    /** Play as far as the time of a frame goes. */
    public frame(dt: number): void {
        let left = dt
        while(left > 0 || this.#ready()){
            if(this.#hold > 0){
                const spent = Math.min(this.#hold, left)
                this.#hold -= spent
                left -= spent
                if(this.#hold > 0) break
                this.scene.notice = null
                this.scene.unlight()
                this.scene.land()
                continue
            }
            if(this.#ready()){
                this.#playNext()
                continue
            }
            // Nothing to play now: the clock goes on to the next signal, or as far as the frame goes.
            const next = this.#queue[0]?.at ?? Infinity
            const step = Math.min(left, Math.max(0, next - this.#clock))
            this.#clock += step
            left -= step
            if(step === 0 && !this.#ready()) break
        }
        const { flight } = this.scene
        if(flight) flight.share = 1 - this.#hold / DRAW_TIME
        if(this.#hold <= 0 && !this.#queue[0]?.draws) this.scene.watchDraw(null)
        this.#draw()
        this.#checkDrained()
    }

    /** Play everything heard at once, nothing shown on the way, and take the battle as it is. */
    public finish(): void {
        this.#queue.length = 0
        this.#running.length = 0
        this.#shown.length = 0
        this.#hold = 0
        this.#clock = this.#now()
        this.#end = this.#clock
        if(this.#battle) this.scene.resync(this.#battle)
        this.#checkDrained()
    }


    readonly #observers: Observer[] = []
    readonly #queue: Entry[] = []
    readonly #running: Running[] = []
    readonly #shown: Shown[] = []

    #battle: Battle|null = null

    /** Where the replay is, in seconds of the simulation. */
    #clock = 0

    /** When the last thing going on ends, in seconds of the simulation. */
    #end = 0

    /** How long the replay still stops, in seconds of the screen. */
    #hold = 0

    /** Was it drained when last told? So it tells once each time. */
    #toldDrained = true

    /** The time of the battle now, in seconds. */
    #now(): number {
        return (this.#battle?.clock ?? 0) / TICKS_PER_SECOND
    }

    #ready(): boolean {
        const next = this.#queue[0]
        return next !== undefined && this.#hold <= 0 && next.at <= this.#clock
    }

    #playNext(): void {
        const entry = this.#queue.shift()
        if(!entry) return
        const hold = entry.play() ?? 0
        if(hold > 0) this.#hold = hold
    }

    /** Add a signal heard, at the time of the battle now, or earlier. */
    #enqueue(play: Play, at = this.#now(), draws = false): void {
        this.#queue.push({ at, play, draws })
        this.#toldDrained = false
    }

    /** Add a moment of a draw, at the time of the battle now. */
    #enqueueDraw(play: Play): void {
        this.#enqueue(play, this.#now(), true)
    }

    /** Bring the view to a unit about to draw, and stop on it, unless it is there already. */
    #watchDraw(unit: Unit): number {
        if(this.scene.drawer === unit) return 0
        this.scene.watchDraw(unit)
        this.onSelect?.(unit)
        return DRAW_PAUSE
    }

    /** Start something playing out over a while, from when it started. */
    #run(running: Running): void {
        this.#running.push(running)
        this.#end = Math.max(this.#end, running.at + running.duration)
    }

    /** Start a drawing over the arena, from when it started. */
    #showEffect(at: number, effect: Effect): void {
        this.#shown.push({ at, effect })
        this.#end = Math.max(this.#end, at + effect.duration)
    }

    /** Move what plays out to the clock, and draw what is shown now. */
    #draw(): void {
        const clock = this.#clock
        for(const running of [...this.#running]){
            const share = running.duration <= 0 ? 1 : Math.min(1, (clock - running.at) / running.duration)
            running.show(share)
            if(share >= 1) this.#running.splice(this.#running.indexOf(running), 1)
        }
        const indicators: Indicator[] = []
        for(const shown of [...this.#shown]){
            const share = (clock - shown.at) / shown.effect.duration
            if(share >= 1 || shown.effect.duration <= 0){
                this.#shown.splice(this.#shown.indexOf(shown), 1)
                continue
            }
            indicators.push(...shown.effect.frame(Math.max(0, share)))
        }
        this.scene.indicators = indicators
    }

    #checkDrained(): void {
        if(!this.drained || this.#toldDrained) return
        this.#toldDrained = true
        if(this.#battle) this.scene.resync(this.#battle)
        this.onDrained?.()
    }

    /** A number floating up from a point, fading. */
    #number(at: Vector2, text: string, color: Rgba): void {
        const start = this.#clock
        this.#showEffect(start, {
            duration: NUMBER_TIME,
            frame: share => [{
                kind: "label", text,
                at: at.plus(new Vector2(0, -NUMBER_RISE * share)),
                color: { ...color, a: color.a * (1 - share) },
            }],
        })
    }

    /** Move a unit of the scene from a pose to another over a while, from when it started. */
    #glide(unit: Unit, from: Pose, to: Pose, at: number, duration: number): void {
        this.#run({
            at, duration,
            show: share => this.scene.change(unit, shown => {
                shown.position = lerp(from.position, to.position, share)
                shown.direction = (lerp(from.direction, to.direction, share).normalized ?? to.direction)
            }, false),
        })
    }

    #listen(battle: Battle): void {
        const { signals } = battle
        const scene = this.scene
        const on = <T>(observable: Observable<T>, handle: (event: T) => Play): void => {
            this.#observers.push(observable.add(event => this.#enqueue(handle(event))))
        }
        on(signals.phase, () => () => {})
        this.#observers.push(signals.drawn.add(({ unit, card, deck }) => {
            const animated = this.animates(unit)
            if(animated) this.#enqueueDraw(() => this.#watchDraw(unit))
            this.#enqueueDraw(() => {
                scene.change(unit, shown => {
                    shown.hand.push(card)
                    if(deck < 0) return
                    shown.decks[deck].pile--
                    shown.cursor = (deck + 1) % shown.decks.length
                })
                if(!animated) return 0
                scene.flight = { unit, card, deck, share: 0 }
                return DRAW_TIME
            })
            if(animated) this.#enqueueDraw(() => DRAW_PAUSE)
        }))
        on(signals.discarded, ({ unit, deck }) => () => {
            scene.change(unit, shown => shown.decks[deck].discard++)
        })
        // Told in the middle of a draw, when a pile runs out.
        this.#observers.push(signals.reshuffled.add(({ unit, deck }) => {
            this.#enqueueDraw(() => scene.change(unit, shown => {
                const piles = shown.decks[deck]
                piles.pile += piles.discard
                piles.discard = 0
            }))
        }))
        // A move is told once over: it starts as long before as it took.
        this.#observers.push(signals.moved.add(({ unit, from, to, duration }) => {
            const at = this.#now() - duration
            this.#enqueue(() => this.#glide(unit, from, to, at, duration), at)
        }))
        on(signals.blinked, ({ unit, from, to }) => () => {
            const at = this.#clock
            this.#run({
                at, duration: 2 * BLINK_FADE,
                show: share => scene.change(unit, shown => {
                    const there = share >= 0.5
                    shown.position = there ? to.position : from.position
                    shown.direction = there ? to.direction : from.direction
                    shown.opacity = Math.abs(1 - 2 * share)
                    if(share >= 1) shown.opacity = 1
                }, false),
            })
        })
        const litCards = (unit: Unit, first: number, last: number, invalid: boolean): number => {
            this.onSelect?.(unit)
            scene.lightCards({ unit, first, last, invalid })
            return HIGHLIGHT_TIME
        }
        on(signals.cardActivated, ({ unit, first, last }) => () => litCards(unit, first, last, false))
        on(signals.cardInvalid, ({ unit, index }) => () => litCards(unit, index, index, true))
        on(signals.chainChanged, ({ unit, cards, cursor }) => () => {
            scene.change(unit, shown => shown.chain = { cards, cursor })
        })
        on(signals.stepStarted, ({ unit, left }) => () => {
            scene.actor = unit
            scene.change(unit, shown => shown.steps = left)
        })
        on(signals.damaged, ({ unit, amount, hearts }) => () => {
            scene.change(unit, shown => {
                shown.hearts = hearts
                this.#number(shown.position, `-${amount}`, DAMAGE_COLOR)
            })
        })
        on(signals.healed, ({ unit, amount, hearts }) => () => {
            scene.change(unit, shown => {
                shown.hearts = hearts
                this.#number(shown.position, `+${amount}`, HEAL_COLOR)
            })
        })
        const bar = ({ unit, hearts }: HeartsSignal): Play => () => {
            scene.change(unit, shown => shown.hearts = hearts)
        }
        // What stands no more is not looked at.
        const litHearts = (unit: Unit, indexes: readonly number[]): number => {
            if(!scene.alive(unit)) return 0
            scene.lightHeart({ unit, indexes })
            return HIGHLIGHT_TIME
        }
        on(signals.heartAdded, signal => () => {
            bar(signal)()
            return litHearts(signal.unit, [signal.index])
        })
        // The hearts are looked at together where they stand, and leave after.
        this.#observers.push(signals.heartRemoved.add(signal => {
            this.#enqueue(() => litHearts(signal.unit, signal.indexes))
            this.#enqueue(bar(signal))
        }))
        // The hearts are looked at together, then what took their places.
        this.#observers.push(signals.heartReplaced.add(signal => {
            this.#enqueue(() => litHearts(signal.unit, signal.indexes))
            this.#enqueue(() => {
                bar(signal)()
                return litHearts(signal.unit, signal.indexes)
            })
        }))
        on(signals.heartWounded, bar)
        on(signals.died, ({ unit }) => () => scene.change(unit, shown => shown.alive = false))
        // A unit coming in is taken as it is when it comes, before it moves on.
        this.#observers.push(signals.spawned.add(({ unit }) => {
            const born = {
                position: unit.position, direction: unit.direction, hearts: Heart.copies(unit.hearts.all),
            }
            this.#enqueue(() => {
                const shown = scene.add(unit)
                shown.position = born.position
                shown.direction = born.direction
                shown.hearts = born.hearts
                shown.statuses = []
                shown.processes = []
                shown.alive = true
            })
        }))
        on(signals.vanished, ({ unit }) => () => scene.remove(unit))
        on(signals.statusAdded, ({ unit, type }) => () => scene.change(unit, shown => {
            if(!shown.statuses.includes(type)) shown.statuses.push(type)
        }))
        on(signals.statusRemoved, ({ unit, type }) => () => scene.change(unit, shown => {
            shown.statuses = shown.statuses.filter(each => each !== type)
        }))
        on(signals.processStarted, ({ unit, process }) => () => {
            scene.change(unit, shown => shown.processes = [...shown.processes, process])
            if(!scene.alive(unit)) return 0
            scene.lightProcess({ unit, process })
            return HIGHLIGHT_TIME
        })
        on(signals.processEnded, ({ unit, process }) => () => scene.change(unit, shown => {
            shown.processes = shown.processes.filter(each => each !== process)
        }))
        on(signals.modifierAdded, () => () => {})
        on(signals.modifierRemoved, () => () => {})
        on(signals.effect, effect => () => this.#showEffect(this.#clock, effect))
        on(signals.notifyStatus, ({ unit, status }) => () => {
            scene.notice = { unit, word: status.type.name }
            return NOTICE_TIME
        })
        on(signals.notifyHeart, ({ unit, heart }) => () => {
            scene.notice = { unit, word: heart.kind.name }
            return NOTICE_TIME
        })
        on(signals.notifyUnit, ({ unit }) => () => {
            scene.notice = { unit, word: "!" }
            return NOTICE_TIME
        })
    }
}

/** A point between two, a share of the way from the first. */
function lerp(from: Vector2, to: Vector2, share: number): Vector2 {
    return from.plus(to.minus(from).times(share))
}
