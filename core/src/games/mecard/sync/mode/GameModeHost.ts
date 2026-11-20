import { Fault } from "../../../../engine/net/Fault"
import type { TimerPort } from "../../../../platform"
import type { Observable, Observer } from "../../sim/base/Observable"
import type { Rng } from "../../sim/base/Rng"
import { signal, UnloadableFault, UnreadableFault } from "../faults"
import type { ModeRun } from "../lobby/LobbyMode"
import { checkValues, initialValues } from "../lobby/Setting"
import type { Setting, SettingValues } from "../lobby/Setting"
import type { HostStage } from "../lobby/Stage"
import { Admissions } from "../participation/Participation"
import type { Admission } from "../participation/Participation"
import { detailOf } from "../read"
import type { Participant } from "../session/Participant"
import type { SyncSource } from "../SyncChannel"

import { Audience } from "./Audience"
import type { GameMode, GameModeContext, GameMember, RunHandle, BattleHandle, InstanceHandle } from "./GameMode"
import type { GameModeGuest } from "./GameModeGuest"
import { ANY_BATTLE, ANY_RUN } from "./kinds"
import type { AnyKind, Engine } from "./kinds"
import {
    FOLLOW_TOPIC, CLOSE_TOPIC, INTENT_TOPIC, instanceTopic, ORDER_TOPIC, readIntentMessage, readTellMessage,
    ROUTE_TOPIC, STATE_TOPIC, TELL_TOPIC, UNFOLLOW_TOPIC, upTopic, write,
} from "./messages"
import type { OpenMessage } from "./messages"
import type { Seat } from "./Seat"

/** The hue the chat shows what the game says in. */
export const ANNOUNCE_HUE = 200

/** The main sequence of a mode failed, which it should never do: the game is over. */
export class ModeFailedFault extends Fault {


    constructor(public readonly detail: string){
        super()
    }


    public readonly who = null

    public describe(): string {
        return `Le mode de jeu a échoué : ${this.detail}`
    }
}

/** What a player on the manager's client says to it, in direct calls. */
interface LocalManager {
    heardTell(from: string, json: string): void
    heardIntent(from: string, json: string): void
}

/** What the manager's client gives the player that shares it: the way back, in direct calls. */
export class LocalSeat implements Seat {


    constructor(
        /** The id the player goes by. */
        public readonly id: string,
    ){}


    /** Give the manager what the player says. */
    public bind(manager: LocalManager): void {
        this.#manager = manager
    }

    public tell(json: string): void {
        this.#manager?.heardTell(this.id, json)
    }

    public intent(json: string): void {
        this.#manager?.heardIntent(this.id, json)
    }

    /** Nothing goes up: the engine of an instance the player owns is the manager's own. */
    public up(): void {}


    #manager: LocalManager|null = null
}

/** What a follower holds of an instance. */
interface Follow {
    readonly participant: Participant
    info: unknown
    controlled: boolean
}

/** An instance as the manager holds it. */
interface HostInstance {
    readonly id: number
    readonly kind: AnyKind
    readonly spec: unknown

    /** Who owns it, none when the manager does. */
    readonly owner: Participant|null
    readonly audience: Audience
    readonly follows: Map<string, Follow>
    readonly invalidated: Observable<void>

    /** The engine of the manager: its own, or a replica of its owner's once someone follows. */
    engine: Engine|null

    /** What tells the audience what happens to the engine. */
    broadcaster: { dispose(): void }|null

    /** What takes in what the owner tells, for a replica. */
    upstream: { dispose(): void }|null

    isWatched: boolean
    isValid: boolean
}

/** What the manager needs of its surroundings. */
export interface HostOptions {
    /** Where time goes. */
    readonly timer: TimerPort

    /** Where the chance of the game comes from. */
    readonly rng: Rng

    /** What the game is called, which the chat says its announcements as. */
    readonly title: string

    /** Tell the player something went wrong, which does not stop the game. */
    report(text: string): void

    /** What each participant may set for itself: what it says is checked against them. None by default. */
    readonly participantSettings?: readonly Setting[]
}

/** A member as the mode sees it: what its participant is now. */
class MemberView implements GameMember {


    constructor(
        private readonly participant: Participant,
        private readonly settings: readonly Setting[],
    ){}


