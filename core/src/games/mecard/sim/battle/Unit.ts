import type { Text } from "../../../../semantic"
import { Attribute } from "../base/Attribute"
import { Observable } from "../base/Observable"
import { colored, rgba } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"
import type { Vector2 } from "../base/Vector2"
import type { Card } from "../card/Card"
import { CardChain } from "../card/CardChain"
import type { ChainWatcher } from "../card/CardChain"
import { ACTION } from "../card/CardType"
import type { Carried } from "../usable/Usable"
import type { Heart } from "../heart/Heart"
import { Hearts } from "../heart/Hearts"
import type { Item } from "../item/Item"
import type { Process } from "../process/Process"
import { Vanishing } from "../process/subs/Vanishing"
import type { Status, StatusType } from "../status/Status"

import type { UnitController } from "../ai/UnitController"
import type { Action, Pose } from "./Action"
import type { Battle } from "./Battle"
import { Decks } from "./Decks"
import type {
    ActivationEvent, AttackEvent, CardInvalidEvent, ChainChangeEvent, ChainOverflowEvent, DeathEvent, HitEvent,
    IncomingShove, MoveEvent,
} from "./events"
import type { Area } from "./Area"
import { Disk } from "./hitbox/Disk"
import type { Hitbox } from "./hitbox/Hitbox"
import type { Team } from "./Team"
import type { Visual } from "../base/Visual"

/** How many cards a chain holds at most while it plays: past it, it is told overflowing and emptied. */
export const MAX_CHAIN_CARDS = 50

/**
 * Who plans the chains of a unit: a player, a bot, which plays as {@link Battle.bot} says, or a given
 * {@link UnitController}, a bot that plays its own way.
 */
export type Controller = "player"|"bot"|UnitController

/** What a unit is made from when it enters a battle. */
export interface UnitSpec {
    readonly name: string

    /** How it looks, none by default: a body, a hazard. */
    readonly sprite?: Visual|null

    readonly team: Team
    readonly controller: Controller
    readonly position: Vector2
    readonly direction: Vector2

    /** Its hearts, copied: the battle never changes those it was given. */
    readonly hearts: readonly Heart[]

    /** The cards of each of its decks, each shuffled into its draw pile: it may have none. */
    readonly decks: readonly (readonly Card[])[]

    /** The cards it plays as often as it wishes, with none in its hand. None by default. */
    readonly unlimited?: readonly Card[]

    readonly items?: readonly Item[]

    /**
     * Does it count for its team: for the end of the battle, the seats of the players and the colors of
     * the team? Yes by default; a body summoned, a clone, a pillar does not.
     */
    readonly decisive?: boolean

    /** What it carries to use once, during a preparation: its belt. None by default. */
    readonly usables?: readonly Carried[]

    /** The ground it covers, for a body lying on the arena: a puddle, flames. None by default. */
    readonly zone?: Area|null

    /** The shape of its body at size 1, scaled by its size: a disc of {@link UNIT_RADIUS} by default. */
    readonly hitbox?: Hitbox

    /**
     * The bases of its stats that are not those of {@link UnitStats}, the others left as they are there. A
     * monster sets its draw to one round of its loop, and keeps its deck in order: the cards are then drawn
     * in the order given, and the discard goes back under in the order played, so the deck plays the same
     * loop again.
     */
    readonly bases?: Partial<StatBases>
}

/** The base of each stat of a unit, before the modifiers of its items and statuses. */
export type StatBases = {
    -readonly [K in keyof UnitStats]: UnitStats[K] extends Attribute<infer T> ? T : never
}

/** The unit with the least life among others, the first of them when tied, none among none. */
export function frailest(units: readonly Unit[]): Unit|null {
    let found: Unit|null = null
    for(const unit of units) if(!found || unit.life < found.life) found = unit
    return found
}

/** The radius of the body of a unit of size 1, in meters: two such never come closer than twice that. */
export const UNIT_RADIUS = 0.35

/** The shape of the body of a unit of size 1, by default. */
export const UNIT_HITBOX: Hitbox = new Disk(UNIT_RADIUS)

