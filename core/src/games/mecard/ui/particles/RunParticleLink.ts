import type { Painter, Sprite } from "../../../../engine/gpu"
import { ParticleSystem, seededRandom } from "../../../../engine/particles"
import type { Random } from "../../../../engine/particles"
import { Scope } from "../../../../lifetime"
import type { Observable, Observer } from "../../sim/base/Observable"
import type { Battle } from "../../sim/battle/Battle"
import type { Hero } from "../../sim/run/Hero"
import type { Run } from "../../sim/run/Run"
import type { ForwardPhase, Forwarded } from "../forward/Forwarded"
import type { ParticleContext, ParticlePoint } from "./ParticleContext"
import type { Look } from "./recipes"
import {
    CARD_BLUE, COINS_LANDING, DUST, FLASH, fly, glint, HEAL_GREEN, HEART_RED, ITEM_VIOLET, radial, ring, rise,
    SPARK, sparkAt, sweep, throwCoins, UPGRADE_GOLD, USABLE_GREEN,
} from "./recipes"

/** The most particles alive at once, for each way they blend. */
export const MAX_PARTICLES = 512

/** An emission waiting for its time. */
interface Pending {
    left: number
    readonly run: () => void
}

/**
 * Tells the screens what a run does with particles: it draws the sparks and the flying coins of what the
 * run gains and what its battles tell, as the screen shows it.
 *
 * @remarks
 * Made like {@link RunSoundLink}, it reads the run and changes nothing of it, and reacts when the screen
 * plays an event, told by a {@link Forwarded}. Its randomness is its own, never the one of the run. What it
 * shows is placed by a {@link ParticleContext}, that the screen shown sets while it is mounted: without
 * one, or where it answers none, nothing is emitted.
 */
export class RunParticleLink {


