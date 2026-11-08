import { Observable } from "../base/Observable"
import { rgba } from "../base/Rgba"
import { Rng } from "../base/Rng"
import { Vector2 } from "../base/Vector2"
import type { ErrorSink } from "../base/Observable"
import type { Card } from "../card/Card"

import { CardChain } from "../card/CardChain"
import type { Carried, UsableSlot } from "../usable/Usable"
import { Heart } from "../heart/Heart"
import { SOLID_HEART } from "../heart/subs/SolidHeartKind"
import type { Item } from "../item/Item"
import type { Process } from "../process/Process"
import type { Status, StatusType } from "../status/Status"
import { battleStateOf, saveBattle } from "../save/battleSave"
import type { BattleSave, SaveOptions } from "../save/battleSave"
import { planFor } from "../ai/Bot"
import { FLEETING } from "../status/subs/Fleeting"
import { Vanishing } from "../process/subs/Vanishing"

import type { Action, ActionRun, PlugContext, Pose } from "./Action"
import { touches } from "./Area"
import type { Area } from "./Area"
import type { Arena } from "./Arena"
import type { BattleState, UnitState } from "./BattleState"
import { labelEffect, polygonEffect } from "./effects"
import type { BattleEvent, MoveEvent, Nature } from "./events"
import { BattleSignals } from "./signals"
import type { Effect, Tether } from "./signals"
import { Team } from "./Team"
import { COLLISION_SLACK, EIGHT_WAYS, PUSH_BLOCKED_DAMAGE, TICKS_PER_SECOND, UNBLOCK_DAMAGE } from "./rules"
import { Unit, UNIT_RADIUS } from "./Unit"
import type { Controller, StatBases, UnitSpec, UnitStats } from "./Unit"
import { HERO_COLORS, MONSTER_COLORS, SUMMON_PALETTE } from "./palettes"
import { DECK } from "../base/keywords"
import type { Visual } from "../base/Visual"
import { visual } from "../base/Visual"

/**
 * Where a battle stands: waiting for its round to start and draw, its preparation, its execution, or its
 * end.
 */
export type Phase = "draw"|"preparation"|"execution"|"over"

/** What a battle waits for from the players. */
export interface BattleAwaited {
    /** The units of the players with no chain committed yet. */
    readonly units: readonly Unit[]
}

/**
 * Where a clone may appear, in meters ahead and to the right of its maker: ahead, then the sides, never
 * behind, where the blows of the clone would go through its maker. Each is a body and a bit away, so the
 * clone never overlaps its maker.
 */
const CLONE_SPOTS: readonly (readonly [number, number])[] = [
    [0.8, 0], [0.6, -0.6], [0.6, 0.6], [0, -0.8], [0, 0.8],
]

/**
 * How far a moving unit goes between two checks of what is in its way, in meters. Small enough for a body
 * never to pass through another between two checks.
 */
const TRAVEL_STEP = 0.05

/** How finely a body already in contact backs out of it, in meters. */
const BACK_OUT_STEP = 0.01

/** How many ticks a round plays at most, so a broken action never freezes the game. */
const MAX_ROUND_TICKS = 600 * TICKS_PER_SECOND

/** How long a wait lasts, in seconds. */
const WAIT_TIME = 0.3

/** How long the flash of an explosion stays, in seconds. */
const BLAST_TIME = 0.4

/** How fast a unit moved in one go, a push, is shown going, in meters per second. */
const SHOVE_SPEED = 9

/** The color of the label of a wait. */
const WAIT_COLOR = rgba(0.75, 0.75, 0.85)

/** The color of the flash of an explosion. */
const BLAST_COLOR = rgba(1, 0.35, 0.1, 0.6)

/** A unit won cards for good. */
export interface CardsEvent {
    readonly unit: Unit
    readonly cards: readonly Card[]
}

/** A unit won gold. */
export interface GoldEvent {
    readonly unit: Unit
    readonly amount: number
}

/** Where a move ended, or would end. */
export interface Trip {
    /** Where the unit stops. */
    readonly to: Vector2

    /** How far the unit went, in meters. */
    readonly distance: number

    /** The unit it ran into, none when none. */
    readonly struck: Unit|null
}

/** Where a straight line from a unit stopped. */
export interface RayHit {
    /** The point it reached: the body it met, a pillar, a wall, or its full length. */
    readonly end: Vector2

    /** The unit it met, none when none. */
    readonly unit: Unit|null
}

/**
 * A fight on an arena, round after round, until one team stands.
 *
 * @remarks
 * A round goes through a preparation, where each unit commits a chain of cards, then an execution, where
 * the units play the head of their queue in the order of the initiative, one after the other, pass after
 * pass, until every queue is empty. Nothing ever moves at the same time as anything else, so no rule is
 * needed for two units entering one cell.
 *
 * A round is played out at once, by {@link Battle.playRound}. What happens is written to the log,
 * {@link Battle.events}, and told by {@link Battle.signals} at the time of the simulation it happens, which
 * the screen plays back. Pure and seeded: the same units, seed and chains always give the same battle.
 */
export class Battle {


    //// Triggers ////

    /** A round starts, after the draw. */
    public readonly roundStarted: Observable<number>

    /** The preparation is over, the chains built and the preparation effects run. */
    public readonly prepEnded: Observable<Battle>

    /** A unit built its preparations, its chain rewritten. */
    public readonly unitPrepared: Observable<Unit>

    /** A pass of the execution starts. */
    public readonly passStarted: Observable<number>

    /** A round is about to end, after its last pass: what was left in the arena goes off one last time. */
    public readonly roundEnding: Observable<number>

    /** A round ends, before the clones vanish. */
    public readonly roundEnded: Observable<number>

    /** A unit moved, whichever it is. */
    public readonly unitMoved: Observable<MoveEvent>

    /** One of the steps of a unit is about to play, whichever it is. */
    public readonly unitStepping: Observable<Unit>

    /** One of the steps of a unit was played, whichever it is: the end of a turn. */
    public readonly unitStepped: Observable<Unit>

    /** A unit won gold: the battle knows no purse, the game adds it to the one of the run. */
    public readonly onGetGold: Observable<GoldEvent>

    /** A unit won cards for good: the battle knows no deck of the run, the game adds them to it. */
    public readonly onGetCards: Observable<CardsEvent>

    /** What it tells whoever shows it, as it plays. */
    public readonly signals: BattleSignals

    /**
     * The battle went into another phase: waiting for its next round, once one is played out; a
     * preparation, once the round started and drew; an execution, once the preparation effects ran; or its
     * end.
     */
    public readonly phaseChanged: Observable<Phase>

    /**
     * The preparation is about to end, every chain committed, nothing built yet: the last moment the battle
     * can be saved before the round plays.
     */
    public readonly preparationEnding: Observable<Battle>

    /** A save was loaded: everything it held before is gone, and nothing else was told of it. */
    public readonly loaded: Observable<Battle>


    //// State ////

    public readonly rng: Rng

    /** Every unit, the dead ones included, in the order they entered. */
    public readonly units: Unit[] = []

    /** What happened, in order, since the battle started. */
    public readonly events: BattleEvent[] = []

    /** Where the error of an effect goes: to the events, since the simulation has no I/O. */
    public readonly report: ErrorSink = error => this.events.push({ type: "error", error })

    /** The units in the order they play this round. */
    public initiative: Unit[] = []

    /** The round being played, from 1, none before the first. */
    public round = 0

    public phase: Phase = "draw"

    /** How many ticks of execution it played since it started: the time of what it tells. */
    public clock = 0

    /** The team left standing, none during the battle and for a draw. */
    public winner: Team|null = null

    /** The team of the scenery, pillars, none until one is set up. */
    public scenery: Team|null = null

    /** The unit whose action plays, or played last this round, none before the first. */
    public actor: Unit|null = null

    /** How deep the damage being dealt was set off by other damage. */
    public effectDepth = 0