/** How many cards a unit draws at the start of a battle, by default. */
export const STARTING_HAND = 5

/** How many cards a unit draws at the start of each later round, by default. */
export const DRAW_PER_ROUND = 2

/** How many cards the chain of a unit holds at most, by default, at every depth. */
export const CHAIN_SIZE = 4

/** How many cards the hand of a unit holds at most, by default: the draw stops there. */
export const HAND_SIZE = 8

/** The stats of a unit, which items and statuses change through modifiers. */
export class UnitStats {


    /** Its strength: the hearts added to each of its blows at hand. */
    public readonly strength = new Attribute(0)

    /** Its precision: the hearts added to each of its shots. */
    public readonly precision = new Attribute(0)

    /**
     * Its agility: how much farther than their base its moves go, a factor: a step, a dash, a blink. Moves
     * another unit makes it do, a push or a charm, keep their own length.
     */
    public readonly move = new Attribute(1)

    /**
     * Its reach: how much farther than their base what it throws or shoots goes, a factor: a bomb, a hook,
     * a potion, a shot. Its blows at hand follow its reach at hand instead.
     */
    public readonly throwRange = new Attribute(1)

    /** Its reach at hand: how much farther than their base its blows at hand go, a factor: a slash, a thrust, a stab. */
    public readonly meleeRange = new Attribute(1)

    /** Its healing: the hearts added to each heart its cards give. */
    public readonly heal = new Attribute(0)

    /** Its summoning: the hearts added to the life of each body it summons. */
    public readonly summon = new Attribute(0)

    /** Its alchemy: the levels added to each potion it applies. */
    public readonly alchemy = new Attribute(0)

    /** Can it move on its own: none or less when it is rooted. */
    public readonly mobility = new Attribute(1)

    /** How many cards it draws at the start of each round after the first. */
    public readonly draw = new Attribute(DRAW_PER_ROUND)

    /** How many cards its chain holds at most, at every depth, a hooked card counting for one. */
    public readonly chainSize = new Attribute(CHAIN_SIZE)

    /** How many cards its hand holds at most: the draw stops there. */
    public readonly handSize = new Attribute(HAND_SIZE)

    /** How many cards it draws at the start of the battle. */
    public readonly firstDraw = new Attribute(STARTING_HAND)

    /** Is its deck kept in order, never shuffled? */
    public readonly ordered = new Attribute(false)

    /**
     * Is its chain shown to those who do not plan it, during a preparation? Yes by default. Shown with
     * {@link UnitStats.showHand}, its chain is what is shown once it holds a card.
     */
    public readonly showChain = new Attribute(true)

    /**
     * Is its hand shown to those who do not plan it, during a preparation? No by default. Shown when its
     * chain is not, or is still empty.
     */
    public readonly showHand = new Attribute(false)

    /** Its size: how much bigger than the base its body is, a factor of its radius. */
    public readonly size = new Attribute(1)

    /**
     * Does its body take room, so it blocks the way and the others aim at it, hit it, push it? Yes by
     * default; a hazard lying on the ground does not.
     */
    public readonly tangible = new Attribute(true)

    /** Do the cards and the bots aim at it, and take it for an enemy? A pillar is not aimed at. */
    public readonly targetable = new Attribute(true)

    /** Do blows, zones, potions and lightning touch it? A pillar is not touched. */
    public readonly touchable = new Attribute(true)

    /** Do others move it: a push, a wind, a whirlwind? Its own moves are not concerned, as `mobility` is. */
    public readonly movable = new Attribute(true)

    /**
     * Do the walls of the arena stop it? Yes by default; a ship that sails across the arena and out of it is
     * not stopped, and is gone once it lies wholly outside.
     */
    public readonly bounded = new Attribute(true)
}

/**
 * A character in a battle: where it stands and faces, its hearts, its statuses, its cards and the steps it
 * has left to play this round.
 *
 * @remarks
 * A unit lives for one battle. What lasts through the run (its cards, its hearts, its items) is given back
 * to the run when the battle ends, and the observers of the battle die with it.
 */
export class Unit {


