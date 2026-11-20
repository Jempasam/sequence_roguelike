import type { SyncLink, TimerPort } from "../../../../../platform"
import { Fault } from "../../../../../engine/net/Fault"
import type { Observable, Observer } from "../../../sim/base/Observable"
import type { SavedUnit } from "../../../sim/save/battleSave"

import { Answerer } from "../../Asker"
import { DeadlineReceiver } from "../../Deadline"
import { Attendee } from "../../Gathering"
import { TEAM_TOPIC } from "../../SyncChannel"
import type { SyncSource } from "../../SyncChannel"
import { writeTeamMessage } from "../../TeamRequest"
import { forward, signal } from "../../faults"
import { writeProgressMessage } from "../../progress/ProgressMessage"
import type { Progress } from "../../progress/ProgressMessage"
import { ProgressReceiver } from "../../progress/ProgressReceiver"
import { DuelView } from "../DuelView"
import { LivesReceiver } from "../duelRace/LifeBook"
import { KickReceiver, ResumeReceiver } from "../duelRace/orders"
import { readRaceEndMessage } from "../duelRace/RaceEndMessage"
import { PROGRESS_TOPIC, RACE_END_TOPIC } from "../duelRace/topics"
import type { DuelFighting, DuelWatching, HubPort } from "./HubPort"

/** A clock that never runs, for a hub with no time limit to show. */
export const NO_TIME: TimerPort = {
    after: () => ({ cancel: () => undefined }),
    now: () => 0,
}

/**
 * The hub as a client far away reaches it: each thing the hub tells is heard on a topic of its own, and each
 * thing the player gives is sent on one. A {@link RemotePlayer} is the other end.
 *
 * @remarks
 * The duel is a battle of its own, which a {@link DuelView} builds from what the hub sends, and in which the
 * player commits its plans: the hub then plays them on the battle it has, and this one follows. Each part is
 * on a topic of its own, and knows nothing of the others.
 */
export class RemoteHub implements HubPort {


    /** Takes the player in the lobby. */
    public readonly attendee: Attendee

    /** The duel followed. */
    public readonly view: DuelView

    /** Where the others stand. */
    public readonly others: ProgressReceiver

    /** The lives of the players. */
    public readonly lives: LivesReceiver

    /** How long is left before the round of the duels starts, for display. */
    public readonly deadline: DeadlineReceiver

    public readonly kicked: Observable<void>
    public readonly resumed: Observable<void>
    public readonly raceWon = signal<string>()
    public readonly raceFinished = signal<void>()
    public readonly fighting = signal<DuelFighting>()
    public readonly watching = signal<DuelWatching>()
    public readonly duelOver: Observable<boolean|null>
    public readonly faulted = signal<Fault>()
    public readonly ended = signal<Fault>()

    constructor(
        private readonly link: SyncLink,

        /** Where what the hub tells everyone is heard. */
        source: SyncSource,
        timer: TimerPort,
    ){
        this.attendee = new Attendee(link)
        this.view = new DuelView(link, source)
        this.others = new ProgressReceiver(source)
        this.lives = new LivesReceiver(source)
        this.deadline = new DeadlineReceiver(timer, source)
        this.#kick = new KickReceiver(link)
        this.#resume = new ResumeReceiver(link)
        this.kicked = this.#kick.kicked
        this.resumed = this.#resume.resumed
        this.duelOver = this.view.duelOver
        this.#forwarding = [
            forward(this.attendee, this, true),
            forward(this.view, this, false),
            forward(this.others, this, false),
            forward(this.lives, this, false),
            forward(this.deadline, this, false),
        ]
        this.#observers = [
            this.view.fighting.add(({ allies, opponents }) => this.#fight(allies, opponents)),
            this.view.watching.add(({ sides }) => this.#watch(sides)),
        ]
        // The end of the race is sent to the player, and remembered by the hub for one that connects later.
        this.#listening = [
            RACE_END_TOPIC.link(link).listen(text => this.#told(text)),
            RACE_END_TOPIC.source(source).listen(text => this.#told(text)),
        ]
    }


    public join(): void {
        this.attendee.join()
    }

    public setReady(isReady: boolean): void {
        this.attendee.ready(isReady)
    }

    public answerTeam(units: () => readonly SavedUnit[]): { dispose(): void } {
        const answerer = new Answerer(TEAM_TOPIC, this.link, () => writeTeamMessage(units()))
        const forwarding = forward(answerer, this, false)
        const handle = {
            dispose: () => {
                forwarding.dispose()
                answerer.dispose()
                this.#answerers.delete(handle)
            },
        }
        this.#answerers.add(handle)
        return handle
    }

    public sendProgress(progress: Progress): void {
        PROGRESS_TOPIC.link(this.link).send(writeProgressMessage(progress))
    }

    public dispose(): void {
        for(const handle of [...this.#answerers]) handle.dispose()
        for(const observer of this.#observers) observer.remove()
        for(const handle of this.#forwarding) handle.dispose()
        for(const handle of this.#listening) handle.dispose()
        this.#kick.dispose()
        this.#resume.dispose()
        this.others.dispose()
        this.lives.dispose()
        this.deadline.dispose()
        this.view.dispose()
        this.attendee.dispose()
    }


    readonly #kick: KickReceiver
    readonly #resume: ResumeReceiver
    readonly #forwarding: readonly { dispose(): void }[]
    readonly #observers: readonly Observer[]
    readonly #listening: readonly { dispose(): void }[]
    readonly #answerers = new Set<{ dispose(): void }>()
    #isOver = false

    #fight(allies: readonly string[], opponents: readonly string[]): void {
        const { view } = this
        const battle = view.battle
        if(!battle) return
        this.fighting.notify({
            battle,
            units: view.units,
            submit: () => view.ready(),
            allies,
            opponents,
        })
    }

    #watch(sides: readonly (readonly string[])[]): void {
        const { view } = this
        const battle = view.battle
        if(!battle) return
        this.watching.notify({
            battle,
            units: [],
            submit: () => view.ready(),
            sides,
        })
    }

    /** The race is over: told once, whether the hub says it again when the connection comes back or not. */
    #told(text: string): void {
        const message = readRaceEndMessage(text)
        if(message instanceof Fault){
            this.faulted.notify(message)
            return
        }
        if(this.#isOver) return
        this.#isOver = true
        if(message.winner === null) this.raceFinished.notify()
        else this.raceWon.notify(message.winner)
    }
}
