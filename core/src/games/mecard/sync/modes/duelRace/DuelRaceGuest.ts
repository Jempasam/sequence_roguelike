import type { SyncLink, TimerPort } from "../../../../../platform"
import type { Fault } from "../../../../../engine/net/Fault"
import type { Observable } from "../../../sim/base/Observable"
import type { Run } from "../../../sim/run/Run"

import type { Attendee } from "../../Gathering"
import type { SyncSource } from "../../SyncChannel"
import type { DeadlineReceiver } from "../../Deadline"
import type { ProgressReceiver } from "../../progress/ProgressReceiver"
import { DuelRacePlayer } from "../players/DuelRacePlayer"
import { RemoteHub } from "../players/RemoteHub"
import type { DuelView } from "../DuelView"
import type { Contestant } from "./Contestant"
import type { DuelLayers } from "./DuelLayers"
import type { LivesReceiver } from "./LifeBook"
import type { DuelRules } from "./DuelRules"

/**
 * A player of a race of duels that reaches the hub by a connection: a {@link DuelRacePlayer} on a
 * {@link RemoteHub}, kept together under the name it always had, with what each of them gives.
 */
export class DuelRaceGuest {


    /** The way to the hub, on the connection. */
    public readonly hub: RemoteHub

    /** What plays the race. */
    public readonly player: DuelRacePlayer

    /** Told once, with the player, when the race is won. */
    public readonly won: Observable<string>

    /** Told once when the race is over and nobody won. */
    public readonly finished: Observable<void>

    /** Told once when this player is out: it watches from then on. */
    public readonly eliminated: Observable<void>

    /** Told of what was dealt with: a message left out, a row skipped, an order that could not be applied. */
    public readonly faulted: Observable<Fault>

    /** Told once, when the player is turned away from the race. */
    public readonly ended: Observable<Fault>

    /** Takes the player in the lobby. */
    public readonly attendee: Attendee

    /** What lays the halts of the duels on the map. */
    public readonly layers: DuelLayers

    /** Sends the party to the duels and lets it go. */
    public readonly contestant: Contestant

    /** The duel followed. */
    public readonly view: DuelView

    /** Where the others stand. */
    public readonly progress: ProgressReceiver

    /** The lives of the players. */
    public readonly lives: LivesReceiver

    /** How long is left before the round of the duels starts, for display. */
    public readonly deadline: DeadlineReceiver

    constructor(
        rules: DuelRules,
        link: SyncLink,

        /** Where what the hub tells everyone is heard. */
        source: SyncSource,
        timer: TimerPort,
        run: Run,

        /** The id of this player, which the hub knows it by. */
        id: string,

        /** The number of the game, which what the hub tells is told apart by. */
        game = 0,
    ){
        this.hub = new RemoteHub(link, source, timer, game)
        this.player = new DuelRacePlayer(rules, this.hub, run, id)
        this.won = this.player.won
        this.finished = this.player.finished
        this.eliminated = this.player.eliminated
        this.faulted = this.player.faulted
        this.ended = this.player.ended
        this.attendee = this.hub.attendee
        this.layers = this.player.layers
        this.contestant = this.player.contestant
        this.view = this.hub.view
        this.progress = this.hub.others
        this.lives = this.hub.lives
        this.deadline = this.hub.deadline
    }


    /** Give the hub what was committed for the units of the player in its duel: it is ready. */
    public ready(): void {
        this.view.ready()
    }

    /** Leave the race by itself: the hub keeps the place for a while, and the player may come back to it. */
    public quit(): void {
        this.attendee.quit()
    }

    /** Stop, the party let go from the halt of the duels it waits at: the run goes on alone. */
    public dispose(): void {
        this.player.dispose()
    }
}
