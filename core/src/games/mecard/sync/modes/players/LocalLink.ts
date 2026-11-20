import { Fault } from "../../../../../engine/net/Fault"
import type { Observer } from "../../../sim/base/Observable"
import type { Battle } from "../../../sim/battle/Battle"
import type { SavedUnit } from "../../../sim/save/battleSave"

import type { BattleHost } from "../../battle/BattleHost"
import type { Gathering } from "../../Gathering"
import { teamFault } from "../../TeamRequest"
import { InvalidTeamFault, signal } from "../../faults"
import { detailOf } from "../../read"
import type { Progress } from "../../progress/ProgressMessage"
import { duelResult } from "../DuelView"
import type { DuelFought, DuelPlayer, DuelWatched } from "./DuelPlayer"
import type { DeadlineView, DuelFighting, DuelWatching, HubPort, LivesView, ProgressView } from "./HubPort"

/** What a player that plays on the hub itself reaches of it: the very objects of the hub that rule. */
export interface LocalParts {
    /** What takes the players in the lobby. */
    readonly gathering: Gathering

    /** What the hub does with what a player says of being ready: it keeps it, and tells the others. */
    ready(id: string, isReady: boolean): void

    /** What the hub does with what a player says of its journey: it keeps it, and tells the others. */
    say(id: string, progress: Progress): void

    readonly lives: LivesView
    readonly deadline: DeadlineView
    readonly others: ProgressView
}

/**
 * A player that plays on the hub itself, both ends of its link in one object: the hub sees a
 * {@link DuelPlayer}, and the player sees a {@link HubPort}, with nothing between them but calls.
 *
 * @remarks
 * Nothing is copied: the player fights on the very {@link Battle} the hub plays the duel on, commits in it,
 * and says it is ready to the host of the duel. Its lives, its time limit and the others are the hub's own.
 * What it says of its journey is relayed to the clients as what a client says. It never loses its connection,
 * and is never gone.
 */
export class LocalLink implements DuelPlayer, HubPort {


    public readonly kicked = signal<void>()
    public readonly resumed = signal<void>()
    public readonly raceWon = signal<string>()
    public readonly raceFinished = signal<void>()
    public readonly fighting = signal<DuelFighting>()
    public readonly watching = signal<DuelWatching>()
    public readonly duelOver = signal<boolean|null>()
    public readonly faulted = signal<Fault>()
    public readonly ended = signal<Fault>()

    constructor(
        public readonly id: string,
        private readonly parts: LocalParts,
    ){}


    public get lives(): LivesView { return this.parts.lives }

    public get deadline(): DeadlineView { return this.parts.deadline }

    public get others(): ProgressView { return this.parts.others }

    // --- What the player gives the hub ---

    public join(): void {
        const member = this.parts.gathering.addLocal(this.id)
        if(member instanceof Fault) this.faulted.notify(member)
    }

    public setReady(isReady: boolean): void {
        this.parts.ready(this.id, isReady)
    }

    public answerTeam(units: () => readonly SavedUnit[]): { dispose(): void } {
        const answering = { units }
        this.#answering = answering
        return {
            dispose: () => {
                if(this.#answering === answering) this.#answering = null
            },
        }
    }

    public sendProgress(progress: Progress): void {
        this.parts.say(this.id, progress)
    }

    // --- What the hub asks of the player ---

    public team(): Promise<readonly SavedUnit[]|Fault> {
        let units: readonly SavedUnit[]
        try {
            units = this.#answering?.units() ?? []
        } catch(error){
            return Promise.resolve(new InvalidTeamFault(this.id, detailOf(error)))
        }
        return Promise.resolve(teamFault(this.id, units) ?? units)
    }

    public fight(
        duel: DuelFought,
        battle: Battle,
        host: BattleHost,
        units: readonly string[],
    ): { dispose(): void } {
        const mine = new Set(units)
        const own = { isLive: true }
        const handle = this.#follow(battle, mine, own)
        this.fighting.notify({
            battle,
            units,
            submit: () => {
                if(own.isLive) host.committed(this.id)
            },
            allies: duel.allies,
            opponents: duel.opponents,
        })
        return handle
    }

    public watch(duel: DuelWatched, battle: Battle): void {
        this.#follow(battle, new Set(), { isLive: true })
        this.watching.notify({
            battle,
            units: [],
            submit: () => undefined,
            sides: duel.sides,
        })
    }

    public kick(): void {
        this.kicked.notify()
    }

    public resume(): void {
        this.resumed.notify()
    }

    /** The connection of a local player never comes back, for it is never lost. */
    public back(): void {
        // Nothing to tell again: it is never told a thing it could miss.
    }

    public end(winner: string|null): void {
        if(winner === null) this.raceFinished.notify()
        else this.raceWon.notify(winner)
    }

    public dispose(): void {
        this.#answering = null
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }


    #answering: { readonly units: () => readonly SavedUnit[] }|null = null
    #observers: Observer[] = []

    /** Tell when the duel is over, and how it ended for the units played, until the handle is disposed. */
    #follow(battle: Battle, mine: ReadonlySet<string>, own: { isLive: boolean }): { dispose(): void } {
        const observer = battle.phaseChanged.add(phase => {
            if(phase === "over" && own.isLive) this.duelOver.notify(duelResult(battle, mine))
        })
        this.#observers.push(observer)
        return {
            dispose: () => {
                own.isLive = false
                observer.remove()
            },
        }
    }
}