    constructor(
        public arena: Arena,
        seed: number,
    ){
        this.rng = new Rng(seed)
        this.roundStarted = new Observable(this.report)
        this.prepEnded = new Observable(this.report)
        this.unitPrepared = new Observable(this.report)
        this.passStarted = new Observable(this.report)
        this.roundEnding = new Observable(this.report)
        this.roundEnded = new Observable(this.report)
        this.unitMoved = new Observable(this.report)
        this.unitStepping = new Observable(this.report)
        this.unitStepped = new Observable(this.report)
        this.onGetGold = new Observable(this.report)
        this.onGetCards = new Observable(this.report)
        this.phaseChanged = new Observable(this.report)
        this.preparationEnding = new Observable(this.report)
        this.loaded = new Observable(this.report)
        this.signals =new BattleSignals(this.report, () => this.#tellGlide())
    }


    //// Saving ////

    /**
     * A battle built again from its state: the same units, cards, statuses and chains, playing on the same
     * random numbers. Its items and statuses plug their observers and modifiers back in.
     */
    public static restore(state: BattleState): Battle {
        const battle = new Battle(state.arena, state.rng)
        battle.#stand(state)
        return battle
    }

    /** Written down, to read back with {@link Battle.load}: see {@link saveBattle}. */
    public save(options: SaveOptions = {}): BattleSave {
        return saveBattle(this, options)
    }

    /**
     * Become the battle a save writes down, in place: what listens to it stays, what it held is gone, and
     * only {@link Battle.loaded} is told.
     *
     * @throws {@link Error} When the save is of another version, or names what the catalog does not have.
     */
    public load(save: BattleSave): void {
        const state = battleStateOf(save)
        this.#empty()
        this.arena = state.arena
        this.rng.state = state.rng
        this.#stand(state)
        this.loaded.notify(this)
    }

    /** Is a round being played, its state not yet at rest? */
    public get executing(): boolean {
        return this.phase === "execution"
    }

    /**
     * Its state, to build it again with {@link Battle.restore}.
     *
     * @throws {@link Error} During an execution, whose steps are running code nothing can write down.
     */
    public state(): BattleState {
        if(this.phase === "execution") {
            throw new Error("A battle is saved during a preparation or once over, never while a round plays.")
        }
        if(this.#processes.size > 0) throw new Error("A battle is never saved while a process goes on.")
        const indices = new Map(this.units.map((unit, index) => [unit, index]))
        const indexOf = (unit: Unit) => indices.get(unit) ?? -1
        return {
            arena: this.arena, rng: this.rng.state, round: this.round, phase: this.phase, winner: this.winner,
            units: this.units.map(unitState),
            initiative: this.initiative.map(indexOf),
            plans: new Map([...this.#plans].map(([unit, chain]) => [indexOf(unit), chain])),
            played: new Map([...this.#played].map(([unit, cards]) => [indexOf(unit), [...cards]])),
            activated: new Map([...this.#activated].map(([unit, used]) => [indexOf(unit), [...used]])),
            // An owner gone from the battle, a clone that vanished, is not written down.
            owners: new Map(this.units.flatMap(unit => {
                const owner = unit.owner ? indexOf(unit.owner) : -1
                return owner >= 0 ? [[indexOf(unit), owner] as const] : []
            })),
        }
    }


    //// Units ////

    /** Bring a unit in, and plug its items into it. */
    public add(spec: UnitSpec): Unit {
        const unit = new Unit(spec, this)
        this.#enter(unit)
        for(const item of unit.items) this.#plug(unit, item)
        return unit
    }

    /** Give a unit an item for the rest of the battle, plugged in at once. */
    public equip(unit: Unit, item: Item): void {
        unit.items.push(item)
        this.#plug(unit, item)
    }

    /** Take an item off a unit, unplugged at once. Does nothing when it does not carry it. */
    public unequip(unit: Unit, item: Item): void {
        const index = unit.items.lastIndexOf(item)
        if(index < 0) return
        unit.items.splice(index, 1)
        const plugs = this.#plugs.get(unit) ?? []
        const at = plugs.map(each => each.item).lastIndexOf(item)
        if(at < 0) return
        const [plug] = plugs.splice(at, 1)
        this.#unplug(plug)
    }

    /**
     * Change who gives the chain of a unit, from its next round on: a chain it already committed stands. The
     * unit stays what it is: only {@link Battle.awaited} and the bots planning read this.
     */
    public control(unit: Unit, controller: Controller): void {
        unit.controller = controller
    }

    /** The units still standing. */
    public get living(): Unit[] {
        return this.units.filter(unit => unit.alive)
    }

    /** The units still standing whose body takes room: what blocks the way. */
    public get bodies(): Unit[] {
        return this.units.filter(unit => unit.alive && unit.tangible)
    }

    /** The bodies that blows and zones touch: all but the scenery, a pillar. */
    public get touchables(): Unit[] {
        return this.bodies.filter(unit => unit.touchable)
    }

    /** Set up a pillar of stone: a body that blocks, is never aimed at, touched or moved by others. */
    public addPillar(center: Vector2, radius: number): Unit {
        this.scenery ??= new Team("Décor")
        const pillar = new Unit({
            name: "Pilier", sprite: visual("units/pillar"), team: this.scenery, controller: "bot", position: center,
            direction: Vector2.DOWN, hearts: [new Heart(SOLID_HEART)], decks: [], decisive: false,
            bases: { size: radius / UNIT_RADIUS, targetable: false, touchable: false, movable: false },
        }, this)
        this.#enter(pillar)
        return pillar
    }

    /** The teams, in the order their first unit entered. */
    public get teams(): Team[] {
        return [...new Set(this.units.map(unit => unit.team))]
    }

    /** The living units whose body takes room and an area touches, in the order they entered. */
    public unitsIn(area: Area, except: Unit|null = null): Unit[] {
        return this.touchables.filter(unit => unit !== except && touches(area, unit.position, unit.radius))
    }

    /**
     * Is there room for a body at a point: within the walls, off the others?
     *
     * @param except - The unit whose body it is, which is never in its own way.
     * @param radius - The radius of the body, that of the unit by default, else that of a body of size 1.
     * @param slack - How much smaller the others are taken to be, in meters.
     */
    public free(
        point: Vector2, except: Unit|null = null, radius = except?.radius ?? UNIT_RADIUS, slack = 0,
    ): boolean {
        if(this.arena.solid(point, radius)) return false
        return !this.bodies.some(unit => {
            return unit !== except && unit.position.distance(point) < radius + unit.radius - slack
        })
    }

    /** The living units of the other teams whose body takes room and the others aim at. */
    public enemiesOf(unit: Unit): Unit[] {
        return this.bodies.filter(other => other.team !== unit.team && other.targetable)
    }

    /** The closest living ally of a unit within a distance, from center to center, itself apart, none for none. */
    public nearestAlly(unit: Unit, range = Infinity, from = unit.position): Unit|null {
        let nearest: Unit|null = null
        let best = range
        for(const ally of this.bodies){
            if(ally === unit || ally.team !== unit.team) continue
            const distance = ally.position.distance(from)
            if(distance <= best){
                nearest = ally
                best = distance
            }
        }
        return nearest
    }

    /**
     * The closest living enemy of a unit within a distance, from center to center, none when there is none.
     *
     * @param from - Where the distance is measured from, where the unit stands by default.
     */
    public nearestEnemy(unit: Unit, range = Infinity, from = unit.position): Unit|null {
        let nearest: Unit|null = null
        let best = range
        for(const enemy of this.enemiesOf(unit)){
            const distance = enemy.position.distance(from)
            if(distance <= best && (!nearest || distance < best)){
                nearest = enemy
                best = distance
            }
        }
        return nearest
    }

    /**
     * Follow a straight line from a unit along its facing, up to a distance, until it meets the body of
     * another unit, a pillar or a wall.
     *
     * @param pose - Where the line starts and goes, where the unit stands and faces by default.
     * @param through - The bodies it goes through, none by default.
     */
    public ray(unit: Unit, range: number, pose: Pose = unit, through: readonly Unit[] = []): RayHit {
        const from = pose.position
        const direction = pose.direction
        let reach = Math.min(range, this.#wallDistance(from, direction))
        let hit: Unit|null = null
        for(const other of this.bodies){
            if(other === unit || through.includes(other)) continue
            const entry = entryDistance(from, direction, other.position, other.radius)
            if(entry !== null && entry <= reach){
                reach = entry
                // Scenery stops the line without being hit.
                hit = other.touchable ? other : null
            }
        }
        return { end: from.plus(direction.times(reach)), unit: hit }
    }


    //// Round ////

    /**
     * Start the next round: draw, then wait for the chains. A round played out leaves the battle waiting
     * for it: whoever shows the battle starts it once it showed the round before.
     *
     * @throws {@link Error} When the battle is over, or a round is not over yet.
     */
    public startRound(): void {
        this.#startRound(false)
    }

    /** Is it waiting for its next round to start, the one before over? */
    public get waiting(): boolean {
        return this.phase === "draw"
    }

    /** What it waits for from the players: the units they play with no chain committed yet. */
    public get awaited(): BattleAwaited {
        if(this.phase !== "preparation") return { units: [] }
        return { units: this.initiative.filter(unit => unit.controller === "player" && !this.#plans.has(unit)) }
    }

    /** Does it only wait to be told to go on, the players having nothing left to give? */
    public get canAdvance(): boolean {
        return this.phase !== "over" && this.awaited.units.length === 0
    }

    /**
     * Go on to what comes next: the next round, its bots planned; or the round planned, played out at once.
     *
     * @throws {@link Error} When the players still owe a chain, or the battle is over.
     */
    public advance(): void {
        if(!this.canAdvance) throw new Error(`The battle cannot go on from its ${this.phase} yet.`)
        if(this.phase === "draw"){
            this.#startRound(true)
            return
        }
        if(this.phase === "preparation") this.endPreparation()
        this.playRound()
    }

    /**
     * The cards of a unit in sight: its hand, its discard, and those it put in its chain this round. Its
     * draw pile is left out, which a viewer may only see as secret cards: a card drawing from these draws
     * the same for everyone.
     */
    public cardsOf(unit: Unit): Card[] {
        return [...unit.hand, ...unit.decks.discards, ...this.#played.get(unit) ?? []]
    }

    /** The chain a unit committed this round, none before it does. */
    public planOf(unit: Unit): CardChain|undefined {
        return this.#plans.get(unit)
    }

    /**
     * Commit the chain of a unit for this round: its cards leave its hand. Committing again gives the
     * cards of the chain before back first.
     *
     * @throws {@link Error} When it is not the preparation, the chain is not valid, or a card is not in hand.
     */
    public commit(unit: Unit, chain: CardChain): void {
        if(this.phase !== "preparation") throw new Error("Chains are committed during the preparation only.")
        const problems = chain.problems(unit.stats.chainSize.value)
        if(problems.length > 0) throw new Error(problems.join(" "))
        const hand = [...unit.hand, ...this.#played.get(unit) ?? []]
        const played: Card[] = []
        for(const card of chain.cards){
            const index = hand.indexOf(card)
            if(index < 0) throw new Error(`${card.name} is not in the hand of ${unit.name}.`)
            hand.splice(index, 1)
            played.push(card)
        }
        unit.hand.splice(0, unit.hand.length, ...hand)
        this.#plans.set(unit, chain)
        this.#played.set(unit, played)
    }

    /** What a unit chose to use at the start of this execution, none when nothing. */
    public activatedBy(unit: Unit): readonly Carried[] {
        return this.#activated.get(unit) ?? []
    }

    /**
     * Choose what a unit uses at the start of this execution, among what its belt holds, each once, in place
     * of what it chose before: nothing to use nothing.
     *
     * @throws {@link Error} When it is not the preparation, or a usable is not in the belt, is chosen twice,
     *   or has no charge left.
     */
    public activate(unit: Unit, used: readonly Carried[]): void {
        if(this.phase !== "preparation") throw new Error("Usables are chosen during the preparation only.")
        for(const each of used){
            if(!unit.usables.includes(each)) throw new Error(`${unit.name} does not carry ${each}.`)
            if(each.spent) throw new Error(`${each} of ${unit.name} has no charge left.`)
        }
        if(new Set(used).size !== used.length) throw new Error(`${unit.name} chose a usable twice.`)
        if(used.length === 0) this.#activated.delete(unit)
        else this.#activated.set(unit, [...used])
    }

    /**
     * Play the chain a unit committed this round twice: what it has left to play queued again after itself,
     * and its chain shown twice. Does nothing when it committed none.
     */
    public repeatChain(unit: Unit): void {
        const plan = this.#plans.get(unit)
        if(!plan || plan.cards.length === 0) return
        // Read to its end rather than laid twice: a last card taking an input would take the copy's first.
        unit.readChain()
        unit.steps.push(...unit.steps)
        this.#plans.set(unit, new CardChain([...plan.cards, ...plan.cards]))
        this.events.push({ type: "status", unit, text: "chaîne doublée" })
    }

    /**
     * Put the hand and the discards of a unit back into its decks, shuffled, then draw as many cards as its
     * hand held.
     */
    public reshuffle(unit: Unit): void {
        const count = unit.hand.length
        for(const card of unit.hand) unit.decks.discard(card)
        unit.hand.length = 0
        unit.decks.recycle(this.rng)
        this.drawCards(unit, count)
        this.events.push({ type: "status", unit, text: [DECK, " rebattu"] })
    }

    /** Fill again the charges of the usables of a unit that refill at each battle, and tell its hearts it starts. */
    public refill(unit: Unit): void {
        for(const carried of unit.usables) carried.refill()
        unit.hearts.battleStarted()
    }

    /**
     * End the preparation: resolve every chain in the order of the initiative, its chances drawn from the
     * battle, each preparation acting on the battle as its chain is rewritten, and fill the queues, then tell
     * the listeners, then use what each unit chose to use, in the same order.
     *
     * @throws {@link Error} When it is not the preparation.
     */
    public endPreparation(): void {
        if(this.phase !== "preparation") throw new Error("The preparation is already over.")
        this.preparationEnding.notify(this)
        this.phase = "execution"
        // The queues are all emptied first, so a preparation may act on the queue of anyone.
        for(const unit of this.initiative) unit.steps.length = 0
        // Every chain is given first, so whoever shows them sees them all from the first preparation on.
        for(const unit of this.initiative) this.#giveChain(unit)
        for(const unit of this.initiative){
            if(!unit.decisive && unit.plays && !this.#plans.has(unit)){
                this.#planSummon(unit)
                this.#giveChain(unit)
            }
            unit.prepare()
        }
        this.prepEnded.notify(this)
        this.#useActivated()
        this.#cursor = this.initiative.length
        this.signals.phase.notify(this.phase)
        this.phaseChanged.notify(this.phase)
    }

    /**
     * Play one tick of the round: the action being played goes on, and when it is over, the next unit with an
     * action left starts its own.
     *
     * @returns Is the round still being played? Once it is over, the battle waits for its next round, unless
     * it is over.
     */
    public tick(): boolean {
        if(this.phase !== "execution") return false
        const running = this.#running ?? this.#startNext()
        if(!running) return false
        let over = !running.unit.alive
        if(!over){
            try {
                over = running.run.next().done === true
            } catch(error){
                this.report(error)
                over = true
            }
        }
        if(over) this.#finish(running.unit)
        else this.clock++
        return this.phase === "execution"
    }

    /** Play the round out at once, tick after tick: what the screen then plays back. */
    public playRound(): void {
        for(let tick = 0; tick < MAX_ROUND_TICKS && this.tick(); tick++){ /* Plays every tick. */ }
    }

    /** Post something to draw over the arena for a while, from now on. */
    public post(effect: Effect): void {
        this.signals.effect.notify(effect)
    }


    //// Rules ////

    /**
     * Turn a unit to face a direction, a meter long.
     *
     * @param duration - How long it took to turn, in seconds: at once by default.
     * @param from - Where it faced before, as it does by default: a turn over a few ticks changes its facing
     *   on the way.
     */
    public turn(unit: Unit, direction: Vector2, duration = 0, from: Vector2 = unit.direction): void {
        unit.direction = direction
        this.events.push({ type: "turned", unit })
        const position = unit.position
        this.signals.moved.notify({
            unit, from: { position, direction: from }, to: { position, direction }, duration,
        })
    }

    /**
     * Have the strides of a unit, moved again and again over the next ticks, told as one move: its start, and
     * where it is when something else is told, or when {@link Battle.endGlide} is called.
     */
    public startGlide(unit: Unit): void {
        this.#tellGlide()
        const from = { position: unit.position, direction: unit.direction }
        this.#glide = { unit, from, clock: this.clock }
    }

    /** Tell the move a glide made so far, and stop gathering its strides. */
    public endGlide(): void {
        this.#tellGlide()
    }

    /**
     * Move a unit along a direction, as far as it goes before something is in the way: a wall, a pillar,
     * another unit. A unit that cannot move on its own, rooted, does not move unless it is forced.
     *
     * @param forced - Is it moved by another, as a push is, whatever its mobility?
     * @returns How far it went, and the unit it ran into, none when none.
     */
    public move(
        unit: Unit, direction: Vector2, distance: number, forced = false, through: readonly Unit[] = [],
    ): Trip {
        if(!forced && !this.#canMove(unit)) return { to: unit.position, distance: 0, struck: null }
        // What others move, a push, a wind, leaves the scenery where it stands.
        if(forced && !unit.movable) return { to: unit.position, distance: 0, struck: null }
        const travel = this.travel(unit, unit.position, direction, distance, through)
        if(travel.distance < distance) this.events.push({ type: "blocked", unit })
        if(travel.distance > 0) this.#relocate(unit, travel.to, travel.distance / SHOVE_SPEED)
        return travel
    }

    /**
     * Where the body of a unit would stop, going from a point along a direction: before the first wall,
     * pillar or other body in its way, a body taking no room going through the bodies. Changes nothing: a
     * move and its preview both ask it.
     *
     * @remarks
     * What blocks the way is tested with obstacles a little smaller than they are, so a body brushing past
     * one goes on, and a body against one can still leave it. Once blocked, the body is placed with the true
     * obstacles: it stops at their contact, at the last point where it touched nothing.
     *
     * @param through - The bodies it goes through, none by default: walls and the other bodies still block.
     */
    public travel(
        unit: Unit, from: Vector2, direction: Vector2, distance: number, through: readonly Unit[] = [],
    ): Trip {
        const scenery = this.bodies.filter(body => !body.touchable)
        const clear = (point: Vector2, slack: number): boolean => unit.tangible
            ? !this.arena.solid(point, unit.radius) && !this.bodies.some(body => {
                return body !== unit && !through.includes(body)
                    && body.position.distance(point) < unit.radius + body.radius - slack
            })
            : !this.arena.solid(point, unit.radius) && !scenery.some(body => {
                return body !== unit && body.position.distance(point) < unit.radius + body.radius - slack
            })
        const steps = Math.max(1, Math.ceil(distance / TRAVEL_STEP))
        let reached = from
        let travelled = 0
        let contact = clear(from, 0) ? { to: from, distance: 0 } : null
        for(let i = 1; i <= steps; i++){
            const next = from.plus(direction.times(distance * i / steps))
            if(!clear(next, COLLISION_SLACK)){
                const struck = this.touchables.find(other => {
                    const touching = unit.radius + other.radius - COLLISION_SLACK
                    return other !== unit && !through.includes(other) && other.position.distance(next) < touching
                }) ?? null
                return { ...contact ?? backedOut(from, direction, point => clear(point, 0)), struck }
            }
            reached = next
            travelled = distance * i / steps
            if(clear(next, 0)) contact = { to: next, distance: travelled }
        }
        return { to: reached, distance: travelled, struck: null }
    }

    /** Move a unit straight to a point, over whatever lies between, when there is room there. */
    public blink(unit: Unit, to: Vector2): boolean {
        if(!this.#canMove(unit)) return false
        if(!this.free(to, unit)){
            this.events.push({ type: "blocked", unit })
            return false
        }
        this.#jump(unit, to)
        return true
    }

    /**
     * Move a unit straight to a point, over whatever lies between, room there or not, even past a wall: a
     * jump that lands where it may, followed by {@link Battle.unblock}.
     */
    public leap(unit: Unit, to: Vector2): boolean {
        if(!this.#canMove(unit)) return false
        this.#jump(unit, to)
        return true
    }

    /**
     * Get a unit out of where it has no room, after a move that went over everything, a jump: as long as its
     * body lies in a wall, a pillar or another body, it loses a heart, then is thrown aside, toward one of
     * eight ways drawn at random, a free spot first. Each throw goes a body farther than the one before, so
     * a crowd is always got out of, and lands within the walls, so a jump past a wall costs one heart.
     */
    public unblock(unit: Unit): void {
        const farthest = this.arena.width + this.arena.height
        for(let reach = 2 * unit.radius; reach <= farthest; reach += unit.radius){
            if(!unit.alive || this.free(unit.position, unit)) return
            this.events.push({ type: "blocked", unit })
            unit.hearts.damage(UNBLOCK_DAMAGE, "physical", null)
            if(!unit.alive) return
            const spots = EIGHT_WAYS.map(way => {
                return this.arena.clamped(unit.position.plus(way.times(reach)), unit.radius)
            })
            const free = spots.filter(spot => this.free(spot, unit))
            const to = this.rng.pick(free.length > 0 ? free : spots)
            if(to) this.#jump(unit, to)
        }
    }

    /**
     * Push a unit along a direction, whatever its mobility. Stopped before the whole distance, it hits
     * what was in the way, and takes a heart.
     */
    public push(unit: Unit, direction: Vector2, distance: number, source: Unit): void {
        const travel = this.move(unit, direction, distance, true)
        if(travel.distance < distance) unit.hearts.damage(PUSH_BLOCKED_DAMAGE, "physical", source)
    }

    /**
     * Lash out at an area: every unit it touches but the attacker takes the damage.
     *
     * @param scale - How many times the damage each unit touched takes, once by default: a stab in the back.
     * @returns The units the damage landed on.
     */
    public strike(
        attacker: Unit, area: Area, amount: number, nature: Nature, scale: (target: Unit) => number = () => 1,
    ): Unit[] {
        attacker.attacking.notify({ attacker, area })
        this.events.push({ type: "struck", unit: attacker, area, nature })
        const hit: Unit[] = []
        for(const target of this.unitsIn(area, attacker)){
            const dealt = target.hearts.damage(amount * scale(target), nature, attacker)
            if(dealt <= 0) continue
            hit.push(target)
            attacker.hitting.notify({ attacker, target, amount: dealt })
            target.struck.notify({ attacker, target, amount: dealt })
        }
        return hit
    }

    /**
     * Lash out at several areas at once, as one zone: every unit any of them touches but the attacker takes
     * the damage once.
     *
     * @param scale - How many times the damage each unit touched takes, once by default.
     * @returns The units the damage landed on.
     */
    public strikeMany(
        attacker: Unit, areas: readonly Area[], amount: number, nature: Nature, scale: (target: Unit) => number = () => 1,
    ): Unit[] {
        const targets = new Set<Unit>()
        for(const area of areas){
            attacker.attacking.notify({ attacker, area })
            this.events.push({ type: "struck", unit: attacker, area, nature })
            for(const target of this.unitsIn(area, attacker)) targets.add(target)
        }
        const hit: Unit[] = []
        for(const target of targets){
            const dealt = target.hearts.damage(amount * scale(target), nature, attacker)
            if(dealt <= 0) continue
            hit.push(target)
            attacker.hitting.notify({ attacker, target, amount: dealt })
            target.struck.notify({ attacker, target, amount: dealt })
        }
        return hit
    }

    /** Give cards to a unit for good: told to whoever holds its decks. */
    public giveCards(unit: Unit, cards: readonly Card[]): void {
        if(cards.length === 0) return
        this.onGetCards.notify({ unit, cards })
        this.events.push({ type: "status", unit, text: ["+ ", cards.map(card => card.name).join(", "), " pour de bon"] })
    }

    /** Give gold to a unit: told to whoever holds the purse. */
    public giveGold(unit: Unit, amount: number): void {
        if(amount <= 0) return
        this.onGetGold.notify({ unit, amount })
        this.events.push({ type: "status", unit, text: `+ ${amount} or` })
    }

    /**
     * Set off an explosion over an area: a bomb, which wounds everyone there, its thrower included.
     *
     * @param except - A unit the blast spares, none by default: the one charging into what blows.
     */
    public explode(area: Area, amount: number, source: Unit|null, except: Unit|null = null): void {
        this.events.push({ type: "exploded", area })
        this.post(polygonEffect(area, BLAST_COLOR, BLAST_TIME))
        for(const target of this.unitsIn(area, except)) target.hearts.damage(amount, "physical", source)
    }

    /**
     * Put a status of a kind on a unit, at a level: its level goes up by it when the unit holds one of the
     * kind already. A level below 0 takes some off, as an antidote does, the status gone when nothing is
     * left of it.
     */
    public applyStatus(unit: Unit, type: StatusType, level: number): void {
        if(!unit.alive) return
        const held = unit.statuses.get(type)
        if(!held && level <= 0) return
        let status: Status
        if(held){
            status = held
            held.setLevel(held.level + level)
        } else {
            status = type.make(level, type)
            unit.statuses.set(type, status)
            this.signals.statusAdded.notify({ unit, type, level: status.level })
            status.init({ battle: this, unit })
            this.#tellLevels(unit, status)
        }
        if(status.level > 0) this.events.push({ type: "status", unit, text: status })
        else {
            this.removeStatus(unit, type)
            this.events.push({ type: "status", unit, text: [type, " dissipé"] })
        }
    }

    /**
     * Start a process for a unit, going on until the end of the round, or until the unit dies. Two processes
     * never merge: the same one started twice goes on twice.
     */
    public startProcess(unit: Unit, process: Process): void {
        if(!unit.alive) return
        const held: (() => void)[] = []
        const ctx: PlugContext = {
            battle: this, unit,
            hold: kept => held.push(typeof kept === "function" ? kept : () => kept.remove()),
        }
        const plugs = this.#processes.get(unit) ?? []
        plugs.push({ process, ctx, held })
        this.#processes.set(unit, plugs)
        unit.processes.push(process)
        this.signals.processStarted.notify({ unit, process })
        this.events.push({ type: "status", unit, text: process })
        try {
            process.init(ctx)
        } catch(error){
            this.report(error)
        }
    }

    /** Take a unit out of the battle for good, nothing left of it: a clone at the end of its round. */
    public vanish(unit: Unit): void {
        const at = this.units.indexOf(unit)
        if(at < 0) return
        this.endProcesses(unit)
        unit.hearts.unplug()
        for(const status of unit.statuses.values()) status.remove({ battle: this, unit })
        this.units.splice(at, 1)
        this.signals.vanished.notify({ unit })
    }

    /** End every process of a unit: each does what it does as it ends, then what it kept is taken back. */
    public endProcesses(unit: Unit): void {
        const plugs = this.#processes.get(unit)
        if(!plugs) return
        this.#processes.delete(unit)
        for(const plug of plugs) this.#endPlug(unit, plug)
    }

    /** End one process of a unit before the round does, as it would end with it. Ending one it has not does nothing. */
    public endProcess(unit: Unit, process: Process): void {
        const plugs = this.#processes.get(unit)
        const at = plugs?.findIndex(plug => plug.process === process) ?? -1
        if(!plugs || at < 0) return
        const [plug] = plugs.splice(at, 1)
        this.#endPlug(unit, plug)
    }

    /**
     * Tie two units together for as long as what holds it says, for the screen: a laser, a chain between them.
     *
     * @returns What unties them, once only.
     */
    public tether(from: Unit, to: Unit, visual: Visual): () => void {
        const tether: Tether = { from, to, visual }
        this.signals.tethered.notify({ tether })
        let tied = true
        return () => {
            if(!tied) return
            tied = false
            this.signals.untethered.notify({ tether })
        }
    }

    #endPlug(unit: Unit, { process, ctx, held }: { process: Process, ctx: PlugContext, held: (() => void)[] }): void {
        try {
            process.dispose?.(ctx)
        } catch(error){
            this.report(error)
        }
        for(const release of held.splice(0)){
            try {
                release()
            } catch(error){
                this.report(error)
            }
        }
        unit.processes.splice(unit.processes.indexOf(process), 1)
        this.signals.processEnded.notify({ unit, process })
    }

    /** Take a status off a unit. Taking off one it does not hold does nothing. */
    public removeStatus(unit: Unit, type: StatusType): void {
        const status = unit.statuses.get(type)
        if(!status) return
        unit.statuses.delete(type)
        status.remove({ battle: this, unit })
        this.signals.statusRemoved.notify({ unit, type })
    }

    /** Stun a unit: everything it has left to play is put off by one step. */
    public stun(unit: Unit): void {
        if(!unit.alive) return
        unit.steps.unshift(Battle.wait("étourdi"))
        this.events.push({ type: "status", unit, text: "étourdi" })
    }

    /** Shock a unit: its next step is lost for good. */
    public shock(unit: Unit): void {
        if(!unit.alive) return
        unit.fillSteps()
        unit.steps.shift()
        this.events.push({ type: "status", unit, text: "électrocuté" })
    }

    /** Put actions at the head of the queue of a unit, played in its place and facing. */
    public inject(unit: Unit, actions: readonly Action[]): void {
        if(!unit.alive) return
        unit.steps.unshift(...actions)
        this.events.push({ type: "status", unit, text: "hypnotisé" })
    }

    /**
     * Make a clone of a unit next to it, which plays what the unit has left this round right after it, then
     * vanishes. Does nothing when there is no room around.
     *
     * @param hearts - What the clone lives by: the card making it says.
     */
    public clone(unit: Unit, hearts: readonly Heart[]): Unit|null {
        const spot = this.#cloneSpot(unit)
        if(!spot) return null
        const clone = new Unit({
            name: `${unit.name}'`, sprite: unit.sprite, team: unit.team, controller: unit.controller, position: spot,
            direction: unit.direction, hearts, decks: [],
            decisive: false, bases: { size: unit.stats.size.value },
        }, this)
        clone.owner = unit
        this.#enter(clone)
        this.startProcess(clone, new Vanishing())
        this.#followUp(unit, clone)
        return clone
    }

    /**
     * Make a perfect clone of a unit: the same cards, in the same places, the same stats, items and statuses,
     * and what is left of its chain, on hearts of its own. Played by a bot, it stays until it dies, right
     * after its maker in the order of play, and counts for its team.
     *
     * @param hearts - The hearts it lives by, all it has of its own.
     * @returns The clone, none when there is no room for it.
     */
    public perfectClone(unit: Unit, hearts: readonly Heart[]): Unit|null {
        const spot = this.#cloneSpot(unit)
        if(!spot) return null
        const state = unitState(unit)
        const clone = this.#restoreUnit({
            ...state, statuses: [],
            spec: { ...state.spec, name: `${unit.name}'`, controller: "bot", position: spot, hearts, usables: [] },
        })
        clone.owner = unit
        if(unit.vanishing) this.startProcess(clone, new Vanishing())
        // The cards of its round go back to its decks too, or its loop would miss them from then on.
        const played = this.#played.get(unit)
        if(played) this.#played.set(clone, [...played])
        this.#followUp(unit, clone)
        for(const status of unit.statuses.values()){
            if(status.type.cloned) this.applyStatus(clone, status.type, status.level)
        }
        return clone
    }

    /** Where a clone of a unit appears, none when there is no room, which it tells. */
    #cloneSpot(unit: Unit): Vector2|null {
        const scale = unit.stats.size.value
        const spot = CLONE_SPOTS
            .map(([forward, side]) => {
                return unit.position.plus(Vector2.relative(unit.direction, forward * scale, side * scale))
            })
            .find(spot => this.free(spot, null, unit.radius))
        if(spot) return spot
        this.events.push({ type: "skipped", unit, reason: "pas de place pour le clone" })
        return null
    }

    /** Have a clone play what is left of the chain of its maker, right after it, and tell it came. */
    #followUp(unit: Unit, clone: Unit): void {
        clone.steps.push(...unit.steps)
        clone.takeChain(unit.chain.copy())
        this.initiative.splice(this.initiative.indexOf(unit) + 1, 0, clone)
        this.events.push({ type: "spawned", unit: clone })
        this.signals.spawned.notify({ unit: clone })
    }

    /**
     * Draw cards into the hand of a unit, one from each of its decks in turn, as long as its hand has room
     * and a deck has cards.
     *
     * @returns How many it drew.
     */
    public drawCards(unit: Unit, count: number): number {
        let drawn = 0
        for(; drawn < count && unit.hand.length < unit.stats.handSize.value; drawn++){
            const next = unit.decks.draw(this.rng)
            if(!next) break
            const { card, deck, recycled } = next
            if(recycled) this.signals.reshuffled.notify({ unit, deck })
            unit.hand.push(card)
            this.signals.drawn.notify({ unit, card, deck })
        }
        return drawn
    }

    /**
     * Put a card in the hand of a unit, when its hand has room.
     *
     * @param deck - The deck it was taken from, by its place among the decks, -1 for a card from elsewhere.
     */
    public giveCard(unit: Unit, card: Card, deck = -1): boolean {
        if(unit.hand.length >= unit.stats.handSize.value) return false
        unit.hand.push(card)
        this.events.push({ type: "status", unit, text: ["+ ", card, " en main"] })
        this.signals.drawn.notify({ unit, card, deck })
        return true
    }

    /**
     * Summon a body for a unit, of its team, where there is room: a body with no deck, out of the order of
     * play, lasting as long as its hearts, which it loses one by one at the end of each round. Does nothing
     * when the point is taken.
     */
    public summon(
        owner: Unit, sprite: Visual, name: string, at: Vector2, hearts: readonly Heart[],
        direction: Vector2 = owner.direction,
    ): Unit|null {
        const body = this.place(owner, { sprite, name, at, hearts, direction })
        if(body) this.applyStatus(body, FLEETING, 1)
        return body
    }

    /**
     * Leave a body in the arena for a unit, of its team: a body with no deck, out of the order of play,
     * lasting as long as its hearts. A tangible body needs room, and nothing is left when the point is
     * taken; one lying on the ground, a hazard, is left wherever it falls.
     */
    public place(owner: Unit, body: PlacedBody): Unit|null {
        const tangible = body.tangible ?? true
        const size = body.size ?? 1
        if(tangible && !this.free(body.at, null, UNIT_RADIUS * size)){
            this.events.push({ type: "skipped", unit: owner, reason: "pas de place pour l'invocation" })
            return null
        }
        const cards = body.cards ?? []
        const acting = cards.length > 0
        const reach = {
            targetable: body.targetable ?? true, touchable: body.touchable ?? true, movable: body.movable ?? true,
        }
        const placed = new Unit({
            name: body.name, sprite: body.sprite, team: owner.team, controller: "bot", position: body.at,
            direction: body.direction ?? owner.direction, hearts: body.hearts, decks: acting ? [cards] : [],
            decisive: false, zone: body.zone ?? null,
            bases: acting
                ? {
                    size, tangible, ...reach, ordered: true, draw: cards.length, firstDraw: cards.length,
                    chainSize: cards.length,
                }
                : { size, tangible, ...reach },
        }, this)
        placed.owner = owner
        this.#enter(placed)
        this.events.push({ type: "spawned", unit: placed })
        this.signals.spawned.notify({ unit: placed })
        if(acting && this.phase === "execution") this.#joinRound(placed)
        else if(acting && this.phase === "preparation"){
            // Coming during a preparation, it draws now, and plays its hand with the round.
            this.drawCards(placed, placed.stats.firstDraw.value)
            this.initiative.splice(this.#followingPlace(owner), 0, placed)
        }
        return placed
    }

    /**
     * Have a summoned body that plays its cards join the round going on: it draws, plays its hand from left
     * to right, and takes its place in the order of play, right after its owner and those it summoned
     * before. Summoned as its owner plays, it plays next.
     */
    #joinRound(unit: Unit): void {
        this.drawCards(unit, unit.stats.firstDraw.value)
        this.#planSummon(unit)
        this.#giveChain(unit)
        unit.prepare()
        const at = this.#followingPlace(unit.owner)
        this.initiative.splice(at, 0, unit)
        // Coming before the unit about to play, the order shifts: that unit still plays next.
        if(at < this.#cursor) this.#cursor++
    }

    /** The bodies a unit summoned, the ones that are still in the battle. */
    public summonsOf(owner: Unit): Unit[] {
        return this.units.filter(unit => unit.owner === owner)
    }

    /**
     * Play the last step of a unit once more, at the end: its chain is read to its end first. For after the
     * preparation, before the execution.
     */
    public duplicateLastStep(unit: Unit): void {
        unit.readChain()
        const last = unit.steps[unit.steps.length - 1]
        if(!last) return
        unit.steps.push(last)
        this.events.push({ type: "status", unit, text: "dernière étape doublée" })
    }

    /**
     * Take the cards of the chain of a unit out of it, from a place to its end: they play no more this round, and
     * go to the discard with the others at its end.
     *
     * @returns The cards taken out, in order.
     */
    public cutChain(unit: Unit, from: number): Card[] {
        const { chain } = unit
        const cut = chain.cards.splice(from)
        chain.cursor = Math.min(chain.cursor, chain.cards.length)
        if(cut.length > 0) chain.watcher?.changed()
        return cut
    }

    /**
     * Put a card in the place of cards of the chain of a unit, a merge or a fusion of them: the cards taken out go
     * to the discard with the others at the end of the round.
     */
    public replaceInChain(unit: Unit, from: number, count: number, card: Card): void {
        const { chain } = unit
        chain.cards.splice(from, count, card)
        if(chain.cursor > from) chain.cursor = Math.max(from, chain.cursor - count + 1)
        chain.watcher?.changed()
    }

    /** Have a unit read a copy of what it committed: the plan stays as it was, the copy is rewritten. */
    #giveChain(unit: Unit): void {
        unit.takeChain(this.#plans.get(unit)?.copy() ?? new CardChain())
    }

    /** Commit the hand of a summoned body that plays its cards, read from left to right as a bot's. */
    #planSummon(unit: Unit): void {
        const chain = CardChain.leftToRight(unit.hand, unit.stats.chainSize.value)
        for(const card of chain.cards) unit.hand.splice(unit.hand.indexOf(card), 1)
        this.#plans.set(unit, chain)
        this.#played.set(unit, [...chain.cards])
    }

    /**
     * Where in the order of play a body summoned by a unit comes: after it and the bodies it summoned
     * before, at the end when it is not in the order anymore.
     */
    #followingPlace(owner: Unit|null): number {
        const index = owner ? this.initiative.indexOf(owner) : -1
        if(index < 0) return this.initiative.length
        let at = index + 1
        while(at < this.initiative.length && this.initiative[at].owner === owner) at++
        return at
    }

    /** Swap the places of two units, when the first can move. */
    public swap(unit: Unit, other: Unit): boolean {
        if(!this.#canMove(unit)) return false
        const from = unit.position
        this.#jump(unit, other.position)
        this.#jump(other, from)
        return true
    }


    /** An action doing nothing for a moment, but saying why. */
    public static wait(reason: string): Action {
        return {
            use: function* ({ battle, unit }){
                battle.events.push({ type: "skipped", unit, reason })
                battle.post(labelEffect(unit.position, reason, WAIT_COLOR, WAIT_TIME))
                for(let tick = 0; tick < WAIT_TIME * TICKS_PER_SECOND; tick++) yield
            },
            preview: ({ pose }) => ({
                indicators: [{ kind: "label", at: pose.position, text: reason, color: WAIT_COLOR }],
                pose,
            }),
        }
    }


    /** The chains committed this round. */
    readonly #plans = new Map<Unit, CardChain>()

    /** The cards that left the hand of each unit for its chain, to the discard at the end of the round. */
    readonly #played = new Map<Unit, Card[]>()

    /** The items plugged into each unit, with what each kept, to take back. */
    readonly #plugs = new Map<Unit, Plug[]>()

    /** The processes going on for each unit, with what each kept, to take back at the end of the round. */
    readonly #processes = new Map<Unit, ProcessPlug[]>()

    /** What each unit chose to use at the start of the execution. */
    readonly #activated = new Map<Unit, Carried[]>()

    /** Where the execution is in the initiative: the next unit to play. */
    #cursor = 0

    /** The action being played, and the unit playing it, none between two actions. */
    #running: { readonly unit: Unit, readonly run: ActionRun }|null = null

    /** The strides of a unit being gathered as one move, from where and when it started, none when none. */
    #glide: { readonly unit: Unit, readonly from: Pose, readonly clock: number }|null = null

    #pass = 0

    /** The units in their order of play: one of each team in turn, the first shifting each round. */
    #initiativeOf(round: number): Unit[] {
        const order = this.#charactersOrder(round)
        // The summoned bodies that play and the perfect clones come right after their owner, in the order
        // they came.
        for(const body of this.living.filter(unit => (unit.plays && !unit.decisive) || this.#followsOwner(unit))){
            const index = body.owner ? order.indexOf(body.owner) : -1
            let at = index < 0 ? order.length : index + 1
            while(index >= 0 && at < order.length && order[at].owner === body.owner) at++
            order.splice(at, 0, body)
        }
        return order
    }

    /** Is it a perfect clone whose maker still lives, whom it plays right after? */
    #followsOwner(unit: Unit): boolean {
        return unit.decisive && unit.owner?.alive === true
    }

    /** The units that count for their team in their order of play: one of each team in turn, the first shifting each round. */
    #charactersOrder(round: number): Unit[] {
        const standing = this.living.filter(unit => unit.decisive && !this.#followsOwner(unit))
        const byTeam = this.teams.map(team => standing.filter(unit => unit.team === team))
        const order: Unit[] = []
        const longest = Math.max(0, ...byTeam.map(units => units.length))
        for(let rank = 0; rank < longest; rank++){
            for(const units of byTeam) if(rank < units.length) order.push(units[rank])
        }
        const shift = order.length === 0 ? 0 : (round - 1) % order.length
        return [...order.slice(shift), ...order.slice(0, shift)]
    }

    /**
     * Use what each unit chose, in the order of the initiative: each acts, given its place in the belt, and
     * sees to that place itself. An error is reported rather than thrown.
     */
    #useActivated(): void {
        for(const unit of this.initiative){
            for(const carried of this.#activated.get(unit) ?? []){
                if(!unit.usables.includes(carried) || carried.spent) continue
                this.events.push({ type: "status", unit, text: ["utilise ", carried.usable] })
                try {
                    carried.usable.use({ battle: this, unit }, this.#slotOf(unit, carried))
                } catch(error){
                    this.report(error)
                }
            }
        }
        this.#activated.clear()
    }

    /** The place of a usable in the belt of a unit, as the usable is given it. */
    #slotOf(unit: Unit, carried: Carried): UsableSlot {
        const remove = (): void => {
            const index = unit.usables.indexOf(carried)
            if(index >= 0) unit.usables.splice(index, 1)
        }
        return {
            unit, carried, remove,
            spend: () => {
                carried.charges = Math.max(0, carried.charges - 1)
                if(carried.spent && carried.usable.refill !== "battle") remove()
            },
        }
    }

    /**
     * Put a unit in the battle, in the next color of the palette of its team: read from the order the teams
     * entered, never from who gives the chains, so a battle loaded has the colors of the one saved.
     */
    #enter(unit: Unit): void {
        const mine = this.units.filter(other => other.decisive === unit.decisive)
        const first = (this.units.find(other => other.decisive) ?? unit).team === unit.team
        const palette = !unit.decisive ? SUMMON_PALETTE : first ? HERO_COLORS : MONSTER_COLORS
        const rank = unit.decisive ? mine.filter(other => other.team === unit.team).length : mine.length
        unit.color = palette[rank % palette.length]
        this.units.push(unit)
        this.#forward(unit)
        type Stat = [keyof UnitStats, UnitStats[keyof UnitStats]]
        for(const [name, stat] of Object.entries(unit.stats) as Stat[]){
            stat.watcher = {
                added: key => this.signals.modifierAdded.notify({ unit, stat: name, key }),
                removed: key => this.signals.modifierRemoved.notify({ unit, stat: name, key }),
            }
        }
        if(this.phase === "over") return
        unit.hearts.plug()
    }

    /** Tell whoever shows the battle what the hearts of a unit and the unit itself tell. */
    #forward(unit: Unit): void {
        const { signals } = this
        const { hearts } = unit
        const bar = (): Heart[] => Heart.copies(hearts.all)
        hearts.onDamage.add(({ amount, nature }) => {
            signals.damaged.notify({ unit, amount, nature, hearts: bar() })
        })
        hearts.onHeal.add(({ amount }) => signals.healed.notify({ unit, amount, hearts: bar() }))
        hearts.onAdd.add(({ heart, index }) => {
            signals.heartAdded.notify({ unit, heart, index, hearts: bar() })
        })
        hearts.onRemove.add(({ kind, indexes }) => {
            signals.heartRemoved.notify({ unit, kind, indexes, hearts: bar() })
        })
        hearts.onReplace.add(({ kind, indexes, replacements }) => {
            signals.heartReplaced.notify({ unit, kind, indexes, replacements, hearts: bar() })
        })
        hearts.onWound.add(({ kind, indexes }) => {
            signals.heartWounded.notify({ unit, kind, indexes, hearts: bar() })
        })
        unit.onDeath.add(() => signals.died.notify({ unit }))
        unit.onActivate.add(event => signals.cardActivated.notify(event))
        unit.onCardInvalid.add(event => signals.cardInvalid.notify(event))
        unit.onChainChange.add(event => signals.chainChanged.notify(event))
        unit.onPrep.add(prepared => this.unitPrepared.notify(prepared))
    }

    /** Stand where a state has it, nothing in it yet. */
    #stand(state: BattleState): void {
        const units = state.units.map(unit => this.#restoreUnit(unit))
        this.round = state.round
        this.phase = state.phase
        this.winner = state.winner
        this.initiative = state.initiative.map(index => units[index])
        for(const [index, chain] of state.plans) this.#plans.set(units[index], chain)
        for(const [index, cards] of state.played) this.#played.set(units[index], [...cards])
        for(const [index, used] of state.activated) this.#activated.set(units[index], [...used])
        for(const [index, owner] of state.owners) units[index].owner = units[owner]
    }

    /**
     * Start the next round.
     *
     * @param planned - Do the bots commit their chains before the preparation is told, so what hears of it
     * reads them?
     */
    #startRound(planned: boolean): void {
        if(this.phase === "over") throw new Error("The battle is over. Start a new one.")
        if(this.phase !== "draw") throw new Error("A round is going on. Play it out first.")
        this.round++
        this.signals.phase.notify("draw")
        this.#plans.clear()
        this.#activated.clear()
        for(const unit of this.units) unit.takeChain(new CardChain())
        this.initiative = this.#initiativeOf(this.round)
        for(const unit of this.initiative) this.#draw(unit)
        this.phase = "preparation"
        this.events.push({ type: "round", round: this.round })
        this.roundStarted.notify(this.round)
        if(planned) this.#planBots()
        this.signals.phase.notify(this.phase)
        this.phaseChanged.notify(this.phase)
    }

    /** Commit the chain of each bot of the round. */
    #planBots(): void {
        for(const unit of this.initiative) if(unit.controller === "bot") this.commit(unit, planFor(unit))
    }

    /** Take everything out, each thing plugged taken back, so only what listens from outside stays. */
    #empty(): void {
        for(const unit of this.units){
            this.endProcesses(unit)
            unit.hearts.unplug()
            for(const status of unit.statuses.values()) status.remove({ battle: this, unit })
        }
        this.#unplugItems()
        this.units.length = 0
        this.events.length = 0
        this.initiative = []
        this.#plans.clear()
        this.#played.clear()
        this.#activated.clear()
        this.#cursor = 0
        this.#pass = 0
        this.#running = null
        this.#glide = null
        this.clock = 0
        this.actor = null
        this.effectDepth = 0
    }

    /** Bring a unit back from its state: its items plugged, then its stats, cards and statuses set. */
    #restoreUnit(state: UnitState): Unit {
        const unit = this.add(state.spec)
        for(const [name, base] of Object.entries(state.bases)){
            (unit.stats[name as keyof UnitStats].base as number|boolean) = base
        }
        unit.hand.push(...state.hand)
        unit.decks.all.forEach((deck, index) => {
            deck.pile.push(...state.decks[index].pile)
            deck.discard.push(...state.decks[index].discard)
        })
        unit.decks.cursor = state.cursor
        for(const [card, deck] of state.homes) unit.decks.remember(card, deck)
        for(const status of state.statuses){
            unit.statuses.set(status.type, status)
            status.init({ battle: this, unit })
            this.#tellLevels(unit, status)
        }
        return unit
    }

    /** Tell the signal of the levels each time a status of a unit goes to another one. */
    #tellLevels(unit: Unit, status: Status): void {
        status.onLevel = level => this.signals.statusLeveled.notify({ unit, type: status.type, level })
    }

    /** Plug an item into a unit, an error reported rather than thrown. */
    #plug(unit: Unit, item: Item): void {
        const held: (() => void)[] = []
        const ctx: PlugContext = {
            battle: this, unit,
            hold: kept => held.push(typeof kept === "function" ? kept : () => kept.remove()),
        }
        const plugs = this.#plugs.get(unit) ?? []
        plugs.push({ item, ctx, held })
        this.#plugs.set(unit, plugs)
        try {
            item.init(ctx)
        } catch(error){
            this.report(error)
        }
    }

    /** Unplug an item: it disposes of itself, then what it kept is taken back, errors reported. */
    #unplug({ item, ctx, held }: Plug): void {
        try {
            item.dispose(ctx)
        } catch(error){
            this.report(error)
        }
        for(const release of held.splice(0)){
            try {
                release()
            } catch(error){
                this.report(error)
            }
        }
    }

