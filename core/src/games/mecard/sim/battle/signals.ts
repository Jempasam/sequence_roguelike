import { Observable } from "../base/Observable"
import type { ErrorSink } from "../base/Observable"
import type { ModifierKey } from "../base/Attribute"
import type { Card } from "../card/Card"
import type { Heart } from "../heart/Heart"
import type { HeartKind } from "../heart/HeartKind"
import type { Process } from "../process/Process"
import type { Visual } from "../base/Visual"
import type { Status, StatusType } from "../status/Status"

import type { Indicator, Pose } from "./Action"
import type { ActivationEvent, CardInvalidEvent, ChainChangeEvent, Nature } from "./events"
import type { Phase } from "./Battle"
import type { Unit, UnitStats } from "./Unit"

/** A card a unit drew, or put back, and the deck it went with. */
export interface CardSignal {
    readonly unit: Unit
    readonly card: Card

    /** The deck it came from or went to, by its place among the decks of the unit. */
    readonly deck: number
}

/** A deck of a unit shuffled again. */
export interface DeckSignal {
    readonly unit: Unit
    readonly deck: number
}

/** A unit going from a pose to another: a step, a push, a turn on the spot. */
export interface MoveSignal {
    readonly unit: Unit
    readonly from: Pose
    readonly to: Pose

    /** How long it took, in seconds of the simulation. */
    readonly duration: number
}

/** A unit leaving a pose for another at once, over whatever lies between. */
export interface BlinkSignal {
    readonly unit: Unit
    readonly from: Pose
    readonly to: Pose
}

/** The life bar of a unit, as it is once a signal is told: copies, which the battle never changes after. */
export interface HeartsSignal {
    readonly unit: Unit
    readonly hearts: readonly Heart[]
}

/** A unit wounded: how many hearts it lost, and its bar after. */
export interface DamageSignal extends HeartsSignal {
    readonly amount: number
    readonly nature: Nature
}

/** A unit healed: how many hearts came back, and its bar after. */
export interface HealSignal extends HeartsSignal {
    readonly amount: number
}

/** A heart added to a bar: where it came, and the bar after. */
export interface HeartSignal extends HeartsSignal {
    readonly heart: Heart

    /** Its place in the bar, once it came. */
    readonly index: number
}

/** Hearts of a kind taken off a bar together: where they were, and the bar after. */
export interface HeartLossSignal extends HeartsSignal {
    readonly kind: HeartKind

    /** Their places in the bar before they left, the last first. */
    readonly indexes: readonly number[]
}

/** Hearts of a kind leaving others in their place: where, and the bar after. */
export interface HeartReplaceSignal extends HeartLossSignal {
    /** What took their places, in the order of the places. */
    readonly replacements: readonly Heart[]
}

/** Something about a unit alone: its death, its coming, its step. */
export interface UnitSignal {
    readonly unit: Unit
}

/** A unit starting one of its steps, and how many it has left after. */
export interface StepSignal {
    readonly unit: Unit
    readonly left: number
}

/** A status put on a unit, or taken off it. */
export interface StatusSignal {
    readonly unit: Unit
    readonly type: StatusType
}

/** A status of a unit that went to another level. */
export interface StatusLevelSignal extends StatusSignal {
    readonly level: number
}

/** A process started for a unit, or ended. */
export interface ProcessSignal {
    readonly unit: Unit
    readonly process: Process
}

/** Two units tied together for a while, or untied: a laser, a chain, a hook between them. */
export interface TetherSignal {
    /** The tie, the same object when tied and untied. */
    readonly tether: Tether
}

/** A tie between two units, and how it looks. */
export interface Tether {
    readonly from: Unit
    readonly to: Unit
    readonly visual: Visual
}

/** A modifier added to a stat of a unit, or taken back. */
export interface ModifierSignal {
    readonly unit: Unit
    readonly stat: keyof UnitStats
    readonly key: ModifierKey
}

/** A status about to act, to show it first. */
export interface StatusNotice {
    readonly unit: Unit
    readonly status: Status
}

/** A heart about to act, to show it first. */
export interface HeartNotice {
    readonly unit: Unit
    readonly heart: Heart
}

/**
 * Something drawn over the arena for a while: a slash, a flash, a word. What it shows at each moment of its
 * life is computed when it is posted, so it never reads a battle that went on since.
 */
export interface Effect {
    /** How long it lasts, in seconds. */
    readonly duration: number

    /**
     * What it shows at a moment of its life.
     *
     * @param share - How much of its life went by, from 0 to 1.
     */
    frame(share: number): readonly Indicator[]
}