    //// Triggers ////

    /** It lashes out, whether it touches anyone or not. */
    public readonly attacking: Observable<AttackEvent>

    /** One of its attacks touched another unit. */
    public readonly hitting: Observable<HitEvent>

    /** Another unit's attack touched it. */
    public readonly struck: Observable<HitEvent>

    /** It changed cell. */
    public readonly moved: Observable<MoveEvent>

    /** Another unit is about to move it: what it hears may shorten the way. */
    public readonly incomingShove: Observable<IncomingShove>

    /** Another unit moved it: where from and to. Told besides {@link Unit.moved}, which tells every move. */
    public readonly shoved: Observable<MoveEvent>

    /** Is another unit moving it right now? Its strides then are not its own. */
    public shoving = false

    /** It killed another unit. */
    public readonly killed: Observable<DeathEvent>

    /** It died. */
    public readonly onDeath: Observable<DeathEvent>

    /** One of its steps is about to play. */
    public readonly stepStarted: Observable<Unit>

    /** One of its steps was played. */
    public readonly stepEnded: Observable<Unit>

    /** It drew its cards for the round. */
    public readonly drawn: Observable<Unit>

    /** A tree of its chain is about to play. */
    public readonly onActivate: Observable<ActivationEvent>

    /** A card of its chain could not be built. */
    public readonly onCardInvalid: Observable<CardInvalidEvent>

    /** Its chain changed, or its reading went on. */
    public readonly onChainChange: Observable<ChainChangeEvent>

    /** Its chain holds {@link MAX_CHAIN_CARDS} cards or more. */
    public readonly onChainOverflow: Observable<ChainOverflowEvent>

    /** Its preparations were built, its chain rewritten. */
    public readonly onPrep: Observable<Unit>


    //// State ////

    public readonly name: string

    /** How it looks, none for one with no picture. */
    public readonly sprite: Visual|null

    public readonly team: Team

    /** Who gives its chain: changed by {@link Battle.control}. */
    public controller: Controller

    /** Its items: those it entered with, and those given during the battle, plugged in as given. */
    public readonly items: Item[]

    /** What it carries to use once, during a preparation: what is used leaves it. */
    public readonly usables: Carried[]

    /** Does it count for its team: the end of the battle, the seats, the colors? */
    public readonly decisive: boolean

    /** Who summoned it, none when nobody did: a body that plays its cards plays right after its owner. */
    public owner: Unit|null = null

    /** The ground it covers, for a body lying on the arena, none for one standing. */
    public readonly zone: Area|null

    public position: Vector2

    /** Where it faces: any direction, a meter long. */
    public direction: Vector2

    /** Its life bar. */
    public readonly hearts: Hearts

    /** Its statuses, one of each kind at most. */
    public readonly statuses = new Map<StatusType, Status>()

    /** The processes going on for it this round, in the order they started: the battle keeps them. */
    public readonly processes: Process[] = []

    /** What it reads its steps from this round: what it committed, once rewritten. */
    public chain = new CardChain()

    /** The first card of the last tree of its chain it started playing, none before it plays any. */
    public lastPlayed: Card|null = null

    /** All the cards of the last tree of its chain it started playing, the first one included, none before. */
    public lastTree: readonly Card[] = []

    /** The steps ready to play, the next one first, before what its chain has left to give. */
    public readonly steps: Action[] = []

    /** What it played this round, in order, the step being played last: gone with the round. */
    public readonly stepsPlayed: Action[] = []

    public readonly hand: Card[] = []

    /** The cards it plays as often as it wishes, with none in its hand: told from the others by identity. */
    public readonly unlimited: readonly Card[]
    public readonly decks: Decks
    public readonly stats = new UnitStats()

    /** The color it is drawn and named in, the same on the board and in the texts: given by its battle. */
    public color: Rgba = rgba(1, 1, 1)

