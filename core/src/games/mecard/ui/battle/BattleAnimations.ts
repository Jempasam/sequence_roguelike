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
import type { Card } from "../../sim/card/Card"

import type { Forwarded } from "../forward/Forwarded"
import { forwarding, telling } from "../forward/animate"
import type { Tell } from "../forward/animate"
import type { PlayControl } from "../hud/PlayControl"
import { Color } from "../../../../engine/math"
import { ADDED_EDGE, FOCUS_EDGE, NOTICE_EDGE, REMOVED_EDGE } from "../look/colors"
import type { BattleScene } from "./BattleScene"

/** The places of the cards of a chain that another chain has not. */
function placesOf(chain: readonly Card[], without: readonly Card[]): number[] {
    const held = new Set(without)
    const places: number[] = []
    chain.forEach((card, place) => {
        if(!held.has(card)) places.push(place)
    })
    return places
}

/** How long a number of damage or healing floats, in seconds. */
const NUMBER_TIME = 0.9

/** How far a number floats up over its life, in meters. */
const NUMBER_RISE = 0.5

/** How long the replay stops on what is about to act, in seconds. */
const NOTICE_TIME = 0.35

/** How long each card drawn takes to fly to the hand, in seconds. */
export const DRAW_TIME = 0.25

/**
 * What a {@link Play} returns to stop for as long as the speed of the replay says: on a hand, before the
 * first card a unit draws and after each card, and on what the replay lights up, a card, a heart, a process.
 */
