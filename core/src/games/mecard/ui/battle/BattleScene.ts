import type { Color } from "../../../../engine/math"
import { Vector2 } from "../../sim/base/Vector2"
import type { Area } from "../../sim/battle/Area"
import type { Battle } from "../../sim/battle/Battle"
import type { Indicator } from "../../sim/battle/preview/Preview"
import type { Unit } from "../../sim/battle/Unit"
import type { Card } from "../../sim/card/Card"
import { Heart } from "../../sim/heart/Heart"
import type { Process } from "../../sim/process/Process"
import type { Tether } from "../../sim/battle/signals"
import type { StatusType } from "../../sim/status/Status"
import type { FxResolved } from "../look/FxSprites"
import type { StrikePlacement } from "../look/placeStrike"

/** How many cards a deck holds, as the screen shows it. */
export interface SceneDeck {
    pile: number
    discard: number
}

/** How many cards each deck of a unit holds now. */
export function decksOf(unit: Unit): SceneDeck[] {
    return unit.decks.all.map(({ pile, discard }) => ({ pile: pile.length, discard: discard.length }))
}

/** The chain of a unit as the screen shows it: its cards, and where its reading stands. */
export interface SceneChain {
    readonly cards: readonly Card[]

    /** The next card to read: those before it are greyed out. */
    readonly cursor: number

    /** The places of the cards another unit put in the chain. */
    readonly borrowed: readonly number[]
}

/** The cards of a chain being looked at, the first and the last of them. */
export interface LitCards {
    readonly unit: Unit
    readonly first: number
    readonly last: number

    /** Could they not be built? They are then crossed out. */
    readonly invalid: boolean

    /** Only these places between the first and the last, all of them when none are told. */
    readonly indexes?: readonly number[]

    /** The color they are outlined in. */
    readonly edge: Color
}

/** Hearts being looked at together, by their places in the bar shown. */
export interface LitHeart {
    readonly unit: Unit
    readonly indexes: readonly number[]

    /** The color they are outlined in. */
    readonly edge: Color
}

/** A status being looked at. */
export interface LitStatus {
    readonly unit: Unit
    readonly type: StatusType

    /** The color it is outlined in. */
    readonly edge: Color
}

/** A process being looked at. */
export interface LitProcess {
    readonly unit: Unit
    readonly process: Process
}

/** A card going from a deck to the hand of a unit, the last of its hand already. */
export interface Flight {
    readonly unit: Unit
    readonly card: Card

    /** The deck it left, by its place among them, -1 for a card from elsewhere. */
    readonly deck: number

    /** How far it went, from 0 to 1. */
    share: number
}

/** A status as the screen shows it: its kind and the level it has in the replay. */
export interface ShownStatus {
    readonly type: StatusType
    level: number
}

/** A unit as the screen shows it, which the replay moves on, behind the battle already further on. */
export interface SceneUnit {
    readonly unit: Unit
    position: Vector2
    direction: Vector2

    /** Its life bar, copies the battle never changes. */
    hearts: readonly Heart[]

    /** Its statuses, at the level the replay has them. */
    statuses: ShownStatus[]

    /** The processes going on for it, in the order they started. */
    processes: Process[]

    /** How many steps it has left this round. */
    steps: number

    /** The chain it reads this round. */
    chain: SceneChain

    /** The cards in its hand. */
    hand: Card[]

    /** How many cards each of its decks holds. */
    decks: SceneDeck[]

    /** The deck it draws from next, by its place among them. */
    cursor: number

    alive: boolean

    /** How much of it is seen, from 0 to 1: it fades out and in when it blinks. */
    opacity: number

    /** How far it is drawn from where it stands, in meters: a lunge, a shiver. */
    offset: Vector2

    /** How much of it is lit white, from 0 to 1: it flashes when hit. */
    flash: number
}

