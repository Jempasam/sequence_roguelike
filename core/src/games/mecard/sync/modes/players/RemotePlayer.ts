import type { SyncPeer } from "../../../../../platform"
import type { Fault } from "../../../../../engine/net/Fault"
import type { Battle } from "../../../sim/battle/Battle"
import type { SavedUnit } from "../../../sim/save/battleSave"

import type { BattleHost } from "../../battle/BattleHost"
import type { SyncTopic } from "../../SyncChannel"
import type { TeamRequest } from "../../TeamRequest"
import { writeDuelFightMessage, writeDuelWatchMessage } from "../DuelMessage"
import { DUEL_FIGHT_TOPIC, DUEL_WATCH_TOPIC, duelPlanTopic } from "../topics"
import { writeRaceEndMessage } from "../duelRace/RaceEndMessage"
import { KICK_TOPIC, RACE_END_TOPIC, RESUME_TOPIC } from "../duelRace/topics"
import type { DuelFought, DuelPlayer, DuelWatched } from "./DuelPlayer"

/**
 * A player that is a client far away, reached on its peer: what the hub tells it is a message on a topic, and
 * what it gives back is heard on one. Its {@link RemoteHub} is the other end.
 *
 * @remarks
 * It keeps what it told the player of its duel last, to tell it again when its connection comes back. What
 * is told while the connection is lost is dropped, so it is the only way the player learns of its duel.
 */
export class RemotePlayer implements DuelPlayer {


    constructor(
        private readonly peer: SyncPeer,

        /** What asks the player for its team, and checks it. */
        private readonly request: TeamRequest,
    ){}


    public get id(): string { return this.peer.id }

    public team(): Promise<readonly SavedUnit[]|Fault> {
        return this.request.ask(this.peer)
    }

    /** The battle is the hub's, and a client far away plays a copy of its own: it is told which duel. */
    public fight(
        duel: DuelFought,
        _battle: Battle,
        host: BattleHost,
        units: readonly string[],
    ): { dispose(): void } {
        const plans = duelPlanTopic(duel.number).link(this.peer).listen(text => host.receive(this.id, text))
        this.#tell(DUEL_FIGHT_TOPIC, writeDuelFightMessage({
            number: duel.number,
            allies: duel.allies,
            opponents: duel.opponents,
            units,
        }))
        return plans
    }

    /** The battle is the hub's, and a client far away watches a copy of its own: it is told which duel. */
    public watch(duel: DuelWatched): void {
        this.#tell(DUEL_WATCH_TOPIC, writeDuelWatchMessage(duel))
    }

    public kick(): void {
        KICK_TOPIC.link(this.peer).send("")
    }

    public resume(): void {
        RESUME_TOPIC.link(this.peer).send("")
    }

    public back(): void {
        this.#told?.topic.link(this.peer).send(this.#told.text)
    }

    public end(winner: string|null): void {
        RACE_END_TOPIC.link(this.peer).send(writeRaceEndMessage({ winner }))
    }


    #told: { readonly topic: SyncTopic, readonly text: string }|null = null

    #tell(topic: SyncTopic, text: string): void {
        this.#told = { topic, text }
        topic.link(this.peer).send(text)
    }
}