const BEAT = -1

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
        public readonly control: PlayControl,

        /** What is told of each signal as its animation starts and ends, nothing by default. */
        public readonly forwarded: Forwarded|null = null,
    ){}


    /**
     * Add what a battle tells to the chain, until the observers returned are removed.
     *
     * @remarks
     * Each signal is forwarded once, by the animation that shows it: when the scene has changed for a signal
     * played as a {@link Play}, when it starts for the others.
     */
    public register(battle: Battle): Observer[] {
        const { signals } = battle
        const { scene } = this
        const observers: Observer[] = []
        const tell = <T>(observable: Observable<T>, event: T): Tell => {
            return telling(this.forwarded, observable, event)
        }
        const on = <T>(observable: Observable<T>, handle: (event: T) => Play): void => {
            observers.push(observable.add(event => {
                this.chain.add(this.#stopping(handle(event), false, tell(observable, event)))
            }))
        }
        const onAnimated = <T>(observable: Observable<T>, animate: (event: T) => Animation): void => {
            observers.push(observable.add(event => {
                this.chain.add(forwarding(tell(observable, event), animate(event)))
            }))
        }
        //// ROUND ////
        // Phase Change : Nothing, only a place to stop
        on(signals.phase, () => () => {})

        //// DECKS ////
        // Card Drawn : Stop on the Unit, Fly to the Hand Animation
        observers.push(signals.drawn.add(signal => {
            const { unit, card, deck } = signal
            const animated = this.animates(unit)
            if(animated) this.chain.add(this.#stopping(() => this.#watchDraw(unit), true))
            this.chain.add(forwarding(tell(signals.drawn, signal), async() => {
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
            }))
            if(animated) this.chain.add(this.#stopping(() => BEAT, true))
        }))

        // Card Discarded : Discard Pile Grows
        on(signals.discarded, ({ unit, deck }) => () => {
            scene.change(unit, shown => shown.decks[deck].discard++)
        })

        // Deck Reshuffled : Discard Back to Pile, Told in the middle of a draw when a pile runs out
        observers.push(signals.reshuffled.add(signal => {
            const { unit, deck } = signal
            this.chain.add(this.#stopping(() => scene.change(unit, shown => {
                const piles = shown.decks[deck]
                piles.pile += piles.discard
                piles.discard = 0
            }), true, tell(signals.reshuffled, signal)))
        }))

        //// MOVEMENT ////
        // Unit Move : Glide Animation
        onAnimated(signals.moved, ({ unit, from, to, duration }) => () => {
            return this.#glide(unit, from, to, duration)
        })

        // Unit Blink : Fade Out, Move, Fade In Animation
        onAnimated(signals.blinked, ({ unit, from, to }) => () => {
            return this.clock.tween(2 * BLINK_FADE, share => scene.change(unit, shown => {
                const there = share >= 0.5
                shown.position = there ? to.position : from.position
                shown.direction = there ? to.direction : from.direction
                shown.opacity = share >= 1 ? 1 : Math.abs(1 - 2 * share)
            }, false))
        })

        //// CARDS ////
        const litCards = (unit: Unit, first: number, last: number, invalid: boolean): number => {
            this.onSelect?.(unit)
            scene.lightCards({ unit, first, last, invalid, edge: FOCUS_EDGE })
            return BEAT
        }

        // Card Activated : Held while Paused, Light the Cards
        observers.push(signals.cardActivated.add(event => {
            const { unit, first, last } = event
            this.chain.add(this.control.gate())
            this.chain.add(this.#stopping(
                () => litCards(unit, first, last, false), false, tell(signals.cardActivated, event),
            ))
        }))

        // Card Invalid : Held while Paused, Light the Card as Invalid
        observers.push(signals.cardInvalid.add(event => {
            const { unit, index } = event
            this.chain.add(this.control.gate())
            this.chain.add(this.#stopping(
                () => litCards(unit, index, index, true), false, tell(signals.cardInvalid, event),
            ))
        }))

        // Chain Overflowed : Outline Every Card of the Chain in Red, it is emptied right after
        observers.push(signals.chainOverflowed.add(event => {
            const { unit, cards } = event
            this.chain.add(this.#stopping(() => {
                if(!scene.of(unit)) return 0
                scene.lightCards({
                    unit, first: 0, last: cards.length - 1, invalid: false,
                    indexes: cards.map((_, index) => index), edge: REMOVED_EDGE,
                })
                return BEAT
            }, false, tell(signals.chainOverflowed, event)))
        }))

        // Chain Changed : Outline Leaving Cards in Red then Remove, Put In Cards then Outline in Green
        // A chain built or emptied at the turn of a round is not looked at card by card.
        observers.push(signals.chainChanged.add(event => {
            const { unit, cards, cursor, borrowed } = event
            let before: readonly Card[] = []
            this.chain.add(this.#stopping(() => {
                const shown = scene.of(unit)
                if(!shown) return 0
                before = shown.chain.cards
                if(before.length === 0 || cards.length === 0) return 0
                const gone = placesOf(before, cards)
                if(gone.length === 0) return 0
                scene.lightCards({
                    unit, first: gone[0], last: gone[gone.length - 1], invalid: false,
                    indexes: gone, edge: REMOVED_EDGE,
                })
                return BEAT
            }))
            this.chain.add(this.#stopping(() => {
                scene.change(unit, shown => shown.chain = { cards, cursor, borrowed })
                if(!scene.alive(unit) || before.length === 0 || cards.length === 0) return 0
                const added = placesOf(cards, before)
                if(added.length === 0) return 0
                scene.lightCards({
                    unit, first: added[0], last: added[added.length - 1], invalid: false,
                    indexes: added, edge: ADDED_EDGE,
                })
                return BEAT
            }, false, tell(signals.chainChanged, event)))
        }))

        //// STEPS ////
        // Step Started : Unit Becomes the Actor, Steps Left Updated
        on(signals.stepStarted, ({ unit, left }) => () => {
            scene.actor = unit
            scene.change(unit, shown => shown.steps = left)
        })

        //// HEARTS ////
        // Unit Damaged : Hearts Change, Red Number Floats Up
        onAnimated(signals.damaged, ({ unit, amount, hearts }) => () => {
            return this.#hurt(unit, hearts, `-${amount}`, DAMAGE_COLOR)
        })

        // Unit Healed : Hearts Change, Green Number Floats Up
        onAnimated(signals.healed, ({ unit, amount, hearts }) => () => {
            return this.#hurt(unit, hearts, `+${amount}`, HEAL_COLOR)
        })

        const bar = ({ unit, hearts }: HeartsSignal): Play => () => {
            scene.change(unit, shown => shown.hearts = hearts)
        }
        // What stands no more is not looked at.
        const litHearts = (unit: Unit, indexes: readonly number[], edge: Color): number => {
            if(!scene.alive(unit)) return 0
            scene.lightHeart({ unit, indexes, edge })
            return BEAT
        }

        // Heart Added : Hearts Change, Light the Heart
        on(signals.heartAdded, signal => () => {
            bar(signal)()
            return litHearts(signal.unit, [signal.index], ADDED_EDGE)
        })

        // Heart Removed : Light the Hearts Together where they Stand, then Leave
        observers.push(signals.heartRemoved.add(signal => {
            this.chain.add(this.#stopping(
                () => litHearts(signal.unit, signal.indexes, REMOVED_EDGE),
                false,
                tell(signals.heartRemoved, signal),
            ))
            this.chain.add(this.#stopping(bar(signal)))
        }))

        // Heart Replaced : Light the Hearts Together, then Light what took their Places
        observers.push(signals.heartReplaced.add(signal => {
            this.chain.add(this.#stopping(() => litHearts(signal.unit, signal.indexes, REMOVED_EDGE)))
            this.chain.add(this.#stopping(() => {
                bar(signal)()
                return litHearts(signal.unit, signal.indexes, ADDED_EDGE)
            }, false, tell(signals.heartReplaced, signal)))
        }))

        // Heart Wounded : Hearts Change
        on(signals.heartWounded, bar)

        //// UNITS ////
        // Unit Died : Not Alive Anymore
        on(signals.died, ({ unit }) => () => scene.change(unit, shown => shown.alive = false))

        // Unit Spawned : Appear as it is when it comes, before it moves on
        observers.push(signals.spawned.add(signal => {
            const { unit } = signal
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
            }, false, tell(signals.spawned, signal)))
        }))

        // Unit Vanished : Removed from the Scene
        on(signals.vanished, ({ unit }) => () => scene.remove(unit))

        //// STATUSES ////
        // Status Added : Status Appears
        on(signals.statusAdded, ({ unit, type, level }) => () => scene.change(unit, shown => {
            if(!shown.statuses.some(each => each.type === type)) shown.statuses.push({ type, level })
        }))

        // Status Leveled : Level Changes
        on(signals.statusLeveled, ({ unit, type, level }) => () => scene.change(unit, shown => {
            const held = shown.statuses.find(each => each.type === type)
            if(held) held.level = level
        }))

        // Status Removed : Status Disappears
        on(signals.statusRemoved, ({ unit, type }) => () => scene.change(unit, shown => {
            shown.statuses = shown.statuses.filter(each => each.type !== type)
        }))

        //// PROCESSES ////
        // Process Started : Process Appears, Light It
        on(signals.processStarted, ({ unit, process }) => () => {
            scene.change(unit, shown => shown.processes = [...shown.processes, process])
            if(!scene.alive(unit)) return 0
            scene.lightProcess({ unit, process })
            return BEAT
        })

        // Process Ended : Process Disappears
        on(signals.processEnded, ({ unit, process }) => () => scene.change(unit, shown => {
            shown.processes = shown.processes.filter(each => each !== process)
        }))

        //// TETHERS ////
        // Tethered : Tether Appears
        on(signals.tethered, ({ tether }) => () => {
            scene.tethers = [...scene.tethers, tether]
        })

        // Untethered : Tether Disappears
        on(signals.untethered, ({ tether }) => () => {
            scene.tethers = scene.tethers.filter(each => each !== tether)
        })

        //// EFFECTS ////
        // Effect : Drawing Over the Arena Animation
        onAnimated(signals.effect, effect => () => this.#show(effect))

        //// NOTICES ////
        // What is notified is outlined in blue where it stands, and its unit has its word said over it.
        const noticed = (unit: Unit, word: string, outline?: () => void): Play => () => {
            scene.notice = { unit, word }
            outline?.()
            return NOTICE_TIME
        }

        // Status Notified : Outline the Status, Say its Name
        on(signals.notifyStatus, ({ unit, target }) => noticed(unit, target.type.name, () => {
            scene.lightStatus({ unit, type: target.type, edge: NOTICE_EDGE })
        }))

        // Heart Notified : Outline the Heart, Say its Name
        on(signals.notifyHeart, ({ unit, target }) => noticed(unit, target.kind.name, () => {
            const index = unit.hearts.all.indexOf(target)
            if(index >= 0) scene.lightHeart({ unit, indexes: [index], edge: NOTICE_EDGE })
        }))

        // Unit Notified : Say "!"
        on(signals.notifyUnit, ({ unit }) => noticed(unit, "!"))
        return observers
    }


    /**
     * An animation changing the scene, then stopping on it for as long as it says, what it lit put out after.
     *
     * @param draws - Is it part of a draw, so the view stays on the hand for it?
     * @param tell - What tells the scene has changed, and that the stop is over.
     */
    #stopping(play: Play, draws = false, tell?: Tell): Animation {
        return async() => {
            if(!draws) this.scene.watchDraw(null)
            const hold = play() ?? 0
            tell?.("start")
            if(hold === 0){
                tell?.("end")
                return
            }
            // The pauses of the replay follow its speed, the others are as long as they are.
            if(hold === BEAT) await this.control.speed()()
            else await this.clock.wait(hold)
            this.scene.notice = null
            this.scene.unlight()
            tell?.("end")
        }
    }

    /** Bring the view to a unit about to draw, and stop on it, unless it is there already. */
    #watchDraw(unit: Unit): number {
        if(this.scene.drawer === unit) return 0
        this.scene.watchDraw(unit)
        this.onSelect?.(unit)
        return BEAT
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
            // Facing straight away, the blend goes through nothing halfway: the unit turns through its right.
            shown.direction = lerp(from.direction, to.direction, share).normalized ?? from.direction.right
        }, false))
    }
}

/** A point between two, a share of the way from the first. */
function lerp(from: Vector2, to: Vector2, share: number): Vector2 {
    return from.plus(to.minus(from).times(share))
}