    constructor(
        spec: UnitSpec,

        /** The battle it fights in, which it tells what it does. */
        public readonly battle: Battle,
    ){
        const { report, rng } = battle
        this.attacking = new Observable(report)
        this.hitting = new Observable(report)
        this.struck = new Observable(report)
        this.moved = new Observable(report)
        this.incomingShove = new Observable(report)
        this.shoved = new Observable(report)
        this.killed = new Observable(report)
        this.onDeath = new Observable(report)
        this.stepStarted = new Observable(report)
        this.stepEnded = new Observable(report)
        this.drawn = new Observable(report)
        this.onActivate = new Observable(report)
        this.onCardInvalid = new Observable(report)
        this.onChainChange = new Observable(report)
        this.onChainOverflow = new Observable(report)
        this.onPrep = new Observable(report)
        this.name = spec.name
        this.sprite = spec.sprite ?? null
        this.team = spec.team
        this.controller = spec.controller
        this.items = [...spec.items ?? []]
        this.usables = [...spec.usables ?? []]
        this.decisive = spec.decisive ?? true
        this.zone = spec.zone ?? null
        this.#shape = spec.hitbox ?? UNIT_HITBOX
        this.position = spec.position
        this.direction = spec.direction
        this.hearts = new Hearts(this, spec.hearts)
        for(const [name, base] of Object.entries(spec.bases ?? {})){
            (this.stats[name as keyof UnitStats].base as number|boolean) = base
        }
        this.unlimited = [...spec.unlimited ?? []]
        this.decks = new Decks(spec.decks, rng, this.stats.ordered)
    }


    /** Does it still have a heart keeping it alive? */
    public get alive(): boolean {
        return !this.hearts.isDead
    }

    /** Does it have cards to play? Then it takes a place in the order of play. */
    public get plays(): boolean {
        return this.hand.length > 0 || this.decks.all.some(deck => deck.pile.length + deck.discard.length > 0)
    }

    /** Does it vanish at the end of the round, as a clone does? */
    public get vanishing(): boolean {
        return this.processes.some(process => process instanceof Vanishing)
    }

    /** Does its body take room: does it block the way? */
    public get tangible(): boolean { return this.stats.tangible.value }

    /** Do the cards and the bots aim at it? */
    public get targetable(): boolean { return this.stats.targetable.value }

    /** Do blows and zones touch it? */
    public get touchable(): boolean { return this.stats.touchable.value }

    /** Do others move it? */
    public get movable(): boolean { return this.stats.movable.value }

    /** Do the walls of the arena stop it? */
    public get bounded(): boolean { return this.stats.bounded.value }

    /** The shape of its body: the base one, times its size. */
    public get hitbox(): Hitbox {
        return this.#shape.scaled(this.stats.size.value)
    }

    /** The shape of its body at size 1, the one it was made with. */
    public get baseHitbox(): Hitbox {
        return this.#shape
    }

    /** The radius of the disc around its body that holds it whole, in meters: the base, times its size. */
    public get radius(): number {
        return this.hitbox.reach
    }

    /**
     * Where the edge of its body lies from a pose, going a direction: where its blows and shots start from,
     * their reach counted from there and not from its middle.
     *
     * @param pose - Where it would stand and face, where it stands and faces by default.
     * @param direction - Where the blow goes, a meter long, where the pose faces by default: backward for a
     * blow behind.
     */
    public muzzle(pose: Pose = this, direction: Vector2 = pose.direction): Vector2 {
        return pose.position.plus(direction.times(this.hitbox.edge(pose, direction)))
    }

    /** The zone around its body, at a pose, as far from its edge as a margin, in meters. */
    public around(margin: number, pose: Pose = this): Area {
        return this.hitbox.grown(pose, margin)
    }

    /** How many of its hearts are not empty. */
    public get life(): number {
        return this.hearts.hearts
    }

    /** How many of its hearts are empty. */
    public get missing(): number {
        return this.hearts.maxHearts - this.hearts.hearts
    }

    /** Is it feverish: more of its hearts empty than full? */
    public get feverish(): boolean {
        return this.missing > this.life
    }

    /** Has it anything left to play this round? */
    public get hasSteps(): boolean {
        return this.stepsLeft > 0
    }

