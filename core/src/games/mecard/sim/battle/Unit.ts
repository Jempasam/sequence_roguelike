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
import type { Status, StatusType } from "../status/Status"

import type { Action, ActionRun } from "./Action"
import type { Battle } from "./Battle"
import { Decks } from "./Decks"
import type {
    ActivationEvent, AttackEvent, CardInvalidEvent, ChainChangeEvent, DeathEvent, HitEvent, MoveEvent,
} from "./events"
import type { Area } from "./Area"
import type { Team } from "./Team"

/**
 * What a summoned body is, which its look follows: a coin, a log, a stone of a wall... or a hazard left in
 * the arena, a bomb, flames, a puddle.
 */
export type SummonLook =
    |"coin"|"log"|"stone"|"barrel"|"totem"|"thorns"|"bomb"|"fire"|"puddle"|"mine"|"shadow"|"tornado"|"wave"
    |"rock"|"robot"

/** The color each kind of summoned body is drawn and named in. */
export const SUMMON_COLORS: Readonly<Record<SummonLook, Rgba>> = {
    coin: rgba(1, 0.85, 0.3),
    log: rgba(0.65, 0.45, 0.25),
    stone: rgba(0.6, 0.6, 0.62),
    barrel: rgba(0.75, 0.5, 0.3),
    totem: rgba(0.5, 0.9, 0.6),
    thorns: rgba(0.35, 0.7, 0.3),
    bomb: rgba(0.2, 0.2, 0.22),
    fire: rgba(1, 0.45, 0.15, 0.45),
    puddle: rgba(0.5, 0.5, 0.7, 0.35),
    mine: rgba(0.35, 0.3, 0.25),
    shadow: rgba(0.25, 0.15, 0.35, 0.6),
    tornado: rgba(0.8, 1, 0.85, 0.6),
    wave: rgba(0.3, 0.6, 1, 0.5),
    rock: rgba(0.55, 0.52, 0.48),
    robot: rgba(0.6, 0.7, 0.75),
}

/** Who plans the chains of a unit. */
export type Controller = "player"|"bot"

/** What a unit is made from when it enters a battle. */
export interface UnitSpec {
    readonly name: string

    /** Its picture, by its name among the sprites of the units, none by default: a body, a hazard. */
    readonly sprite?: string|null

    readonly team: Team
    readonly controller: Controller
    readonly position: Vector2
    readonly direction: Vector2

    /** Its hearts, copied: the battle never changes those it was given. */
    readonly hearts: readonly Heart[]

    /** The cards of each of its decks, each shuffled into its draw pile: it may have none. */
    readonly decks: readonly (readonly Card[])[]

    readonly items?: readonly Item[]

    /** Does it vanish at the end of the round, as a clone does? No by default. */
    readonly temporary?: boolean

    /**
     * What it is when it is a summoned body, none for a character: a body with no deck, out of the order of
     * play, which no team stands by. None by default.
     */
    readonly summoned?: SummonLook|null

    /** What it carries to use once, during a preparation: its belt. None by default. */
    readonly usables?: readonly Carried[]

    /**
     * Does it play its cards although it is a summoned body: a robot, a bomb, a whirlwind? It then plays
     * right after its owner, as a bot, its deck in order. No by default.
     */
    readonly acting?: boolean

    /**
     * Does its body take room, so it blocks the way and the others aim at it, hit it, push it? Yes by
     * default; a hazard lying on the ground does not.
     */
    readonly tangible?: boolean

    /** The ground it covers, for a body lying on the arena: a puddle, flames. None by default. */
    readonly zone?: Area|null

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

/** How many cards a unit draws at the start of a battle, by default. */
export const STARTING_HAND = 5

/** How many cards a unit draws at the start of each later round, by default. */
export const DRAW_PER_ROUND = 2

/** How many cards the chain of a unit holds at most, by default, at every depth. */
export const CHAIN_SIZE = 4

/** How many cards the hand of a unit holds at most, by default: the draw stops there. */
export const HAND_SIZE = 8

/** How far the aim looks for an enemy, in meters. */
export const AIM_RANGE = 4

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
     * a potion, a shot. Its blows at hand keep their shape.
     */
    public readonly throwRange = new Attribute(1)

    /** Its healing: the hearts added to each heart its cards give. */
    public readonly heal = new Attribute(0)

    /** Its summoning: the hearts added to the life of each body it summons. */
    public readonly summon = new Attribute(0)

    /** Its alchemy: the levels added to each potion it applies. */
    public readonly alchemy = new Attribute(0)

    /** Its vision: how far it aims and looks for a target, in meters. */
    public readonly aimRange = new Attribute(AIM_RANGE)

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