/** A blow being played over the arena: how it is shown, where it lies, and how far it went. */
export interface PlayedStrike {
    readonly area: Area
    readonly placement: StrikePlacement
    readonly shown: FxResolved

    /** What its random parts are drawn from: each blow played has its own. */
    readonly seed: number

    /** How far it went, from 0 to 1. */
    share: number
}

/** The mark of a blow on a unit it landed on, being played. */
export interface PlayedImpact {
    /** Where the unit stands. */
    readonly at: Vector2

    /** The way of the blow, a meter long. */
    readonly forward: Vector2

    /** How many times larger than a unit of the base size the unit is. */
    readonly scale: number
    readonly shown: Extract<FxResolved, { kind: "sprite" }>

    /** How far it went, from 0 to 1. */
    share: number
}

/** Something to look at a moment, before it acts: what lights up, and the word said over its unit. */
export interface NoticeWord {
    readonly unit: Unit
    readonly word: string
}

/**
 * The battle as the screen shows it: the units where the replay has them, what it draws over the arena,
 * what it lights up. The board and the panels draw this, never the battle itself, which a round played at
 * once leaves ahead.
 *
 * @remarks
 * Built again from the battle at each rest, by {@link BattleScene.resync}, so whatever the replay missed
 * is caught up there.
 */
export class BattleScene {


    /** What is drawn over the arena now, the oldest first. */
    public indicators: readonly Indicator[] = []

    /** The blows being played over the arena now, the oldest first. */
    public strikes: readonly PlayedStrike[] = []

    /** How many blows were played: the seed of the next, so each is drawn differently. */
    public strikeCount = 0

    /** The impacts being played on units now, the oldest first. */
    public impacts: readonly PlayedImpact[] = []

    /** The ties between units drawn now, the oldest first. */
    public tethers: readonly Tether[] = []

    /** The unit playing its step, none between two. */
    public actor: Unit|null = null

    /** What is being looked at before it acts, none when nothing is. */
    public notice: NoticeWord|null = null