    /** How many steps it has left to play this round: those ready, then those of its chain. */
    public get stepsLeft(): number {
        return this.steps.length + this.#guarded(() => this.chain.actionsLeft(), []).length
    }

    /** Read a chain from now on, in place of the one before. */
    public takeChain(chain: CardChain): void {
        this.chain.watcher = null
        this.chain = chain
        this.lastPlayed = null
        this.lastTree = []
        chain.watcher = this.#watcher
        this.#watcher.changed()
    }

    /** Build the preparations of its chain and rewrite it, each acting on the battle. */
    public prepare(): void {
        const { battle } = this
        const pick = <T>(options: readonly T[]): T => battle.rng.pick(options) ?? options[0]
        this.#guarded(() => this.chain.prepare({ pick }, battle.cardsOf(this), { battle, unit: this }), null)
        this.onPrep.notify(this)
    }

    /** Have the next step ready, read from its chain when none is. Is there one? */
    public fillSteps(): boolean {
        if(this.steps.length > 0) return true
        this.readOne()
        return this.steps.length > 0
    }

    /** The cards of its chain it has not started reading yet, in order: what it has yet to play. */
    public unplayed(): Card[] {
        return this.chain.cards.slice(this.chain.cursor)
    }

    /** Read the next tree of its chain, its step made ready after those it has. */
    public readOne(): void {
        const action = this.#guarded(() => this.chain.next(ACTION), null)
        if(action) this.steps.push(action)
    }

    /** Read what is left of its chain: every step it gives made ready, each card that cannot play told. */
    public readChain(): void {
        const { chain } = this
        while(chain.cursor < chain.cards.length) this.readOne()
    }

    /**
     * Start its next step, telling it does.
     *
     * @returns What plays it, none when it has none left, or when it died of being told.
     */
    public playTurn(): Action|null {
        const { battle } = this
        if(!this.fillSteps()) return null
        const action = this.steps.shift()
        if(!action) return null
        battle.actor = this
        this.stepsPlayed.push(action)
        battle.signals.stepStarted.notify({ unit: this, left: this.stepsLeft })
        this.stepStarted.notify(this)
        battle.unitStepping.notify(this)
        return this.alive ? action : null
    }

    /** Die, once nothing keeps it alive: its rules and processes go, and what it had left to play. */
    public die(source: Unit|null): void {
        const { battle } = this
        this.hearts.unplug()
        battle.endProcesses(this)
        this.steps.length = 0
        battle.events.push({ type: "died", unit: this })
        this.onDeath.notify({ unit: this, source })
        source?.killed.notify({ unit: this, source })
    }

    /** The status of a kind it holds, none when it holds none. */
    public statusOf(type: StatusType): Status|undefined {
        return this.statuses.get(type)
    }

    /** Its name, so a sentence names it: its state is for {@link Unit.hearts}, {@link Unit.stats}. */
    public toString(): string { return this.name }

    /** Its name in its color. */
    public toSemString(): Text { return colored(this.color, this.name) }


    /** The shape of its body at size 1. */
    readonly #shape: Hitbox

    /** What its chain tells, told in turn. */
    readonly #watcher: ChainWatcher = {
        activated: (first, last) => {
            const cards = this.chain.cards.slice(first, last + 1)
            this.lastPlayed = cards[0] ?? null
            this.lastTree = cards
            this.onActivate.notify({ unit: this, first, last, cards })
        },
        invalid: index => this.onCardInvalid.notify({ unit: this, index }),
        changed: () => {
            const { cards, cursor, borrowed } = this.chain
            this.onChainChange.notify({ unit: this, cards: [...cards], cursor, borrowed: [...borrowed] })
            if(cards.length >= MAX_CHAIN_CARDS) this.onChainOverflow.notify({ unit: this, cards: [...cards] })
        },
    }

    /**
     * Read its chain, an error reported rather than thrown: the chain is lost, what a card that breaks
     * would have given after it with it.
     */
    #guarded<T>(read: () => T, fallback: T): T {
        try {
            return read()
        } catch(error){
            this.battle.report(error)
            this.chain.cursor = this.chain.cards.length
            return fallback
        }
    }
}