    /** Unplug every item of every unit: the battle is over. */
    #unplugItems(): void {
        for(const plugs of this.#plugs.values()) for(const plug of plugs) this.#unplug(plug)
        this.#plugs.clear()
    }

    /** Draw the cards of a unit for the round, as many as its stats say, then tell it drew. */
    #draw(unit: Unit): void {
        this.drawCards(unit, this.round === 1 ? unit.stats.firstDraw.value : unit.stats.draw.value)
        unit.drawn.notify(unit)
    }

    #startPass(): void {
        this.#pass++
        this.passStarted.notify(this.#pass)
        this.#checkOver()
    }

    /** Start the action of the next unit with one left, or end the round when none has: none then. */
    #startNext(): { readonly unit: Unit, readonly run: ActionRun }|null {
        while(this.phase === "execution"){
            if(!this.initiative.some(unit => unit.alive && unit.hasSteps)){
                this.#endRound()
                return null
            }
            if(this.#cursor >= this.initiative.length){
                this.#cursor = 0
                this.#startPass()
                continue
            }
            const unit = this.initiative[this.#cursor++]
            const run = unit.alive ? unit.playTurn() : null
            if(!run) continue
            this.#running = { unit, run }
            return this.#running
        }
        return null
    }

    #finish(unit: Unit): void {
        this.#running = null
        this.#tellGlide()
        unit.stepEnded.notify(unit)
        this.unitStepped.notify(unit)
        this.#checkOver()
    }

    #endRound(): void {
        // Nothing plays in what is left of the chains: it is read all the same, with no pass of its own.
        for(const unit of this.initiative) if(unit.alive) unit.readChain()
        // Whatever was left in the arena goes off one last time, so a bomb thrown last still blows.
        this.roundEnding.notify(this.round)
        // The processes end with the round, before anything is put away: none is ever saved.
        for(const unit of [...this.units]) this.endProcesses(unit)
        this.roundEnded.notify(this.round)
        for(const [unit, cards] of this.#played){
            for(const card of cards){
                const deck = unit.decks.discard(card)
                if(deck !== null) this.signals.discarded.notify({ unit, card, deck })
            }
        }
        this.#played.clear()
        for(const unit of this.units) unit.stepsPlayed.length = 0
        // The hazards gone off or worn out vanish: nothing is left of them.
        for(const hazard of this.units.filter(unit => unit.zone && !unit.alive)) this.vanish(hazard)
        this.#pass = 0
        this.actor = null
        this.#checkOver()
        if(this.phase === "over") return
        this.phase = "draw"
        this.phaseChanged.notify(this.phase)
    }

    /** Tell the move of the glide going on, as far as it went, then gather no more. */
    #tellGlide(): void {
        const glide = this.#glide
        if(!glide) return
        this.#glide = null
        const { unit, from } = glide
        if(from.position.equals(unit.position) && from.direction.equals(unit.direction)) return
        const duration = Math.max(1, this.clock - glide.clock) / TICKS_PER_SECOND
        this.signals.moved.notify({
            unit, from, to: { position: unit.position, direction: unit.direction }, duration,
        })
    }

    #checkOver(): void {
        if(this.phase === "over") return
        const standing = new Set(this.living.filter(unit => unit.decisive && !unit.vanishing).map(unit => {
            return unit.team
        }))
        if(standing.size > 1) return
        this.phase = "over"
        for(const unit of this.units) this.endProcesses(unit)
        for(const unit of this.units) unit.hearts.unplug()
        this.#unplugItems()
        this.winner = [...standing][0] ?? null
        this.events.push({ type: "over", winner: this.winner })
        this.signals.phase.notify(this.phase)
        this.phaseChanged.notify(this.phase)
    }

    #canMove(unit: Unit): boolean {
        if(unit.stats.mobility.value > 0) return true
        this.events.push({ type: "skipped", unit, reason: "immobilisé" })
        return false
    }

    /** How far a line from a point along a direction goes before a wall of the arena. */
    #wallDistance(from: Vector2, direction: Vector2): number {
        const { width, height } = this.arena
        const alongX = direction.x > 0 ? (width - from.x) / direction.x
            : direction.x < 0 ? -from.x / direction.x : Infinity
        const alongY = direction.y > 0 ? (height - from.y) / direction.y
            : direction.y < 0 ? -from.y / direction.y : Infinity
        return Math.max(0, Math.min(alongX, alongY))
    }

    /**
     * Move a unit to a point, told as a move unless a glide of it gathers its strides, then tell its
     * listeners.
     *
     * @param duration - How long the move is shown taking, in seconds, when it is told alone.
     */
    #relocate(unit: Unit, to: Vector2, duration: number): void {
        const from = unit.position
        if(this.#glide && this.#glide.unit !== unit) this.#tellGlide()
        unit.position = to
        if(!this.#glide){
            const { direction } = unit
            this.signals.moved.notify({
                unit, from: { position: from, direction }, to: { position: to, direction }, duration,
            })
        }
        this.#moved(unit, from, to)
    }

    /** Move a unit to a point at once, over whatever lies between, told as a blink, then its listeners. */
    #jump(unit: Unit, to: Vector2): void {
        if(this.#glide?.unit === unit) this.#tellGlide()
        const from = unit.position
        unit.position = to
        const { direction } = unit
        this.signals.blinked.notify({
            unit, from: { position: from, direction }, to: { position: to, direction },
        })
        this.#moved(unit, from, to)
    }

    /** Log a move, and tell its listeners. */
    #moved(unit: Unit, from: Vector2, to: Vector2): void {
        this.events.push({ type: "moved", unit, from, to })
        unit.moved.notify({ unit, from, to })
        this.unitMoved.notify({ unit, from, to })
    }
}