    /** The run it follows, which may be another one later. */
    public get engine(): Run { return this.#engine }

    public set engine(run: Run){
        this.#unregisterObservers()
        this.clear()
        this.#follow(run)
    }

    /** What places the particles, set by the screen shown and none when no screen is. */
    public context: ParticleContext|null = null

    /** The particles that blend normally. */
    public readonly alpha = new ParticleSystem(MAX_PARTICLES)

    /** The particles that glow: they add up. */
    public readonly additive = new ParticleSystem(MAX_PARTICLES, { blend: "additive" })

    constructor(
        engine: Run,

        /** What tells it the animations play, which the particles follow. */
        public readonly forwarded: Forwarded,

        /** The coin of the gold, none before it is loaded. */
        public readonly coin: () => Sprite|null,

        /** The randomness of the display, apart from the run. */
        public readonly random: Random = seededRandom(engine.rng.state),
    ){
        this.#engine = engine
        this.#follow(engine)
    }


    /** Are there particles alive or waiting? */
    public get active(): boolean {
        return this.alpha.count > 0 || this.additive.count > 0 || this.#pending.length > 0
    }

    /** Move the particles on, and start the ones that waited for it. */
    public update(dt: number): void {
        for(const pending of [...this.#pending]){
            pending.left -= dt
            if(pending.left > 0) continue
            this.#pending.splice(this.#pending.indexOf(pending), 1)
            pending.run()
        }
        this.alpha.update(dt)
        this.additive.update(dt)
    }

    /** Draw the particles, in the interface. */
    public draw(painter: Painter): void {
        this.alpha.draw(painter)
        this.additive.draw(painter)
    }

    /** Remove every particle, alive or waiting. */
    public clear(): void {
        this.alpha.clear()
        this.additive.clear()
        this.#pending.length = 0
    }

    /** Stop following the run. */
    public dispose(): void {
        this.#unregisterObservers()
        this.clear()
    }


    #engine: Run
    #observers = new Scope()
    #battleObservers: Observer[] = []
    readonly #pending: Pending[] = []

    /** The gold the party held when the screen last showed a change of it. */
    #gold = 0

    #follow(run: Run): void {
        this.#engine = run
        this.#gold = run.gold
        this.#observers.remove()
        this.#observers = new Scope(
            // Heard as it is told, not as it plays: the battle is followed before its first event.
            run.battleStarted.add(battle => this.#followBattle(battle)),
            this.forwarded.on(run.goldChanged, (total, phase) => this.#goldChanged(total, phase)),
            ...this.#journey(run.travel),
            ...this.#party(run),
        )
        if(run.battle) this.#followBattle(run.battle)
    }

    /** The gold of the party changed: coins fly to the counter when it grew and the counter is shown. */
    #goldChanged(total: number, phase: ForwardPhase): void {
        if(phase !== "start") return
        const gained = total - this.#gold
        this.#gold = total
        const { context } = this
        const counter = context?.goldCounter()
        if(gained <= 0 || !context || !counter) return
        const { place } = this.#engine.travel
        const from = (place && context.placePosition(place)) ?? context.center()
        this.#coins(from, counter, gained)
    }

    /** What the journey tells. */
    #journey(travel: Run["travel"]): Observer[] {
        const here = (context: ParticleContext): ParticlePoint => {
            const { place } = travel
            return (place && context.placePosition(place)) ?? context.center()
        }
        return [
            this.#on(travel.moved, ({ to }, context) => {
                const at = context.placePosition(to)
                if(at) ring(this.additive, this.random, at, 12, 4, { from: 0xe8f4ff, size: 3, life: 0.4 }, 50)
            }),
            this.#on(travel.visitStarted, (_halt, context) => {
                rise(this.additive, this.random, here(context), 6, { from: 0xffffff, size: 2, life: 0.6 })
            }),
            this.#on(travel.haltImpacted, (_halt, context) => {
                radial(
                    this.additive, this.random, here(context), 10, { from: 0xfff2b0, size: 3, life: 0.4 },
                    { speed: 70 },
                )
            }),
            this.#on(travel.fightEntered, (place, context) => {
                const at = context.placePosition(place) ?? context.center()
                radial(
                    this.additive, this.random, at, 14, { from: 0xff4a3a, to: 0xff9a3a, size: 3, life: 0.5 },
                    { speed: 90 },
                )
            }),
            this.#on(travel.fightLeft, (place, context) => {
                const at = context.placePosition(place) ?? context.center()
                radial(this.alpha, this.random, at, 8, { from: 0x9a9aa8, size: 4, life: 0.6 }, { speed: 30 })
            }),
            this.#on(travel.floorEntered, (_floor, context) => {
                const { width, height } = context.size()
                sweep(
                    this.additive, this.random, width, height, 24,
                    { from: 0xffffff, size: 2, life: 0.6, stretched: true },
                )
            }),
        ]
    }

    /** What the run gives to the party. */
    #party(run: Run): Observer[] {
        const toHero = (hero: Hero, context: ParticleContext, look: Look, count: number): void => {
            const target = context.heroPortrait(hero)
            const from = context.center()
            if(!target){
                rise(this.additive, this.random, from, count, look)
                return
            }
            fly(this.additive, this.random, from, target, count, look, 50)
            this.#later(look.life, () => {
                radial(this.additive, this.random, target, 6, { ...look, life: 0.35 }, { speed: 50 })
            })
        }
        return [
            this.#on(run.cardsGained, (cards, context) => {
                this.#cards(context.center(), context.deckPile(), cards.length)
            }),
            this.#on(run.itemGained, ({ hero }, context) => toHero(hero, context, ITEM_VIOLET, 12)),
            this.#on(run.usableGained, ({ hero }, context) => toHero(hero, context, USABLE_GREEN, 12)),
            this.#on(run.heartGained, ({ hero }, context) => toHero(hero, context, HEART_RED, 6)),
            this.#on(run.heartLootGiven, (_loot, context) => {
                const at = context.center()
                rise(this.alpha, this.random, at, 6, { ...HEART_RED, size: 5, life: 1 }, 20)
                rise(this.additive, this.random, at, 4, { from: 0xffd34d, size: 2, life: 1 }, 20)
            }),
            this.#on(run.boosterOpened, (_booster, context) => {
                const at = context.center()
                for(let index = 0; index < 24; index++){
                    const hue = Math.floor(this.random() * 0xffffff) | 0x808080
                    radial(
                        this.additive, this.random, at, 1, { from: hue, size: 3, life: 0.8 },
                        { speed: 160, drag: 3 },
                    )
                }
                radial(
                    this.additive, this.random, at, 1, { from: 0xffffff, size: 24, end: 0, life: 0.2 },
                    { speed: 0 },
                )
            }),
            this.#on(run.upgradeApplied, (_upgrade, context) => {
                rise(this.alpha, this.random, context.center(), 10, UPGRADE_GOLD, 14, 120)
            }),
            this.#on(run.heroJoined, (hero, context) => {
                const at = context.heroPortrait(hero) ?? context.center()
                rise(this.additive, this.random, at, 16, { from: 0xdff4ff, size: 3, life: 0.8 }, 16, 40)
            }),
            this.#on(run.heroLeft, (hero, context) => {
                const at = context.heroPortrait(hero) ?? context.center()
                radial(
                    this.alpha, this.random, at, 12, { from: 0x9a9aa8, size: 5, life: 1 },
                    { speed: 30, angle: [-Math.PI, 0] },
                )
            }),
            this.#on(run.kitHired, (_kit, context) => {
                ring(
                    this.additive, this.random, context.center(), 8, 14,
                    { from: 0xff9a3a, size: 3, life: 0.6 }, -20,
                )
            }),
            this.#on(run.petTamed, (_monster, context) => {
                const look = { from: 0xff8ad0, size: 4, life: 1.1 }
                rise(this.alpha, this.random, context.center(), 6, look, 14, 40)
            }),
            this.#on(run.partyHealed, (heroes, context) => {
                for(const hero of heroes){
                    const at = context.heroPortrait(hero)
                    if(at) rise(this.additive, this.random, at, 5, HEAL_GREEN)
                }
            }),
        ]
    }

    #followBattle(battle: Battle): void {
        this.#unregisterBattle()
        const { signals } = battle
        this.#battleObservers = [
            this.#on(battle.onGetGold, ({ unit, amount }, context) => {
                const from = context.unitPosition(unit)
                if(from) this.#coins(from, context.goldCounter(), amount)
            }),
            this.#on(battle.onGetCards, ({ unit, cards }, context) => {
                const from = context.unitPosition(unit)
                if(from) this.#cards(from, context.deckPile(), cards.length)
            }),
            this.#on(signals.damaged, ({ unit, amount }, context) => {
                const at = context.unitPosition(unit)
                if(at) this.#hurt(at, amount)
            }),
            this.#on(signals.heartWounded, ({ unit, indexes }, context) => {
                const at = context.heartsOf(unit)
                if(!at) return
                radial(
                    this.alpha, this.random, at, Math.min(6, Math.max(3, indexes.length * 2)),
                    { ...HEART_RED, size: 3 }, { speed: 40, angle: [-Math.PI, 0], gravity: 300 },
                )
            }),
            this.#on(signals.healed, ({ unit }, context) => {
                const at = context.unitPosition(unit)
                if(at) rise(this.additive, this.random, at, 8, HEAL_GREEN, 10, 70)
            }),
            this.#on(signals.died, ({ unit }, context) => {
                const at = context.unitPosition(unit)
                if(!at) return
                radial(this.alpha, this.random, at, 20, DUST, { speed: 75, speedSpread: 0.5, drag: 2.5 })
                radial(this.additive, this.random, at, 6, FLASH, { speed: 200 })
            }),
            this.#on(signals.spawned, ({ unit }, context) => {
                const at = context.feetOf(unit)
                if(!at) return
                ring(this.additive, this.random, at, 14, 16, { from: 0xc8b8ff, size: 3, life: 0.5 }, -32)
                radial(
                    this.additive, this.random, at, 1, { from: 0xffffff, size: 16, end: 0, life: 0.2 },
                    { speed: 0 },
                )
            }),
            this.#on(signals.statusAdded, ({ unit }, context) => {
                const at = context.unitPosition(unit)
                if(at) rise(this.additive, this.random, at, 6, { from: 0x9ad8ff, size: 3, life: 0.6 }, 10, 60)
            }),
            this.#on(signals.statusRemoved, ({ unit }, context) => {
                const at = context.unitPosition(unit)
                if(!at) return
                const gone = { from: 0x9ad8ff, size: 3, life: 0.6 }
                radial(this.additive, this.random, at, 6, gone, { speed: 40 })
            }),
            this.#on(signals.cardActivated, ({ unit }, context) => {
                const at = context.unitPosition(unit)
                if(!at) return
                ring(this.additive, this.random, at, 8, 6, { ...FLASH, size: 3, life: 0.4 }, 60)
            }),
            this.#on(signals.cardInvalid, ({ unit }, context) => {
                const at = context.unitPosition(unit)
                if(!at) return
                radial(
                    this.alpha, this.random, at, 6, { from: 0xff6a5a, to: 0x9a9aa8, size: 3, life: 0.35 },
                    { speed: 50, gravity: 250 },
                )
            }),
            this.#on(signals.chainOverflowed, ({ unit }, context) => {
                const at = context.unitPosition(unit)
                if(!at) return
                ring(this.additive, this.random, at, 10, 8, { from: 0xff9a3a, size: 3, life: 0.35 }, 70)
            }),
            this.#on(signals.drawn, (_signal, context) => {
                const at = context.deckPile()
                if(!at) return
                const drawn = { from: 0xdff4ff, size: 2, life: 0.3 }
                radial(this.additive, this.random, at, 3, drawn, { speed: 40 })
            }),
            this.#on(signals.moved, ({ unit, from, to }, context) => {
                if(from.position.equals(to.position)) return
                const at = context.feetOf(unit)
                if(!at) return
                radial(
                    this.alpha, this.random, at, 3, { from: 0x9a9aa8, size: 3, life: 0.3 },
                    { speed: 20, angle: [-Math.PI, 0] },
                )
            }),
            this.#on(signals.blinked, ({ unit }, context) => {
                const at = context.unitPosition(unit)
                if(!at) return
                const blink = { from: 0x6ae0ff, size: 3, life: 0.5 }
                radial(this.additive, this.random, at, 12, blink, { speed: 110 })
            }),
            this.#on(signals.bumped, ({ struck }, context) => {
                const at = context.unitPosition(struck)
                if(!at) return
                const spark = { from: 0xffffff, size: 3, life: 0.2 }
                radial(this.additive, this.random, at, 8, spark, { speed: 90 })
                radial(this.alpha, this.random, at, 4, { from: 0x9a9aa8, size: 3, life: 0.2 }, { speed: 50 })
            }),
        ]
    }

    /** The sparks of a blow, more and larger the harder it is. */
    #hurt(at: ParticlePoint, amount: number): void {
        if(amount < 4){
            radial(this.additive, this.random, at, 4, { ...SPARK, size: 2 }, { speed: 80 })
            return
        }
        const flash = amount < 12 ? 8 : 14
        if(amount < 12){
            radial(this.additive, this.random, at, 8, SPARK, { speed: 140 })
        }
        else {
            radial(this.additive, this.random, at, 16, { ...SPARK, size: 4, life: 0.3 }, { speed: 200 })
            radial(
                this.alpha, this.random, at, 4, { from: 0x3a2a2a, size: 4, life: 0.3, fades: false },
                { speed: 120, gravity: 400 },
            )
        }
        const glow = { from: 0xffffff, size: flash, end: 0, life: 0.1 }
        radial(this.additive, this.random, at, 1, glow, { speed: 0 })
    }

    /** Cards go from a point to the deck, lit as they land, or rise on the spot when there is no deck. */
    #cards(from: ParticlePoint, deck: ParticlePoint|null, count: number): void {
        const particles = Math.min(count, 6) * 5
        if(!deck){
            rise(this.additive, this.random, from, particles, CARD_BLUE)
            return
        }
        fly(this.additive, this.random, from, deck, particles, CARD_BLUE)
        this.#later(CARD_BLUE.life, () => {
            ring(this.additive, this.random, deck, 8, 12, { from: 0xbfe6ff, size: 3, end: 0, life: 0.3 }, -40)
        })
    }

    /** Throw the coins of a gain from a point, to the counter when there is one, with their sparks. */
    #coins(from: ParticlePoint, to: ParticlePoint|null, amount: number): void {
        throwCoins(this.alpha, this.random, from, to, amount, this.coin(), (delay, at) => {
            this.#later(delay, () => glint(this.additive, this.random, at))
        })
        if(to) this.#later(COINS_LANDING, () => sparkAt(this.additive, this.random, to))
    }

    /** React when the animation of an event starts, if a screen places the particles. */
    #on<T>(observable: Observable<T>, react: (event: T, context: ParticleContext) => void): Observer {
        return this.forwarded.on(observable, (event, phase) => {
            const { context } = this
            if(phase === "start" && context) react(event, context)
        })
    }

    #later(delay: number, run: () => void): void {
        this.#pending.push({ left: delay, run })
    }

    #unregisterObservers(): void {
        this.#unregisterBattle()
        this.#observers.remove()
        this.#observers = new Scope()
    }

    #unregisterBattle(): void {
        for(const observer of this.#battleObservers) observer.remove()
        this.#battleObservers = []
    }
}