/**
 * Everything a battle tells while it plays, for whoever shows it: one observable for each kind of thing that
 * happens, each carrying what it takes to show it without reading the battle, which is already further on.
 *
 * @remarks
 * The battle reads its clock, {@link Battle.clock}, when it tells each: a screen plays them back in that
 * time. They are never written down nor sent: a viewer plays its own battle, and hears its own.
 */
export class BattleSignals {


    /** The battle went into a phase: the draw, the preparation, the execution, its end. */
    public readonly phase: Observable<Phase>

    public readonly drawn: Observable<CardSignal>
    public readonly discarded: Observable<CardSignal>
    public readonly reshuffled: Observable<DeckSignal>

    public readonly moved: Observable<MoveSignal>
    public readonly blinked: Observable<BlinkSignal>

    /** A unit starts one of its steps. */
    public readonly stepStarted: Observable<StepSignal>

    /** A tree of the chain of a unit is about to play. */
    public readonly cardActivated: Observable<ActivationEvent>

    /** A card of the chain of a unit could not be built. */
    public readonly cardInvalid: Observable<CardInvalidEvent>

    /** The chain of a unit changed, or its reading went on. */
    public readonly chainChanged: Observable<ChainChangeEvent>

    public readonly damaged: Observable<DamageSignal>
    public readonly healed: Observable<HealSignal>
    public readonly heartAdded: Observable<HeartSignal>

    /** Hearts of a kind left their bar, outside of any wound. */
    public readonly heartRemoved: Observable<HeartLossSignal>

    /** Hearts of a kind left others in their place, outside of any wound. */
    public readonly heartReplaced: Observable<HeartReplaceSignal>

    /** A wound took hearts of a kind. */
    public readonly heartWounded: Observable<HeartLossSignal>

    public readonly died: Observable<UnitSignal>

    /** A unit entered the battle: a clone, a summoned body, a hazard. */
    public readonly spawned: Observable<UnitSignal>

    /** A unit left the battle for good: a clone vanishing, a hazard gone off. */
    public readonly vanished: Observable<UnitSignal>

    public readonly statusAdded: Observable<StatusLevelSignal>
    public readonly statusRemoved: Observable<StatusSignal>
    public readonly statusLeveled: Observable<StatusLevelSignal>
    public readonly processStarted: Observable<ProcessSignal>
    public readonly processEnded: Observable<ProcessSignal>
    public readonly tethered: Observable<TetherSignal>
    public readonly untethered: Observable<TetherSignal>
    public readonly modifierAdded: Observable<ModifierSignal>
    public readonly modifierRemoved: Observable<ModifierSignal>

    /** Something to draw over the arena for a while. */
    public readonly effect: Observable<Effect>

    /** A status is about to act. */
    public readonly notifyStatus: Observable<StatusNotice>

    /** A heart is about to act. */
    public readonly notifyHeart: Observable<HeartNotice>

    /** A unit is about to act, out of its steps: an item, a rule. */
    public readonly notifyUnit: Observable<UnitSignal>

    /**
     * @param before - What runs before each signal is told: the battle tells the move going on first, so
     *   what happens along it comes after it.
     */
    constructor(report: ErrorSink, before: () => void){
        const signal = <T>(): Observable<T> => new Signal<T>(report, before)
        this.phase = signal()
        this.drawn = signal()
        this.discarded = signal()
        this.reshuffled = signal()
        this.moved = signal()
        this.blinked = signal()
        this.stepStarted = signal()
        this.cardActivated = signal()
        this.cardInvalid = signal()
        this.chainChanged = signal()
        this.damaged = signal()
        this.healed = signal()
        this.heartAdded = signal()
        this.heartRemoved = signal()
        this.heartReplaced = signal()
        this.heartWounded = signal()
        this.died = signal()
        this.spawned = signal()
        this.vanished = signal()
        this.statusAdded = signal()
        this.statusRemoved = signal()
        this.statusLeveled = signal()
        this.processStarted = signal()
        this.processEnded = signal()
        this.tethered = signal()
        this.untethered = signal()
        this.modifierAdded = signal()
        this.modifierRemoved = signal()
        this.effect = signal()
        this.notifyStatus = signal()
        this.notifyHeart = signal()
        this.notifyUnit = signal()
    }
}

/** An observable running something before it tells its listeners. */
class Signal<T> extends Observable<T> {


    constructor(report: ErrorSink, private readonly before: () => void){
        super(report)
    }


    public override notify(event: T): void {
        this.before()
        super.notify(event)
    }
}