    /** Its size: how much bigger than the base its body is, a factor of its radius. */
    public readonly size = new Attribute(1)
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

    /** It changed cell. */
    public readonly moved: Observable<MoveEvent>

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

    /** Its preparations were built, its chain rewritten. */
    public readonly onPrep: Observable<Unit>


    //// State ////

    public readonly name: string

    /** Its picture, by its name among the sprites of the units, none for one with no picture. */
    public readonly sprite: string|null

    public readonly team: Team
    public readonly controller: Controller
    /** Its items: those it entered with, and those given during the battle, plugged in as given. */
    public readonly items: Item[]

    /** What it carries to use once, during a preparation: what is used leaves it. */
    public readonly usables: Carried[]

    /** Does it vanish at the end of the round? */
    public readonly temporary: boolean

    /** What it is when it is a summoned body, none for a character. */
    public readonly summoned: SummonLook|null

    /** Does it play its cards although it is a summoned body? It then plays right after its owner. */
    public readonly acting: boolean

    /** Who summoned it, none for a character: a summoned body that plays plays right after it. */
    public owner: Unit|null = null

    /** Does its body take room: does it block the way, is it aimed at and hit? */
    public readonly tangible: boolean

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

    /** The steps ready to play, the next one first, before what its chain has left to give. */
    public readonly steps: Action[] = []

    /** What it played this round, in order, the step being played last: gone with the round. */
    public readonly stepsPlayed: Action[] = []

    public readonly hand: Card[] = []
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
        this.moved = new Observable(report)
        this.killed = new Observable(report)
        this.onDeath = new Observable(report)
        this.stepStarted = new Observable(report)
        this.stepEnded = new Observable(report)
        this.drawn = new Observable(report)
        this.onActivate = new Observable(report)
        this.onCardInvalid = new Observable(report)
        this.onChainChange = new Observable(report)
        this.onPrep = new Observable(report)
        this.name = spec.name
        this.sprite = spec.sprite ?? null
        this.team = spec.team
        this.controller = spec.controller
        this.items = [...spec.items ?? []]
        this.usables = [...spec.usables ?? []]
        this.temporary = spec.temporary ?? false
        this.summoned = spec.summoned ?? null
        this.acting = spec.acting ?? false
        this.tangible = spec.tangible ?? true
        this.zone = spec.zone ?? null
        this.position = spec.position
        this.direction = spec.direction
        this.hearts = new Hearts(this, spec.hearts)
        for(const [name, base] of Object.entries(spec.bases ?? {})){
            (this.stats[name as keyof UnitStats].base as number|boolean) = base
        }
        this.decks = new Decks(spec.decks, rng, this.stats.ordered)
    }


    /** Does it still have a heart keeping it alive? */
    public get alive(): boolean {
        return !this.hearts.isDead
    }

    /** Does it play for its team, a character or its clone, rather than being a summoned body? */
    public get character(): boolean {
        return this.summoned === null
    }

    /** Does it take a place in the order of play: a character, or a summoned body playing its cards? */
    public get plays(): boolean {
        return (this.character && !this.temporary) || this.acting
    }

    /** The radius of its body, in meters: the base, times its size. */
    public get radius(): number {
        return UNIT_RADIUS * this.stats.size.value
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
        this.steps.push(...this.#guarded(() => this.chain.next(ACTION), null) ?? [])
        return this.steps.length > 0
    }

    /** Read what is left of its chain: every step it gives made ready, each card that cannot play told. */
    public readChain(): void {
        const { chain } = this
        while(chain.cursor < chain.cards.length){
            this.steps.push(...this.#guarded(() => chain.next(ACTION), null) ?? [])
        }
    }

    /**
     * Start its next step, telling it does.
     *
     * @returns What plays it, none when it has none left, or when it died of being told.
     */
    public playTurn(): ActionRun|null {
        const { battle } = this
        if(!this.fillSteps()) return null
        const action = this.steps.shift()
        if(!action) return null
        battle.actor = this
        this.stepsPlayed.push(action)
        battle.signals.stepStarted.notify({ unit: this, left: this.stepsLeft })
        this.stepStarted.notify(this)
        battle.unitStepping.notify(this)
        return this.alive ? action.use({ battle, unit: this }) : null
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


    /** What its chain tells, told in turn. */
    readonly #watcher: ChainWatcher = {
        activated: (first, last) => {
            const cards = this.chain.cards.slice(first, last + 1)
            this.onActivate.notify({ unit: this, first, last, cards })
        },
        invalid: index => this.onCardInvalid.notify({ unit: this, index }),
        changed: () => {
            const { cards, cursor } = this.chain
            this.onChainChange.notify({ unit: this, cards: [...cards], cursor })
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
