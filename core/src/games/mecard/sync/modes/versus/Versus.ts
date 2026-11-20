import type { SyncRoom, TimerPort } from "../../../../../platform"
import { Fault } from "../../../../../engine/net/Fault"
import type { Observer } from "../../../sim/base/Observable"
import type { Rng } from "../../../sim/base/Rng"

import { Asker } from "../../Asker"
import { Gathering, MANUAL } from "../../Gathering"
import type { Member, StartRule } from "../../Gathering"
import { TeamRequest } from "../../TeamRequest"
import { TEAM_TOPIC } from "../../SyncChannel"
import type { SyncSender } from "../../SyncChannel"
import { forward, signal } from "../../faults"
import { DuelRound } from "../DuelRound"
import type { Matching } from "../Matching"
import { IdleDeadline, IdleProgress, LivesFollow } from "../players/HubViews"
import { LocalLink } from "../players/LocalLink"
import { Players } from "../players/Players"

/** What a {@link Versus} is made with. */
export interface VersusOptions {
    /** When it starts by itself: the host starts it when it wishes by default. */
    readonly rule?: StartRule

    /** How long a player has to give its team, in milliseconds. */
    readonly teamTimeoutMs?: number
}

/**
 * Players against players with no journey: the hub makes the players that came into camps, asks each its
 * team, and has the duels fought, once. It is a single round of a race of duels, with nothing around it.
 *
 * @remarks
 * Every player is reached through a {@link DuelPlayer}: a client far away, or {@link Versus.addLocal}, the
 * hub itself playing, which none of the code of the hub tells from the others. It is made of a
 * {@link Gathering} that takes the players in, and a {@link DuelRound}; how each duel ended is told by the
 * round, which is public: the mode only brings the players to it and says when everything is decided.
 */
export class Versus {


    /** What makes and plays the duels. */
    public readonly round: DuelRound

    /** What takes the players in. */
    public readonly gathering: Gathering

    /** Told once, when every duel is decided. */
    public readonly finished = signal<void>()

    /** Told of what was dealt with: a client turned away, a team left out, a duel called off. */
    public readonly faulted = signal<Fault>()

    /** Told once, when it cannot go on: too few players, or no way to make a duel. */
    public readonly ended = signal<Fault>()

    constructor(
        room: SyncRoom,
        sender: SyncSender,
        timer: TimerPort,
        matching: Matching,

        /** The seeds of its battles are drawn from it. */
        rng: Rng,

        options: VersusOptions = {},
    ){
        this.gathering = new Gathering(room, options.rule ?? MANUAL)
        this.#asker = new Asker(TEAM_TOPIC, room, timer)
        const request = new TeamRequest(this.#asker, options.teamTimeoutMs ?? 10_000)
        this.#players = new Players(this.gathering, request)
        this.round = new DuelRound(room, sender, id => this.#players.playerOf(id), matching, rng)
        this.#forwarding = [forward(this.gathering, this, false), forward(this.round, this, true)]
        this.#observers = [
            this.gathering.started.add(members => this.#begin(members)),
            this.round.allDecided.add(() => this.finished.notify()),
        ]
    }


    /**
     * Make the hub a player of its own duels, the same as any other: it plays through the link given, which
     * the code of a player uses as it uses a connection.
     *
     * @returns The link of the player, or why the hub is turned away. It never throws.
     */
    public addLocal(id: string): LocalLink|Fault {
        const member = this.gathering.addLocal(id)
        if(member instanceof Fault) return member
        // Duels with no journey: there are no lives, no time limit, and nobody stands anywhere.
        const link = new LocalLink(id, {
            gathering: this.gathering,
            ready: (who, isReady) => this.gathering.setReady(who, isReady),
            say: () => undefined,
            lives: new LivesFollow(),
            deadline: new IdleDeadline(),
            others: new IdleProgress(),
        })
        this.#players.add(link)
        return link
    }

    /** Start the duels now with the players that came, whatever the rule says. */
    public start(): void {
        this.gathering.start()
    }

    /** Stop. */
    public dispose(): void {
        for(const observer of this.#observers) observer.remove()
        for(const handle of this.#forwarding) handle.dispose()
        this.#players.dispose()
        this.#asker.dispose()
        this.gathering.dispose()
        this.round.dispose()
    }


    readonly #asker: Asker
    readonly #players: Players
    readonly #forwarding: readonly { dispose(): void }[]
    readonly #observers: readonly Observer[]

    #begin(members: readonly Member[]): void {
        void this.round.start(members.map(member => member.id))
    }
}
