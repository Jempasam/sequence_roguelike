import type { SyncPeer, SyncRoom, TimerPort } from "../../../../../platform"
import { ConnectionLostFault } from "../../../../../engine/net/NetFaults"
import { Fault } from "../../../../../engine/net/Fault"
import type { Observer } from "../../../sim/base/Observable"
import type { Rng } from "../../../sim/base/Rng"

import { Asker } from "../../Asker"
import { Deadline } from "../../Deadline"
import { Gathering, MANUAL } from "../../Gathering"
import { Admissions } from "../../participation/Participation"
import type { GameSession } from "../../session/GameSession"
import type { Admission, Arrival } from "../../participation/Participation"
import type { Member } from "../../Gathering"
import { LAST_STATE, Relay } from "../../Relay"
import { READY_TOPIC, TEAM_TOPIC } from "../../SyncChannel"
import type { SyncSender } from "../../SyncChannel"
import { TeamRequest } from "../../TeamRequest"
import { forward, NotEnoughPlayersFault, signal } from "../../faults"
import { ProgressBook } from "../../progress/ProgressBook"
import { writeProgressMessage } from "../../progress/ProgressMessage"
import type { Progress } from "../../progress/ProgressMessage"
import { DuelRound } from "../DuelRound"
import { ArrivalWatch } from "./ArrivalWatch"
import { LifeBook } from "./LifeBook"
import { KICK_TO_DUEL } from "./LatePenalty"
import type { LatePenalty } from "./LatePenalty"
import { writeRaceEndMessage } from "./RaceEndMessage"
import type { DuelRules } from "./DuelRules"
import { LivesFollow } from "../players/HubViews"
import { LocalLink } from "../players/LocalLink"
import { Players } from "../players/Players"
import { PROGRESS_TOPIC, RACE_END_TOPIC } from "./topics"

/**
 * The hub of a race of duels: each player plays its own run, and the hub reads where they stand, runs the
 * rounds of duels when they all reached the halt of the duels, and keeps their lives.
 *
 * @remarks
 * It is made of the bricks of the sync, each on a topic of its own: a {@link Gathering} for the lobby, a
 * {@link LifeBook}, a {@link Relay} of the progresses, an {@link ArrivalWatch} with its one {@link Deadline},
 * a {@link LatePenalty} and, for each round, a {@link DuelRound}. The hub decides and the players apply: a
 * player that is late is told to go to the duels, and keeps the life it lost whatever it did on receiving
 * the order.
 *
 * A player whose connection is lost is not waited for any more than the others: the time limit goes on, and
 * it is punished if it is late. One that left for good is eliminated; its units in a duel stay and are
 * played as bots.
 *
 * It reaches each player through a {@link DuelPlayer}: a client far away, or the hub itself playing its own
 * run with {@link DuelRaceHost.addLocal}. Every player is the same to it, and none is a special case.
 */
export class DuelRaceHost {


    /** Told of each round that starts, with its number from 1. */
    public readonly roundStarted = signal<number>()

    /** Told once, with the player, when the race is won. */
    public readonly won = signal<string>()

    /** Told once when the race is over and nobody won: the last players fell together. */
    public readonly finished = signal<void>()

    /** Told of what was dealt with: a player late or lost, a team left out, a round called off. */
    public readonly faulted = signal<Fault>()

    /** Told once, when the race cannot go on: it started with fewer than two players. */
    public readonly ended = signal<Fault>()

    /** What takes the players into the lobby. */
    public readonly gathering: Gathering

