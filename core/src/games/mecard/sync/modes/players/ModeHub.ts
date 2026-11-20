import type { TimerPort } from "../../../../../platform"
import { Fault } from "../../../../../engine/net/Fault"
import type { Observer } from "../../../sim/base/Observable"
import type { Battle } from "../../../sim/battle/Battle"
import type { SavedUnit } from "../../../sim/save/battleSave"

import { BattleGuest } from "../../battle/BattleGuest"
import { DeadlineReceiver } from "../../Deadline"
import { forward, signal } from "../../faults"
import type { Me } from "../../mode/GameMode"
import { StateSource } from "../../mode/stateBridge"
import { writeProgressMessage } from "../../progress/ProgressMessage"
import type { Progress } from "../../progress/ProgressMessage"
import { readProgressMessage } from "../../progress/ProgressMessage"
import { writeTeamMessage } from "../../TeamRequest"
import { duelResult } from "../DuelView"
import { LivesReceiver } from "../duelRace/LifeBook"
import { readRaceEndMessage } from "../duelRace/RaceEndMessage"
import type { DuelFighting, DuelWatching, HubPort, ProgressView } from "./HubPort"

/** The key a player's progress is published under, as a prefix. */
export const PROGRESS_KEY = "progress:"

/** The key the end of the race is published under. */
export const RACE_END_KEY = "race-end"

/** What the manager orders a player of a race: go to the duels. */
export const ORDER_KICK = "kick"

/** What the manager orders a player of a race: go on with the journey. */
export const ORDER_RESUME = "resume"

/** What the manager orders a player of a race: say again where you stand. */
export const ORDER_RESEND = "resend"

/** What the manager asks a player of a race: the team it brings. */
export const ORDER_TEAM = "team"

/** What the manager gives a player that fights a duel. */
export interface FightInfo {
    readonly fight: {
        readonly number: number
        readonly allies: readonly string[]
        readonly opponents: readonly string[]
        readonly units: readonly string[]
    }
}

/** What the manager gives a player that watches a duel. */
export interface WatchInfo {
    readonly watch: {
        readonly number: number
        readonly sides: readonly (readonly string[])[]
    }
}

/** Where the others stand, from the states the manager publishes: one for each player, the last told. */
class StateProgress implements ProgressView {


    public readonly progressed = signal<{ readonly id: string, readonly progress: Progress }>()
    public readonly faulted = signal<Fault>()


    public progressOf(id: string): Progress|null {
        return this.#progresses.get(id) ?? null
    }

    /** A state was told: the progress of a player, or not. */
    public receive(key: string, value: unknown): void {
        if(!key.startsWith(PROGRESS_KEY) || typeof value !== "string") return
        const id = key.slice(PROGRESS_KEY.length)
        const progress = readProgressMessage(value)
        if(progress instanceof Fault){
            this.faulted.notify(progress)
            return
        }
        this.#progresses.set(id, progress)
        this.progressed.notify({ id, progress })
    }


    readonly #progresses = new Map<string, Progress>()
}

/**
 * The manager of a race as a player of the race reaches it, through what the game tells it: orders, states
 * and the
 * duels it is shown. The same for a manager far away and for the one on this client.
 *
 * @remarks
 * It is the other end of the manager of a race: the lives, the time left and the others' progress come as
 * states
 * the bricks that read them are given as a source, and what the player says goes to the manager as a word.
 */
export class ModeHub implements HubPort {


    public readonly kicked = signal<void>()
    public readonly resumed = signal<void>()
    public readonly asked = signal<void>()
    public readonly raceWon = signal<string>()
    public readonly raceFinished = signal<void>()
    public readonly fighting = signal<DuelFighting>()
    public readonly watching = signal<DuelWatching>()
    public readonly duelOver = signal<boolean|null>()
    public readonly faulted = signal<Fault>()
    public readonly ended = signal<Fault>()

    /** The lives of the players. */
    public readonly lives: LivesReceiver

    /** The time left before the round of the duels. */
    public readonly deadline: DeadlineReceiver

    /** Where the others stand. */
    public readonly others = new StateProgress()

    constructor(
        private readonly me: Me,
        timer: TimerPort,
    ){
        this.lives = new LivesReceiver(this.#source)
        this.deadline = new DeadlineReceiver(timer, this.#source)
        this.#forwarding = [
            forward(this.lives, this, false),
            forward(this.deadline, this, false),
            forward(this.others, this, false),
        ]
    }


    public join(): void {}

    public setReady(): void {}

    public answerTeam(units: () => readonly SavedUnit[]): { dispose(): void } {
        this.#team = units
        return { dispose: () => { if(this.#team === units) this.#team = null } }
    }

    public sendProgress(progress: Progress): void {
        this.me.tellManager({ progress: writeProgressMessage(progress) })
    }

    /** The manager ordered or asked something. */
    public order(order: unknown): void {
        if(order === ORDER_KICK) this.kicked.notify()
        else if(order === ORDER_RESUME) this.resumed.notify()
        else if(order === ORDER_RESEND) this.asked.notify()
        else if(order === ORDER_TEAM && this.#team){
            this.me.tellManager({ team: writeTeamMessage(this.#team()) })
        }
    }

    /** A state was told. */
    public state(key: string, value: unknown): void {
        if(key === RACE_END_KEY){
            this.#end(value)
            return
        }
        this.#source.receive(value)
        this.others.receive(key, value)
    }

    /** A duel is shown to the player: fought with its units, or watched. Shown again, it changes nothing. */
    public duel(battle: Battle, info: unknown): void {
        const { fight, watch } = (info ?? {}) as Partial<FightInfo & WatchInfo>
        const number = fight?.number ?? watch?.number
        if(number === undefined || number === this.#number) return
        this.#leaveDuel()
        this.#number = number
        const units = fight?.units ?? []
        const guest = units.length === 0 ? null : new BattleGuest(
            battle,
            { send: text => this.me.intent(battle, JSON.parse(text)), listen: () => ({ dispose: () => {} }) },
            () => units,
        )
        const mine = new Set(units)
        this.#observers.push(battle.phaseChanged.add(phase => {
            if(phase === "over") this.duelOver.notify(duelResult(battle, mine))
        }))
        const submit = (): void => guest?.ready()
        if(fight){
            this.fighting.notify({ battle, units, submit, allies: fight.allies, opponents: fight.opponents })
        }
        else if(watch) this.watching.notify({ battle, units: [], submit, sides: watch.sides })
    }

    /** The duel is over for the player: the next one is told as a new one. */
    public endDuel(): void {
        this.#leaveDuel()
        this.#number = null
    }

    public dispose(): void {
        this.#leaveDuel()
        for(const handle of this.#forwarding) handle.dispose()
        this.lives.dispose()
        this.deadline.dispose()
    }


    readonly #source = new StateSource()
    readonly #forwarding: readonly { dispose(): void }[]
    #observers: Observer[] = []
    #team: (() => readonly SavedUnit[])|null = null
    #number: number|null = null
    #isOver = false

    #leaveDuel(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }

    #end(value: unknown): void {
        if(this.#isOver || typeof value !== "string") return
        const message = readRaceEndMessage(value)
        if(message instanceof Fault){
            this.faulted.notify(message)
            return
        }
        this.#isOver = true
        if(message.winner === null) this.raceFinished.notify()
        else this.raceWon.notify(message.winner)
    }
}