    public get options(): SettingValues {
        const { options } = this.participant
        return checkValues(this.settings, options) ? initialValues(this.settings) : options
    }
    public get id(): string { return this.participant.id }
    public get name(): string { return this.participant.name }
    public get presence(): GameMember["presence"] { return this.participant.presence }
    public get connected(): boolean { return this.participant.connection === "connected" }
}

/**
 * The manager of a game, on the stage of the main client: it gives the mode everything it asks of the
 * network, and
 * tells the clients what the mode decides, with the bricks that already did each part.
 *
 * @remarks
 * A client that takes part is greeted, once it is told it is in, with the states published, and the
 * instances it owns
 * or follows. An instance is told to its audience by a broadcaster; one a client owns is told up to the
 * manager
 * once someone follows it, and the manager tells it on, so the owner has a single flow to give.
 */
export class GameModeHost implements ModeRun, GameModeContext {


    public readonly ended = signal<Fault|null>()
    public readonly faulted = signal<Fault>()
    public readonly joined = signal<GameMember>()

    constructor(
        private readonly stage: HostStage,
        private readonly mode: GameMode,
        private readonly options: HostOptions,
    ){
        this.#expected = 1 + stage.reachable.length
        const { session } = stage
        this.#session = session
        this.#policy = session.bind({
            admit: who => this.#admit(who.id),
            onLost: () => {},
            onBack: () => {},
            onQuit: () => {},
            onGone: () => {},
        })
        this.#observers = [
            session.faulted.add(fault => this.faulted.notify(fault)),
            session.joined.add(who => this.#joined(who)),
            session.lost.add(who => this.mode.onLeave?.(this, this.#view(who), false)),
            session.back.add(who => this.#back(who)),
            session.left.add(({ who, how }) => this.#left(who, how === "gone")),
        ]
    }


    /**
     * Have the manager's own client take part as a player, with its code: it holds the engines of the
     * manager, and
     * says what it wants through direct calls. Called once, before the game starts.
     */
    public attachLocal(guest: GameModeGuest, seat: LocalSeat, options?: SettingValues): void {
        this.#local = guest
        seat.bind(this)
        this.#session.addLocal(seat.id, options)
    }

    /** Start the main sequence of the mode. */
    public start(): void {
        Promise.resolve()
            .then(() => {
                const result = this.mode.run(this)
                // Those that took part before the mode listened are told to it once it does, as it starts.
                this.#isStarted = true
                for(const participant of this.#early.splice(0)) this.joined.notify(this.#view(participant))
                return result
            })
            .catch((error: unknown) => {
                if(!this.#isDisposed) this.ended.notify(new ModeFailedFault(detailOf(error)))
            })
    }

    // ============ The context ============

    public members(): readonly GameMember[] {
        return this.#session.participants.filter(each => each.presence !== "left").map(each => this.#view(each))
    }

    public openRun(owner: GameMember, spec: unknown): RunHandle {
        return this.#open(ANY_RUN, owner, spec) as RunHandle
    }

    public openManagedRun(spec: unknown): RunHandle {
        return this.#open(ANY_RUN, null, spec) as RunHandle
    }

    public openBattle(owner: GameMember, spec: unknown): BattleHandle {
        return this.#open(ANY_BATTLE, owner, spec) as BattleHandle
    }

    public openManagedBattle(spec: unknown): BattleHandle {
        return this.#open(ANY_BATTLE, null, spec) as BattleHandle
    }

    public order(member: GameMember, order: unknown): void {
        const participant = this.#participantOf(member)
        if(!participant || !this.#ready.has(participant.id)) return
        if(participant.peer === null) this.#local?.receiveOrder(order)
        else participant.tell(ORDER_TOPIC, write({ order }))
    }

    public publish(key: string, value: unknown): void {
        this.publishLazy(key, () => value)
    }

    public publishLazy(key: string, value: () => unknown): void {
        this.#states.set(key, value)
        for(const participant of this.#session.participants) this.#sendState(participant, key, value())
    }

    public unpublish(key: string): void {
        if(!this.#states.delete(key)) return
        for(const participant of this.#session.participants) this.#sendState(participant, key, null)
    }

    public expected(): number {
        return this.#expected
    }

    public after(ms: number, task: () => void): { cancel(): void } {
        const timer = this.options.timer.after(ms, () => {
            this.#cancels.delete(cancel)
            if(!this.#isDisposed) task()
        })
        const cancel = (): void => timer.cancel()
        this.#cancels.add(cancel)
        return { cancel: () => { this.#cancels.delete(cancel); timer.cancel() } }
    }

    public until<T>(source: Observable<T>, condition: (value: T) => boolean): Promise<T> {
        return new Promise(resolve => {
            const observer = source.add(value => {
                if(!condition(value)) return
                observer.remove()
                this.#cancels.delete(cancel)
                resolve(value)
            })
            const cancel = (): void => observer.remove()
            this.#cancels.add(cancel)
        })
    }

    public rng(): Rng {
        return this.options.rng
    }

    public announce(text: string): void {
        this.stage.chat?.say(text, { name: this.options.title, hue: ANNOUNCE_HUE })
    }

    public end(): void {
        this.ended.notify(null)
    }

    public report(text: string): void {
        this.options.report(text)
    }

    // ============ What the players say ============

    /** A player says something. */
    public heardTell(from: string, json: string): void {
        const participant = this.#session.participant(from)
        const message = readTellMessage(json)
        if(message instanceof UnreadableFault) this.faulted.notify(message)
        else if(participant) this.mode.onTell?.(this, this.#view(participant), message.message)
    }

    /** A player says what it wants done on an instance. */
    public heardIntent(from: string, json: string): void {
        const participant = this.#session.participant(from)
        const message = readIntentMessage(json)
        if(message instanceof UnreadableFault){
            this.faulted.notify(message)
            return
        }
        const instance = this.#instances.get(message.id)
        const follow = instance?.follows.get(from)
        if(!participant || !instance || !instance.isValid || !follow?.controlled) return
        const { owner } = instance
        if(owner === null){
            if(instance.engine === null) return
            let done = false
            try {
                const from = this.#view(participant)
                done = instance.kind.resolve(this.mode, from, follow.info, instance.engine, message.intent)
            } catch(error){
                this.faulted.notify(new UnloadableFault("intent", detailOf(error), from))
            }
            // Refused: the player gets the instance as it stands, so what it showed of its wish is undone.
            if(!done && participant.peer) instance.audience.greet(participant.peer)
            return
        }
        const routed = {
            id: instance.id, from, name: participant.name, info: follow.info, intent: message.intent,
        }
        if(owner.peer === null) this.#local?.receiveRoute(routed)
        else owner.tell(ROUTE_TOPIC, write(routed))
    }

    // ============ Ending ============

    public dispose(): void {
        this.#isDisposed = true
        for(const cancel of [...this.#cancels]) cancel()
        this.#cancels.clear()
        for(const instance of [...this.#instances.values()]) this.#drop(instance)
        for(const handles of this.#listening.values()) for(const handle of handles) handle.dispose()
        this.#listening.clear()
        for(const observer of this.#observers) observer.remove()
        this.#policy.dispose()
        this.#local = null
    }


    readonly #session: HostStage["session"]
    readonly #policy: { dispose(): void }
    readonly #observers: readonly Observer[]
    readonly #expected: number
    readonly #instances = new Map<number, HostInstance>()
    readonly #views = new Map<string, MemberView>()
    readonly #states = new Map<string, () => unknown>()
    readonly #cancels = new Set<() => void>()

    /** The ids of the participants whose client listens: what they are given is told to them. */
    readonly #ready = new Set<string>()
    readonly #listening = new Map<string, { dispose(): void }[]>()
    #local: GameModeGuest|null = null
    #isStarted = false
    readonly #early: Participant[] = []
    #nextId = 1
    #isDisposed = false

    #view(participant: Participant): GameMember {
        let view = this.#views.get(participant.id)
        if(!view){
            view = new MemberView(participant, this.options.participantSettings ?? [])
            this.#views.set(participant.id, view)
        }
        return view
    }

    #participantOf(member: GameMember): Participant|null {
        return this.#session.participant(member.id)
    }

    #admit(id: string): Admission {
        const participant = this.#session.participant(id)
        if(!participant || !this.mode.onJoin) return Admissions.seat("player")
        return this.mode.onJoin(this, this.#view(participant))
    }

    // ----- Arrivals and departures -----

    #joined(participant: Participant): void {
        this.#listen(participant)
        if(!this.#ready.has(participant.id)){
            this.#ready.add(participant.id)
            this.#greet(participant)
        }
        if(this.#isStarted) this.joined.notify(this.#view(participant))
        else if(!this.#early.includes(participant)) this.#early.push(participant)
    }

    #back(participant: Participant): void {
        this.#greet(participant)
        this.mode.onBack?.(this, this.#view(participant))
    }

    #left(participant: Participant, gone: boolean): void {
        this.#ready.delete(participant.id)
        if(gone){
            for(const handle of this.#listening.get(participant.id) ?? []) handle.dispose()
            this.#listening.delete(participant.id)
        }
        for(const instance of [...this.#instances.values()]){
            instance.follows.delete(participant.id)
            if(participant.peer) instance.audience.remove(participant.id)
            if(instance.owner === participant) this.#invalidate(instance)
            else this.#unfollowIfAlone(instance)
        }
        this.mode.onLeave?.(this, this.#view(participant), gone)
    }

    /** Listen to what a client says, once: it is the same client through a lost connection. */
    #listen(participant: Participant): void {
        if(!participant.peer || this.#listening.has(participant.id)) return
        this.#listening.set(participant.id, [
            participant.listen(TELL_TOPIC, text => this.heardTell(participant.id, text)),
            participant.listen(INTENT_TOPIC, text => this.heardIntent(participant.id, text)),
        ])
    }

    /** Give a client that is there what it should hold: the states, then the instances it owns or follows. */
    #greet(participant: Participant): void {
        for(const [key, value] of this.#states) this.#sendState(participant, key, value())
        for(const instance of [...this.#instances.values()]){
            if(instance.owner === participant || instance.follows.has(participant.id)){
                this.#deliver(instance, participant)
            }
        }
    }

    #sendState(participant: Participant, key: string, value: unknown): void {
        if(!this.#ready.has(participant.id)) return
        if(participant.peer === null) this.#local?.receiveState(key, value)
        else participant.tell(STATE_TOPIC, write({ key, value }))
    }

    // ----- Instances -----

    #open(
        kind: AnyKind, owner: GameMember|null, spec: unknown,
    ): InstanceHandle & { run(): unknown, battle(): unknown } {
        const participant = owner ? this.#participantOf(owner) : null
        const instance: HostInstance = {
            id: this.#nextId++, kind, spec, owner: participant, audience: new Audience(), follows: new Map(),
            invalidated: signal<void>(), engine: null, broadcaster: null, upstream: null,
            isWatched: false, isValid: true,
        }
        this.#instances.set(instance.id, instance)
        if(owner && !participant){
            this.#invalidate(instance)
            return this.#handle(instance)
        }
        if(participant === null){
            try {
                instance.engine = kind.create(this.mode, spec)
            } catch(error){
                this.faulted.notify(new UnloadableFault(kind.open.name, detailOf(error)))
                this.#invalidate(instance)
                return this.#handle(instance)
            }
            this.#broadcast(instance)
        } else if(this.#ready.has(participant.id)){
            this.#deliver(instance, participant)
        }
        return this.#handle(instance)
    }

    /** Have the engine of an instance tell its audience. */
    #broadcast(instance: HostInstance): void {
        if(instance.engine === null || instance.broadcaster) return
        const sender = instanceTopic(instance.id).sender(instance.audience)
        instance.broadcaster = instance.kind.broadcast(instance.engine, sender)
    }

    /** Make sure the manager holds an engine of the instance, which a replica of its owner's is made for. */
    #ensureEngine(instance: HostInstance): void {
        if(instance.engine !== null || !instance.isValid) return
        const { owner } = instance
        if(owner === null) return
        if(owner.peer === null){
            instance.engine = this.#local?.engineOf(instance.id) ?? null
            this.#broadcast(instance)
            return
        }
        try {
            instance.engine = instance.kind.create(this.mode, instance.spec)
        } catch(error){
            this.faulted.notify(new UnloadableFault(instance.kind.open.name, detailOf(error)))
            this.#invalidate(instance)
            return
        }
        const source: SyncSource = { listen: handler => owner.listen(upTopic(instance.id), handler) }
        instance.upstream = instance.kind.receive(
            instance.engine, source, fault => this.faulted.notify(fault), text => this.options.report(text),
        )
        this.#broadcast(instance)
        owner.tell(FOLLOW_TOPIC, write({ id: instance.id }))
    }

    /** The owner is told nobody follows its instance any more, and the replica is dropped. */
    #unfollowIfAlone(instance: HostInstance): void {
        const { owner } = instance
        if(!owner?.peer || instance.upstream === null) return
        if(instance.follows.size > 0 || instance.isWatched) return
        owner.tell(UNFOLLOW_TOPIC, write({ id: instance.id }))
        instance.upstream.dispose()
        instance.upstream = null
        instance.broadcaster?.dispose()
        instance.broadcaster = null
        instance.engine = null
    }

    /** Give a participant the instance, as it should hold it now. */
    #deliver(instance: HostInstance, participant: Participant): void {
        if(!instance.isValid || !this.#ready.has(participant.id)) return
        const isOwner = instance.owner === participant
        const follow = instance.follows.get(participant.id)
        if(!isOwner && !follow) return
        const message: OpenMessage = {
            id: instance.id,
            spec: instance.spec,
            own: isOwner,
            info: follow?.controlled ? follow.info : null,
        }
        if(!isOwner) this.#ensureEngine(instance)
        if(!instance.isValid) return
        if(participant.peer === null){
            const local = this.#local
            // No engine to share yet, and a copy made here would be a second one.
            if(!local || (!isOwner && instance.engine === null)) return
            local.receiveOpen(instance.kind, message, isOwner ? null : instance.engine)
            if(isOwner) this.#ensureEngine(instance)
            return
        }
        participant.tell(instance.kind.open, write(message))
        if(isOwner && instance.upstream !== null) participant.tell(FOLLOW_TOPIC, write({ id: instance.id }))
        if(!isOwner) instance.audience.add(participant.peer)
    }

    #follow(instance: HostInstance, who: GameMember, info: unknown, controlled: boolean): void {
        const participant = this.#participantOf(who)
        if(!instance.isValid || !participant) return
        const known = instance.follows.get(participant.id)
        instance.follows.set(participant.id, {
            participant,
            info: controlled ? info : (known?.controlled ? known.info : null),
            controlled: controlled || (known?.controlled ?? false),
        })
        this.#deliver(instance, participant)
    }

    #release(instance: HostInstance, participant: Participant): void {
        if(!instance.follows.delete(participant.id)) return
        this.#tellClosed(instance, participant)
        this.#unfollowIfAlone(instance)
    }

    #tellClosed(instance: HostInstance, participant: Participant): void {
        if(participant.peer) instance.audience.remove(participant.id)
        if(!this.#ready.has(participant.id)) return
        if(participant.peer === null) this.#local?.receiveClose(instance.id)
        else participant.tell(CLOSE_TOPIC, write({ id: instance.id }))
    }

    /** Close the instance for everyone. */
    #close(instance: HostInstance): void {
        if(!instance.isValid) return
        for(const follow of [...instance.follows.values()]) this.#tellClosed(instance, follow.participant)
        const { owner } = instance
        if(owner && !instance.follows.has(owner.id)) this.#tellClosed(instance, owner)
        instance.follows.clear()
        this.#invalidate(instance)
    }

    /** The instance is not valid any more: its owner is gone, or it was closed. */
    #invalidate(instance: HostInstance): void {
        if(!instance.isValid) return
        // Those that follow are told it is over, but the owner that is gone is not.
        for(const follow of [...instance.follows.values()]) {
            if(follow.participant !== instance.owner) this.#tellClosed(instance, follow.participant)
        }
        this.#drop(instance)
        instance.invalidated.notify(undefined)
    }

    /** Stop everything the instance holds. */
    #drop(instance: HostInstance): void {
        instance.isValid = false
        instance.broadcaster?.dispose()
        instance.upstream?.dispose()
        instance.audience.dispose()
        instance.follows.clear()
        instance.broadcaster = null
        instance.upstream = null
        this.#instances.delete(instance.id)
    }

    #handle(instance: HostInstance): InstanceHandle & { run(): unknown, battle(): unknown } {
        const engine = () => instance.isValid ? instance.engine : null
        return {
            watch: () => {
                if(!instance.isValid) return
                instance.isWatched = true
                this.#ensureEngine(instance)
            },
            spectate: who => this.#follow(instance, who, null, false),
            control: (who, info) => this.#follow(instance, who, info, true),
            uncontrol: who => {
                const follow = instance.follows.get(who.id)
                if(!follow || !instance.isValid) return
                follow.controlled = false
                follow.info = null
                this.#deliver(instance, follow.participant)
            },
            release: who => {
                const participant = this.#participantOf(who)
                if(participant && instance.isValid) this.#release(instance, participant)
            },
            close: () => this.#close(instance),
            valid: () => instance.isValid,
            invalidated: instance.invalidated,
            run: engine,
            battle: engine,
        }
    }
}