/**
 * How far along a line, a meter long direction from a point, it enters a disc, none when it misses it or
 * the disc lies behind. A line starting inside the disc enters it at once.
 */
function entryDistance(from: Vector2, direction: Vector2, center: Vector2, radius: number): number|null {
    const offset = center.minus(from)
    const along = direction.dot(offset)
    const across = offset.dot(offset) - along * along
    if(across > radius * radius) return null
    const entry = along - Math.sqrt(radius * radius - across)
    if(along + Math.sqrt(radius * radius - across) < 0) return null
    return Math.max(0, entry)
}

/** What a unit is at a rest: what it would enter with now, and what it holds beyond that. */
function unitState(unit: Unit): UnitState {
    const bases = Object.fromEntries(Object.entries(unit.stats).map(([name, stat]) => [name, stat.base]))
    return {
        spec: {
            name: unit.name, sprite: unit.sprite, team: unit.team, controller: unit.controller,
            position: unit.position,
            direction: unit.direction, hearts: unit.hearts.all, decks: unit.decks.all.map(() => []),
            items: unit.items,
            usables: unit.usables, decisive: unit.decisive, zone: unit.zone,
        },
        hand: [...unit.hand],
        decks: unit.decks.all.map(deck => ({ pile: [...deck.pile], discard: [...deck.discard] })),
        cursor: unit.decks.cursor, homes: unit.decks.homes,
        statuses: [...unit.statuses.values()],
        bases: bases as StatBases,
    }
}

