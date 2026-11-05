import type { Animation, AnimationChain, FrameClock } from "../../../../engine/ui"
import { rgba } from "../../sim/base/Rgba"
import type { Rgba } from "../../sim/base/Rgba"
import type { Observable, Observer } from "../../sim/base/Observable"
import { Vector2 } from "../../sim/base/Vector2"
import type { Battle } from "../../sim/battle/Battle"
import type { Pose } from "../../sim/battle/Action"
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

/** How long each card drawn takes to fly to the hand, in seconds. */
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

/** What a signal changes in the scene when its turn comes, and how long it stops on it, in seconds. */
type Play = () => number|void

/**
 * What each signal of a battle looks like: it hears them as they are told, and adds each to a chain, the
 * scene changing as they play, one after the other.
 *
 * @remarks
 * The battle plays a round out at once: the chain then shows it, each thing waiting for the end of the one
 * before.
 */
export class BattleAnimations {


    /** Are the cards a unit draws shown going to its hand, one after the other? None by default. */
    public animates: (unit: Unit) => boolean = () => false

    /** What hears that the view goes to a unit, about to draw or play a card, nothing by default. */
    public onSelect: ((unit: Unit) => void)|null = null

    constructor(
        public readonly scene: BattleScene,
        public readonly chain: AnimationChain,
        public readonly clock: FrameClock,
    ){}


    /** Add what a battle tells to the chain, until the observers returned are removed. */
    public register(battle: Battle): Observer[] {
        const { signals } = battle
        const { scene } = this
        const observers: Observer[] = []
        const on = <T>(observable: Observable<T>, handle: (event: T) => Play): void => {
            observers.push(observable.add(event => this.chain.add(this.#stopping(handle(event)))))
        }
        const onAnimated = <T>(observable: Observable<T>, animate: (event: T) => Animation): void => {
            observers.push(observable.add(event => this.chain.add(animate(event))))
        }
        on(signals.phase, () => () => {})
        observers.push(signals.drawn.add(({ unit, card, deck }) => {
            const animated = this.animates(unit)
            if(animated) this.chain.add(this.#stopping(() => this.#watchDraw(unit), true))
            this.chain.add(async() => {
                scene.change(unit, shown => {
                    shown.hand.push(card)
                    if(deck < 0) return
                    shown.decks[deck].pile--
                    shown.cursor = (deck + 1) % shown.decks.length
                })
                if(!animated) return
                scene.flight = { unit, card, deck, share: 0 }
                await this.clock.tween(DRAW_TIME, share => {
                    if(scene.flight) scene.flight.share = share
                })
                scene.land()
            })
            if(animated) this.chain.add(this.#stopping(() => DRAW_PAUSE, true))
        }))
        on(signals.discarded, ({ unit, deck }) => () => {
            scene.change(unit, shown => shown.decks[deck].discard++)
        })
        // Told in the middle of a draw, when a pile runs out.
        observers.push(signals.reshuffled.add(({ unit, deck }) => {
            this.chain.add(this.#stopping(() => scene.change(unit, shown => {
                const piles = shown.decks[deck]
                piles.pile += piles.discard
                piles.discard = 0
            }), true))
        }))
        onAnimated(signals.moved, ({ unit, from, to, duration }) => () => {
            return this.#glide(unit, from, to, duration)
        })
        onAnimated(signals.blinked, ({ unit, from, to }) => () => {
            return this.clock.tween(2 * BLINK_FADE, share => scene.change(unit, shown => {
                const there = share >= 0.5
                shown.position = there ? to.position : from.position
                shown.direction = there ? to.direction : from.direction
                shown.opacity = share >= 1 ? 1 : Math.abs(1 - 2 * share)
            }, false))
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
        onAnimated(signals.damaged, ({ unit, amount, hearts }) => () => {
            return this.#hurt(unit, hearts, `-${amount}`, DAMAGE_COLOR)
        })
        onAnimated(signals.healed, ({ unit, amount, hearts }) => () => {
            return this.#hurt(unit, hearts, `+${amount}`, HEAL_COLOR)
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
        observers.push(signals.heartRemoved.add(signal => {
            this.chain.add(this.#stopping(() => litHearts(signal.unit, signal.indexes)))
            this.chain.add(this.#stopping(bar(signal)))
        }))
        // The hearts are looked at together, then what took their places.
        observers.push(signals.heartReplaced.add(signal => {
            this.chain.add(this.#stopping(() => litHearts(signal.unit, signal.indexes)))
            this.chain.add(this.#stopping(() => {
                bar(signal)()
                return litHearts(signal.unit, signal.indexes)
            }))
        }))
        on(signals.heartWounded, bar)
        on(signals.died, ({ unit }) => () => scene.change(unit, shown => shown.alive = false))
        // A unit coming in is taken as it is when it comes, before it moves on.
        observers.push(signals.spawned.add(({ unit }) => {
            const born = {
                position: unit.position, direction: unit.direction, hearts: Heart.copies(unit.hearts.all),
            }
            this.chain.add(this.#stopping(() => {
                const shown = scene.add(unit)
                shown.position = born.position
                shown.direction = born.direction
                shown.hearts = born.hearts
                shown.statuses = []
                shown.processes = []
                shown.alive = true
                scene.enterOrder(unit, battle.initiative)
            }))
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
        onAnimated(signals.effect, effect => () => this.#show(effect))
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
        return observers
    }


    /**
     * An animation changing the scene, then stopping on it for as long as it says, what it lit put out after.
     *
     * @param draws - Is it part of a draw, so the view stays on the hand for it?
     */
    #stopping(play: Play, draws = false): Animation {
        return async() => {
            if(!draws) this.scene.watchDraw(null)
            const hold = play() ?? 0
            if(hold <= 0) return
            await this.clock.wait(hold)
            this.scene.notice = null
            this.scene.unlight()
        }
    }

    /** Bring the view to a unit about to draw, and stop on it, unless it is there already. */
    #watchDraw(unit: Unit): number {
        if(this.scene.drawer === unit) return 0
        this.scene.watchDraw(unit)
        this.onSelect?.(unit)
        return DRAW_PAUSE
    }

    /** Show a drawing over the arena, to its end. */
    async #show(effect: Effect): Promise<void> {
        await this.clock.tween(effect.duration, share => {
            this.scene.indicators = share >= 1 ? [] : effect.frame(share)
        })
    }

    /** Change the hearts of a unit, a number floating up from it, fading. */
    async #hurt(unit: Unit, hearts: readonly Heart[], text: string, color: Rgba): Promise<void> {
        const at = this.scene.of(unit)?.position
        this.scene.change(unit, shown => shown.hearts = hearts)
        if(!at) return
        await this.#show({
            duration: NUMBER_TIME,
            frame: share => [{
                kind: "label", text,
                at: at.plus(new Vector2(0, -NUMBER_RISE * share)),
                color: { ...color, a: color.a * (1 - share) },
            }],
        })
    }

    /** Move a unit of the scene from a pose to another over a while. */
    async #glide(unit: Unit, from: Pose, to: Pose, duration: number): Promise<void> {
        await this.clock.tween(duration, share => this.scene.change(unit, shown => {
            shown.position = lerp(from.position, to.position, share)
            shown.direction = lerp(from.direction, to.direction, share).normalized ?? to.direction
        }, false))
    }
}

/** A point between two, a share of the way from the first. */
function lerp(from: Vector2, to: Vector2, share: number): Vector2 {
    return from.plus(to.minus(from).times(share))
}