    constructor(
        private readonly rules: DuelRules,
        room: SyncRoom,
        private readonly sender: SyncSender,
        timer: TimerPort,

        /** The seeds of the battles of the duels are drawn from it. */
        private readonly rng: Rng,

        private readonly penalty: LatePenalty = KICK_TO_DUEL,

        /** What a lobby adds: the number of the game, and how a client already in the lobby is greeted. */
        private readonly lobby: {
            readonly game?: number
            readonly greet?: (peer: SyncPeer) => void

            /** The people of the game: the bricks then follow its room of the players, which hears of who quits. */
            readonly session?: GameSession
        } = {},
    ){
        // Someone that comes once the race started may play it, if the rules say so: the mode alone decides.
        this.gathering = new Gathering(room, MANUAL, {
            game: lobby.game, late: who => this.#admit(who), session: lobby.session,
        })
        // What a player does is heard from the players alone, and a player that quits is heard to leave.
        const players = lobby.session?.room ?? room
        this.#playersRoom = players
        this.#relay = new Relay(PROGRESS_TOPIC, players, sender, LAST_STATE)
        // What each player says of being ready is shown to the others, in the lobby.
        this.#readiness = new Relay(READY_TOPIC, players, sender, LAST_STATE)
        this.#deadline = new Deadline(timer, sender)
        this.#asker = new Asker(TEAM_TOPIC, players, timer)
        this.#request = new TeamRequest(this.#asker, rules.teamTimeoutMs)
        this.#players = new Players(this.gathering, this.#request)
        this.#book = new ProgressBook(this.#relay)
        this.#end = RACE_END_TOPIC.sender(sender)
        this.#endHandle = this.#end.onPeer(() => this.#lastEnd)
        this.#forwarding = [forward(this.gathering, this, false), forward(this.#book, this, false)]
        this.#observers = [
            this.gathering.started.add(members => this.#begin(members)),
            this.#book.progressed.add(({ id, progress }) => this.#heard(id, progress)),
            this.gathering.memberLeft.add(member => this.#left(member.id)),
            this.gathering.memberJoined.add(member => this.#joined(member)),
        ]
        this.#handles = [
            players.onLost(peer => this.faulted.notify(new ConnectionLostFault(peer.id))),
            // What a player said and was told while its connection was lost is said again.
            players.onBack(peer => this.#players.playerOf(peer.id)?.refresh()),
        ]
    }


    /** The lives of the players, none before the race starts. */
    public get lifeBook(): LifeBook|null { return this.#lifeBook }

    /** What reads the arrivals, none before the race starts. */
    public get arrival(): ArrivalWatch|null { return this.#arrival }

    /** The round of duels being fought, none between two. */
    public get round(): DuelRound|null { return this.#round }

    /** Is the race over? */
    public get isOver(): boolean { return this.#isOver }

    /**
     * Make the hub a player of its own race, the same as any other: it plays through the link given, which
     * the code of a player uses as it uses a connection. It is a member, in the lobby and in the rounds, it
     * loses lives, and it is sent to the duels when it is late.
     *
     * @returns The link of the player, or why the hub is turned away. It never throws.
     */
    public addLocal(id: string): LocalLink|Fault {
        const member = this.gathering.addLocal(id)
        if(member instanceof Fault) return member
        const link = new LocalLink(id, {
            gathering: this.gathering,
            ready: (who, isReady) => {
                this.gathering.setReady(who, isReady)
                this.#readiness.sendAs(who, isReady ? "1" : "0")
            },
            say: (who, progress) => this.#relay.sendAs(who, writeProgressMessage(progress)),
            lives: this.#lives,
            deadline: this.#deadline,
            others: this.#book,
        })
        this.#players.add(link)
        return link
    }

    /** Start the race now with the players that came. */
    public start(): void {
        this.gathering.start()
    }

    /** Stop. */
    public dispose(): void {
        for(const observer of this.#observers) observer.remove()
        for(const handle of this.#forwarding) handle.dispose()
        for(const handle of this.#handles) handle.dispose()
        for(const observer of this.#raceObservers) observer.remove()
        this.#endHandle.dispose()
        this.#players.dispose()
        this.#lives.dispose()
        this.#book.dispose()
        this.#round?.dispose()
        this.#arrival?.dispose()
        this.#lifeBook?.dispose()
        this.#relay.dispose()
        this.#readiness.dispose()
        this.#deadline.dispose()
        this.#asker.dispose()
        this.gathering.dispose()
    }


    readonly #playersRoom: SyncRoom
    readonly #relay: Relay
    readonly #readiness: Relay
    readonly #deadline: Deadline
    readonly #asker: Asker
    readonly #request: TeamRequest
    readonly #players: Players
    readonly #book: ProgressBook
    readonly #lives = new LivesFollow()
    readonly #end: SyncSender
    readonly #endHandle: { dispose(): void }
    readonly #forwarding: readonly { dispose(): void }[]
    readonly #observers: readonly Observer[]
    readonly #handles: readonly { dispose(): void }[]
    #raceObservers: Observer[] = []


    /** The players that left the race, which they never play again: they only watch. */
    readonly #abandoned = new Set<string>()
    #lifeBook: LifeBook|null = null
    #arrival: ArrivalWatch|null = null
    #round: DuelRound|null = null
    #rounds = 0
    #isOver = false
    #lastEnd: string|null = null

    #begin(members: readonly Member[]): void {
        if(members.length < 2){
            this.ended.notify(new NotEnoughPlayersFault(members.length))
            return
        }
        const lifeBook = new LifeBook(members.map(member => member.id), this.rules.lives, this.sender)
        const arrival = new ArrivalWatch(this.#deadline, this.rules.arrivalMs, () => lifeBook.alive())
        this.#lifeBook = lifeBook
        this.#lives.follow(lifeBook)
        this.#arrival = arrival
        this.#raceObservers = [
            lifeBook.lastStanding.add(id => this.#conclude(id)),
            arrival.late.add(id => this.#late(id)),
            arrival.allArrived.add(() => this.#startRound()),
        ]
    }

    /** Hear where a player stands, the hub's own as any other. What the host says of itself is not one's. */
    #heard(from: string, progress: Progress): void {
        if(!this.#arrival || !this.gathering.memberOf(from)) return
        this.#arrival.hear(from, progress)
    }

    #late(id: string): void {
        const lifeBook = this.#lifeBook
        if(!lifeBook) return
        this.penalty.penalize(id, lifeBook, each => this.#players.playerOf(each)?.kick())
        this.#arrival?.check()
        this.#check()
    }

    /** Make the round of duels of the players still in. */
    #startRound(): void {
        const { rules } = this
        const lifeBook = this.#lifeBook
        if(!lifeBook || this.#round || this.#isOver) return
        const players = lifeBook.alive()
        if(players.length < 2){
            this.#check()
            return
        }
        const round = new DuelRound(this.#playersRoom, this.sender, id => this.#players.playerOf(id),
            rules.matching, this.rng, ++this.#rounds * 1_000)
        this.#round = round
        const spectators = this.gathering.members.map(member => member.id).filter(id => !players.includes(id))
        const observers = [
            round.excluded.add(id => lifeBook.lose(id)),
            round.decided.add(({ fight, winner }) => rules.outcome.apply(fight, winner, lifeBook)),
            round.drawn.add(fight => rules.outcome.apply(fight, null, lifeBook)),
            round.allDecided.add(() => this.#endRound(round, observers)),
            round.faulted.add(fault => this.faulted.notify(fault)),
            // A round that cannot go on is called off with no life lost: only a fault of the mode remains.
            round.ended.add(fault => {
                this.faulted.notify(fault)
                this.#endRound(round, observers)
            }),
        ]
        this.roundStarted.notify(this.#rounds)
        void round.start(players, spectators)
    }

    #endRound(round: DuelRound, observers: readonly Observer[]): void {
        if(this.#round !== round) return
        for(const observer of observers) observer.remove()
        round.dispose()
        this.#round = null
        this.#lifeBook?.settle()
        this.#arrival?.reset()
        if(!this.#isOver) this.#resume()
        this.#check()
    }

    /** Let the players go on with their journeys. */
    #resume(): void {
        for(const id of this.#lifeBook?.alive() ?? []) this.#players.playerOf(id)?.resume()
    }

    /**
     * What someone that comes once the race started is given: a place of its own, as a new player, when the rules
     * let it come now, and only to watch otherwise, as one that left the race always does.
     */
    #admit(who: Arrival): Admission {
        const lifeBook = this.#lifeBook
        if(!lifeBook || this.#isOver || this.#abandoned.has(who.id)) return Admissions.spectate()
        const state = {
            rounds: this.#rounds,
            arrivalStarted: this.#arrival?.isStarted ?? false,
            lives: lifeBook.alive().map(id => lifeBook.livesOf(id)),
        }
        if(!this.rules.lateJoin.admits(state)) return Admissions.spectate()
        lifeBook.add(who.id, this.rules.lateJoin.lives(state))
        return Admissions.seat(who.id)
    }

    /**
     * A player left the race, by itself or for good: it is out at once, and never plays it again. A race left
     * with one player is won.
     */
    #left(id: string): void {
        this.#abandoned.add(id)
        this.#lifeBook?.eliminate(id)
        // Without a session the round does not hear of a player that quits and stays in the room: it is told here.
        if(!this.lobby.session) this.#round?.leave(id)
        this.#arrival?.check()
        this.#check()
    }

    /** A player came to a race that started: it is told how the race stands, as a client connecting is. */
    #joined(member: Member): void {
        if(!this.#lifeBook || !this.gathering.isStarted) return
        if(member.peer) this.lobby.greet?.(member.peer)
    }

    /** Is the race over: one player or none is left, with no round being fought? */
    #check(): void {
        const lifeBook = this.#lifeBook
        if(!lifeBook || this.#isOver || this.#round) return
        lifeBook.settle()
        if(!this.#isOver && lifeBook.alive().length === 0) this.#conclude(null)
    }

    #conclude(winner: string|null): void {
        if(this.#isOver) return
        this.#isOver = true
        this.#deadline.cancel()
        // A client that connects later, or whose connection comes back, is told by what the hub remembers.
        this.#lastEnd = writeRaceEndMessage({ winner })
        for(const { id } of this.gathering.members) this.#players.playerOf(id)?.end(winner)
        for(const { id } of this.gathering.members) this.#players.playerOf(id)?.resume()
        if(winner === null) this.finished.notify()
        else this.won.notify(winner)
    }
}