    /** The cards being looked at, none when none are. */
    public get litCards(): LitCards|null { return this.#litCards }

    /** The heart being looked at, none when none is. */
    public get litHeart(): LitHeart|null { return this.#litHeart }

    /** The process being looked at, none when none is. */
    public get litProcess(): LitProcess|null { return this.#litProcess }

    /** The status being looked at, none when none is. */
    public get litStatus(): LitStatus|null { return this.#litStatus }

    /** The card being drawn, none when none is. */
    public flight: Flight|null = null

    /** The unit whose draw is being watched, its hand shown from one card to the next, none when none. */
    public drawer: Unit|null = null

    /**
     * How many times what the panels show changed: the hearts, the statuses, the steps, who stands. The
     * screen builds them again when it moves.
     */
    public version = 0


    /**
     * The units in the order they play, as shown: the battle may already be a round ahead, its units made
     * anew by a load.
     */
    public get order(): readonly Unit[] { return this.#order }

    /** Show the units playing in another order, a new round drawing. */
    public reorder(initiative: readonly Unit[]): void {
        this.#order = [...initiative]
        this.version++
    }

    /**
     * Put a unit coming in the order shown, after the one it follows in the battle. A body out of the order,
     * or a battle gone further, leaves it out until the next state taken.
     */
    public enterOrder(unit: Unit, initiative: readonly Unit[]): void {
        const at = initiative.indexOf(unit)
        if(at < 0) return
        this.#order.splice(this.#order.indexOf(initiative[at - 1]) + 1, 0, unit)
        this.version++
    }

    /** The units of the battle, in the order they entered, the dead ones left out. */
    public get living(): SceneUnit[] {
        return [...this.#units.values()].filter(each => each.alive)
    }

    /** What the scene shows of a unit, none for one it does not know or that left. */
    public of(unit: Unit): SceneUnit|undefined {
        return this.#units.get(unit)
    }

    /** Does a unit stand in the scene? */
    public alive(unit: Unit): boolean {
        return this.#units.get(unit)?.alive ?? false
    }

    /** Take the state of the battle as it is now, every unit as it stands. */
    public resync(battle: Battle): void {
        this.capture(battle)()
    }

    /**
     * Keep the state of the battle as it is now, for the scene to take it later: what plays then may be
     * behind a battle already gone further.
     *
     * @returns What takes it.
     */
    public capture(battle: Battle): () => void {
        const kept = new BattleScene()
        for(const unit of battle.units) kept.add(unit)
        kept.#order = [...battle.initiative]
        const actor = battle.executing ? battle.actor : null
        return () => this.#take(kept, actor)
    }

    /** Take every unit of a scene kept, and nothing of what was going on. */
    #take(kept: BattleScene, actor: Unit|null): void {
        this.#units.clear()
        for(const [unit, shown] of kept.#units) this.#units.set(unit, shown)
        this.#order = kept.#order
        this.indicators = []
        this.strikes = []
        this.impacts = []
        this.notice = null
        this.#litCards = null
        this.#litHeart = null
        this.#litProcess = null
        this.#litStatus = null
        this.flight = null
        this.drawer = null
        this.actor = actor
        this.version++
    }

    /** Bring a unit in as it is now. */
    public add(unit: Unit): SceneUnit {
        const shown: SceneUnit = {
            unit, position: unit.position, direction: unit.direction,
            hearts: Heart.copies(unit.hearts.all),
            statuses: [...unit.statuses.values()].map(({ type, level }) => ({ type, level })), processes: [...unit.processes],
            steps: unit.stepsLeft,
            chain: { cards: [...unit.chain.cards], cursor: unit.chain.cursor, borrowed: [...unit.chain.borrowed] },
            hand: [...unit.hand], decks: decksOf(unit), cursor: unit.decks.cursor,
            alive: unit.alive, opacity: 1, offset: Vector2.ZERO, flash: 0,
        }
        this.#units.set(unit, shown)
        this.version++
        return shown
    }

    /** Look at cards of a chain. */
    public lightCards(lit: LitCards): void {
        this.#litCards = lit
        this.version++
    }

    /** Look at hearts of a bar, together. */
    public lightHeart(lit: LitHeart): void {
        this.#litHeart = lit
        this.version++
    }

    /** Look at a process. */
    public lightProcess(lit: LitProcess): void {
        this.#litProcess = lit
        this.version++
    }

    /** Look at a status. */
    public lightStatus(lit: LitStatus): void {
        this.#litStatus = lit
        this.version++
    }

    /** Look at nothing anymore. */
    public unlight(): void {
        if(!this.#litCards && !this.#litHeart && !this.#litProcess && !this.#litStatus) return
        this.#litCards = null
        this.#litHeart = null
        this.#litProcess = null
        this.#litStatus = null
        this.version++
    }

    /** The card being drawn is there: the panels show it in the hand. */
    public land(): void {
        if(!this.flight) return
        this.flight = null
        this.version++
    }

    /** Show the draw of a unit, or stop showing one. */
    public watchDraw(unit: Unit|null): void {
        if(unit === this.drawer) return
        this.drawer = unit
        this.version++
    }

    /** Take a unit out, gone for good. */
    public remove(unit: Unit): void {
        if(this.#units.delete(unit)) this.version++
    }

    /** Change what the scene shows of a unit, when it knows it, and tell the panels when they show it. */
    public change(unit: Unit, change: (shown: SceneUnit) => void, panels = true): void {
        const shown = this.#units.get(unit)
        if(!shown) return
        change(shown)
        if(panels) this.version++
    }


    readonly #units = new Map<Unit, SceneUnit>()

    #order: Unit[] = []

    #litCards: LitCards|null = null
    #litHeart: LitHeart|null = null
    #litProcess: LitProcess|null = null
    #litStatus: LitStatus|null = null
}
