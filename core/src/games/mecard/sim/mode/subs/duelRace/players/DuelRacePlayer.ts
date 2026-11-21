import type { Fault } from "../../../../../../../engine/net/Fault"
import type { Observable, Observer } from "../../../../base/Observable"
import { partyUnits } from "../../../../duel/duelBattle"
import type { Run } from "../../../../run/Run"

import { forward, signal } from "../../../../../sync/faults"
import { ProgressBroadcaster } from "../../../../../sync/progress/ProgressBroadcaster"
import { Contestant } from "../Contestant"
import { DuelLayers } from "../DuelLayers"
import type { DuelRules } from "../DuelRules"
import type { DuelFighting, DuelWatching, DeadlineView, HubPort, LivesView, ProgressView } from "./HubPort"

/**
 * A player of a race of duels: it plays its own run, and the hub sends it where to go and what the others do.
 * It is the same code whether the hub is far away or is the one it plays on: it reaches the hub through a
 * {@link HubPort}, and knows nothing else of it.
 *
 * @remarks
 * Each part knows nothing of the others. The map is laid with the halts of the duels, what the player does is
 * told as a {@link Progress} to the hub, and the orders of the hub move the run through a {@link Contestant}.
 * The duel itself never enters the run: the hub gives it as a battle of its own, so the party and its journey
 * are left as they are.
 *
 * When the mode ends on an error, the run stays playable alone: the halt of the duels it waits at is let go.
 */
export class DuelRacePlayer {


    /** Told once, with the player, when the race is won. */
    public readonly won: Observable<string>

    /** Told once when the race is over and nobody won. */
    public readonly finished: Observable<void>

    /** Told once when this player is out: it watches from then on. */
    public readonly eliminated = signal<void>()

    /** Told of what was dealt with: a message left out, a row skipped, an order that could not be applied. */
    public readonly faulted = signal<Fault>()

    /** Told once, when the player is turned away from the race. */
    public readonly ended = signal<Fault>()

    /** What lays the halts of the duels on the map. */
    public readonly layers: DuelLayers

    /** Sends the party to the duels and lets it go. */
    public readonly contestant: Contestant

    /** Told when the player fights a duel: what to show, and where to commit. */
    public readonly fighting: Observable<DuelFighting>

    /** Told when the player watches a duel. */
    public readonly watching: Observable<DuelWatching>

    /** Told when the duel followed is over: whether the player won, none for a draw or for a spectator. */
    public readonly duelOver: Observable<boolean|null>

    /** The lives of the players. */
    public readonly lives: LivesView

    /** How long is left before the round of the duels starts, for display. */
    public readonly deadline: DeadlineView

    /** Where the others stand. */
    public readonly others: ProgressView

    /** How many floors the map of the race has in all, none when it goes on without end. */
    public readonly floors: number|null

    /** How many lives each player started with. */
    public readonly maxLives: number

    constructor(
        rules: DuelRules,

        /** The way to the hub, which the player owns: it is let go with the player. */
        public readonly hub: HubPort,
        run: Run,

        /** The id of this player, which the hub knows it by. */
        private readonly id: string,
    ){
        this.won = hub.raceWon
        this.finished = hub.raceFinished
        this.fighting = hub.fighting
        this.watching = hub.watching
        this.duelOver = hub.duelOver
        this.lives = hub.lives
        this.deadline = hub.deadline
        this.others = hub.others
        this.floors = rules.floors ?? null
        this.maxLives = rules.lives
        this.layers = new DuelLayers(run, rules.duelEvery, rules.closing ?? false)
        this.#broadcaster = new ProgressBroadcaster(run.travel, {
            send: progress => hub.sendProgress(progress),
        })
        this.contestant = new Contestant(run, () => this.#broadcaster.forceAtDuel())
        this.#answering = hub.answerTeam(() => partyUnits(run))
        this.#forwarding = [
            forward(hub, this, true),
            forward(this.layers, this, false),
            forward(this.contestant, this, false),
        ]
        this.#observers = [
            hub.kicked.add(() => this.contestant.kick()),
            hub.resumed.add(() => this.contestant.resume()),
            // The connection came back: what was said while it was lost is said again.
            hub.asked.add(() => this.#broadcaster.resend()),
            hub.lives.eliminated.add(id => { if(id === this.id) this.eliminated.notify() }),
            hub.ended.add(() => this.dispose()),
        ]
        hub.join()
    }


    /** Stop, the party let go from the halt of the duels it waits at: the run goes on alone. */
    public dispose(): void {
        this.contestant.resume()
        for(const observer of this.#observers) observer.remove()
        for(const handle of this.#forwarding) handle.dispose()
        this.#broadcaster.dispose()
        this.#answering.dispose()
        this.layers.dispose()
        this.hub.dispose()
    }


    readonly #broadcaster: ProgressBroadcaster
    readonly #answering: { dispose(): void }
    readonly #forwarding: readonly { dispose(): void }[]
    readonly #observers: readonly Observer[]
}