/** A body left in the arena for a unit, by {@link Battle.place}. */
export interface PlacedBody {
    /** How it looks. */
    readonly sprite: Visual
    readonly name: string
    readonly at: Vector2
    readonly hearts: readonly Heart[]

    /** Does it take room? Yes by default. */
    readonly tangible?: boolean

    /** Do the cards and the bots aim at it, do blows and zones touch it, do others move it? Yes by default. */
    readonly targetable?: boolean
    readonly touchable?: boolean
    readonly movable?: boolean

    /** Where it faces, as its owner by default. */
    readonly direction?: Vector2

    /** How much bigger than the base its body is, a factor of its radius. 1 by default. */
    readonly size?: number

    /**
     * The cards it plays, none by default: a body playing them plays right after its owner, its deck in
     * order, drawing and playing them all each round, from the round it comes in.
     */
    readonly cards?: readonly Card[]

    /** The ground it covers, when it lies on it. None by default. */
    readonly zone?: Area|null
}

/** An item plugged into a unit: what it was given, and what it kept, to take back once unplugged. */
interface Plug {
    readonly item: Item
    readonly ctx: PlugContext
    readonly held: (() => void)[]
}

/** Where a body stopped, and how far from where it left. */
interface StoppedAt {
    readonly to: Vector2
    readonly distance: number
}

/** A process going on for a unit: what it was given, and what it kept, to take back once it ends. */
interface ProcessPlug {
    readonly process: Process
    readonly ctx: PlugContext
    readonly held: (() => void)[]
}

/**
 * Where a body overlapping an obstacle by less than the slack stops, blocked: backed along its way until it
 * touches nothing, or where it stood when it cannot be. Its distance is how far it backed.
 */
function backedOut(from: Vector2, direction: Vector2, clear: (point: Vector2) => boolean): StoppedAt {
    for(let back = BACK_OUT_STEP; back <= COLLISION_SLACK; back += BACK_OUT_STEP){
        const to = from.minus(direction.times(back))
        if(clear(to)) return { to, distance: back }
    }
    return { to: from, distance: 0 }
}
