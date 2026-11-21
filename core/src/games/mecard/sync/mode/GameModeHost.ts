import { Fault } from "../../../../engine/net/Fault"
import type { TimerPort } from "../../../../platform"
import type { Observable, Observer } from "../../sim/base/Observable"
import type { Rng } from "../../sim/base/Rng"
import { signal, UnloadableFault, UnreadableFault } from "../faults"
import type { ModeRun } from "../lobby/LobbyMode"
import { checkValues, initialValues } from "../../sim/mode/Setting"
import type { Setting, SettingValues } from "../../sim/mode/Setting"
import type { HostStage } from "../lobby/Stage"
import { Placements } from "../participation/Participation"
import type { Placement } from "../participation/Participation"
import { detailOf } from "../read"
import type { Participant } from "../session/Participant"
import type { SyncPeer } from "../SyncChannel"

import type { GameMember } from "../../sim/mode/GameMember"
import type { GameModeContext, RunHandle, BattleHandle, InstanceHandle } from "../../sim/mode/GameModeContext"
import type { GameModeManager } from "../../sim/mode/GameMode"
import { decodeShareable, encodeShareable } from "../../sim/mode/GameModeShareable"
import type { GameModeShareable } from "../../sim/mode/GameModeShareable"
import { NoAnswerFault } from "../../sim/mode/HandleChannel"
import { Replayed } from "../../sim/mode/Replayed"
import type { HandleChannel } from "../../sim/mode/HandleChannel"

import { Audience } from "./Audience"
import type { GameModeGuest } from "./GameModeGuest"
import { ANY_BATTLE, ANY_RUN } from "./kinds"
import type { AnyKind } from "./kinds"
import {
    FOLLOW_TOPIC, CLOSE_TOPIC, ACT_TOPIC, ASK_TOPIC, REPLY_TOPIC, instanceTopic, ORDER_TOPIC,
    readActMessage, readAskMessage, readReplyMessage, ROUTE_ASK_TOPIC, ROUTE_TOPIC,
    STATE_TOPIC, ANSWER_TOPIC, UNFOLLOW_TOPIC, upTopic, write,
} from "./messages"
import type { AnswerMessage, OpenMessage, RouteAskMessage, RouteMessage } from "./messages"
import type { Seat } from "./Seat"
import type { Removable } from "../../../../lifetime"

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
    heardAct(from: string, json: string): void
    heardAsk(from: string, json: string): void
    heardReply(from: string, json: string): void
    heardUp(from: string, id: number, text: string): void
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

    public act(json: string): void {
        this.#manager?.heardAct(this.id, json)
    }

    public ask(json: string): void {
        this.#manager?.heardAsk(this.id, json)
    }

    public reply(json: string): void {
        this.#manager?.heardReply(this.id, json)
    }

    public up(id: number, text: string): void {
        this.#manager?.heardUp(this.id, id, text)
    }


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

    /** Is it shown to everyone that takes part, now and later? */
    isShownToAll: boolean

    /** What the owner says to the manager. */
    readonly said: Observable<GameModeShareable>
    readonly audience: Audience
    readonly follows: Map<string, Follow>
    readonly invalidated: Observable<void>

    /** What hears the owner's stream, to pass it on to the audience: none with no follower. */
    relay: Removable|null

    isValid: boolean
}

/** An ask passed on to the owner of an instance, which is waited for. */
interface PendingAsk {
    /** The player that asked, none when the manager did. */
    readonly asker: string|null
    readonly req: number

    /** Told what the owner answers, when the manager asked. */
    readonly resolve?: (answer: unknown) => void
    readonly owner: string

    /** Gives up the wait for the answer. */
    timeout?: { cancel(): void }
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
    public get connected(): boolean { return this.participant.connection === "connected" }
}

/**
 * The manager of a game, on the stage of the main client: it gives the mode everything it asks of the
 * network, and
 * tells the clients what the mode decides, with the bricks that already did each part.
 *
 * @remarks
 * A client that takes part is greeted, once it is told it is in, with the stores, their states, and the
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
        private readonly mode: GameModeManager,
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
            session.lost.add(who => this.#lost(who)),
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
                let result: void|Promise<void> = undefined
                this.#enter(() => {
                    result = this.mode.run(this)
                    // Those that took part before the mode listened are told to it once it does, as it starts.
                    this.#isStarted = true
                    for(const participant of this.#early.splice(0)) this.joined.notify(this.#view(participant))
                })
                return result
            })
            .catch((error: unknown) => {
                if(!this.#isDisposed) this.ended.notify(new ModeFailedFault(detailOf(error)))
            })
    }

    // ============ The context ============

    public members(): readonly GameMember[] {
        return this.#session.participants.filter(each => each.isPlayer).map(each => this.#view(each))
    }

    public openRun(owner: GameMember, spec: GameModeShareable): RunHandle {
        return this.#open(ANY_RUN, owner, spec)
    }

    public openBattle(owner: GameMember, spec: GameModeShareable): BattleHandle {
        return this.#open(ANY_BATTLE, owner, spec) as BattleHandle
    }

    public publish(key: string, value: GameModeShareable): void {
        this.publishLazy(key, () => value)
    }

    public publishLazy(key: string, supplier: () => GameModeShareable): void {
        if(this.#isDisposed) return
        this.#states.set(key, supplier)
        for(const participant of this.#session.participants) this.#sendState(participant, key, supplier())
    }

    public unpublish(key: string): void {
        if(!this.#states.delete(key)) return
        for(const participant of this.#session.participants) this.#sendState(participant, key, null)
    }

    public channel(member: GameMember): HandleChannel {
        return {
            notify: message => {
                const participant = this.#participantOf(member)
                if(!participant || !this.#joinedIds.has(participant.id)) return false
                this.#sendOrder(participant, message)
            },
            ask: (message, timeoutMs) => {
                const participant = this.#participantOf(member)
                if(!participant || !this.#joinedIds.has(participant.id)){
                    return new NoAnswerFault("the member is not there", "quit")
                }
                return new Promise(resolve => {
                    this.#route(null, participant, null, null, message, 0, resolve, timeoutMs)
                })
            },
        }
    }

    public broadcast(message: GameModeShareable): void {
        for(const participant of this.#session.participants) this.#sendOrder(participant, message)
    }

    public now(): number {
        return this.options.timer.now()
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

    public sleep(ms: number): Promise<void> {
        return new Promise(resolve => void this.after(ms, resolve))
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

    /** A player says something on an instance or a store. */
    public heardAct(from: string, json: string): void {
        const message = readActMessage(json)
        if(message instanceof UnreadableFault) this.faulted.notify(message)
        else this.#heard(from, message.id, message.message, null)
    }

    /** A player asks something on an instance or a store. */
    public heardAsk(from: string, json: string): void {
        const message = readAskMessage(json)
        if(message instanceof UnreadableFault) this.faulted.notify(message)
        else this.#heard(from, message.id, message.message, message.req)
    }

    /** The owner of an instance, a client, answers what was passed on to it. */
    public heardReply(from: string, json: string): void {
        const message = readReplyMessage(json)
        if(message instanceof UnreadableFault){
            this.faulted.notify(message)
            return
        }
        const pending = this.#asks.get(message.req)
        if(!pending || pending.owner !== from) return
        this.#asks.delete(message.req)
        pending.timeout?.cancel()
        if(pending.resolve) pending.resolve(decodeShareable(message.value, id => this.#memberOf(id)))
        else if(pending.asker !== null) this.#answer(pending.asker, pending.req, decodeShareable(message.value, id => this.#memberOf(id)), null)
    }

    // ============ Ending ============

    public dispose(): void {
        this.#isDisposed = true
        for(const cancel of [...this.#cancels]) cancel()
        this.#cancels.clear()
        for(const instance of [...this.#instances.values()]) this.#drop(instance)
        this.#states.clear()
        // An ask still waiting is answered by a fault, as when its owner leaves: the mode awaiting it goes on.
        const asks = [...this.#asks.values()]
        this.#asks.clear()
        for(const pending of asks){
            pending.timeout?.cancel()
            pending.resolve?.(new NoAnswerFault("the game is over", "quit"))
        }
        for(const handles of this.#listening.values()) for(const handle of handles) handle.remove()
        this.#listening.clear()
        for(const observer of this.#observers) observer.remove()
        this.#policy.remove()
        this.#local = null
    }


    readonly #session: HostStage["session"]
    readonly #policy: Removable
    readonly #observers: readonly Observer[]
    readonly #expected: number
    readonly #instances = new Map<number, HostInstance>()
    readonly #states = new Map<string, () => GameModeShareable>()
    readonly #joinedIds = new Set<string>()

    #isHandling = false
    readonly #deferred: (() => void)[] = []

    /** What was told to a participant whose connection is lost, to tell it when it is back. */
    readonly #missed = new Map<string, (() => void)[]>()
    readonly #asks = new Map<number, PendingAsk>()
    readonly #views = new Map<string, MemberView>()
    readonly #cancels = new Set<() => void>()

    /** The ids of the participants whose client listens: what they are given is told to them. */
    readonly #ready = new Set<string>()
    readonly #listening = new Map<string, Removable[]>()
    #local: GameModeGuest|null = null
    #isStarted = false
    readonly #early: Participant[] = []
    #nextId = 1
    #nextReq = 1
    #isDisposed = false

    /**
     * Run something of the manager's: one at a time, never while another runs. What a handler makes the game do
     * (a join told, a quit, a message) reaches the manager after it returns, in the order it was made.
     */
    #enter(task: () => void): void {
        if(this.#isHandling){
            this.#deferred.push(task)
            return
        }
        this.#isHandling = true
        try {
            task()
            while(this.#deferred.length > 0 && !this.#isDisposed){
                const next = this.#deferred.shift() as () => void
                try {
                    next()
                } catch(error){
                    this.options.report(`Le mode de jeu a échoué : ${detailOf(error)}`)
                }
            }
        } finally {
            this.#isHandling = false
        }
    }

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

    #admit(id: string): Placement {
        const participant = this.#session.participant(id)
        if(!participant) return Placements.seat("player")
        const admission = this.mode.onJoin?.(this, this.#view(participant))
        if(admission?.kind === "refuse") return Placements.refuse(admission.fault)
        this.#joinedIds.add(id)
        return Placements.seat("player")
    }

    // ----- Arrivals and departures -----

    #joined(participant: Participant): void {
        this.#listen(participant)
        if(!this.#ready.has(participant.id)){
            this.#ready.add(participant.id)
            this.#greet(participant)
        }
        for(const instance of [...this.#instances.values()]){
            const follows = instance.follows.has(participant.id)
            if(instance.isShownToAll && instance.owner !== participant && !follows){
                this.#follow(instance, this.#view(participant), null, false)
            }
        }
        if(this.#isStarted) this.#enter(() => this.joined.notify(this.#view(participant)))
        else if(!this.#early.includes(participant)) this.#early.push(participant)
    }

    #lost(participant: Participant): void {
        this.#tellOwners(participant, { lost: participant.id })
        this.#enter(() => this.mode.onLost?.(this, this.#view(participant)))
    }

    /**
     * Tell the owners of the instances a member plays on what became of it, as `{lost}`, `{back}` or
     * `{left}` with its id: they play its units as bots meanwhile, and let them go when it left.
     */
    #tellOwners(participant: Participant, notice: { readonly [key: string]: string }): void {
        for(const instance of [...this.#instances.values()]){
            const { owner } = instance
            if(!instance.isValid || !owner || owner === participant) continue
            if(instance.follows.get(participant.id)?.controlled) this.#route(instance, owner, null, null, notice, null)
        }
    }

    #back(participant: Participant): void {
        this.#tellOwners(participant, { back: participant.id })
        // The states first, then the instances, then what it missed, in the order it was told.
        this.#greet(participant)
        this.#catchUp(participant)
        this.#enter(() => this.mode.onBack?.(this, this.#view(participant)))
    }

    #left(participant: Participant, gone: boolean): void {
        this.#ready.delete(participant.id)
        // Nothing is kept for one that quits: its asks are answered as not heard, below.
        this.#missed.delete(participant.id)
        if(gone){
            for(const handle of this.#listening.get(participant.id) ?? []) handle.remove()
            this.#listening.delete(participant.id)
        }
        for(const [req, pending] of [...this.#asks]){
            if(pending.owner === participant.id){
                this.#asks.delete(req)
                pending.timeout?.cancel()
                if(pending.resolve) pending.resolve(new NoAnswerFault("the owner left", "quit"))
                else if(pending.asker !== null) this.#answer(pending.asker, pending.req, null, "the owner left")
            } else if(pending.asker === participant.id) this.#asks.delete(req)
        }
        this.#tellOwners(participant, { left: participant.id })
        for(const instance of [...this.#instances.values()]){
            instance.follows.delete(participant.id)
            if(participant.peer) instance.audience.remove(participant.id)
            if(instance.owner === participant) this.#invalidate(instance)
            else this.#unfollowIfAlone(instance)
        }
        if(this.#joinedIds.delete(participant.id)) this.#enter(() => this.mode.onQuit?.(this, this.#view(participant)))
    }

    /** Listen to what a client says, once: it is the same client through a lost connection. */
    #listen(participant: Participant): void {
        if(!participant.peer || this.#listening.has(participant.id)) return
        this.#listening.set(participant.id, [
            participant.listen(ACT_TOPIC, text => this.heardAct(participant.id, text)),
            participant.listen(ASK_TOPIC, text => this.heardAsk(participant.id, text)),
            participant.listen(REPLY_TOPIC, text => this.heardReply(participant.id, text)),
        ])
    }

    /** Give a client that is there what it should hold: the stores and their states, then its instances. */
    #greet(participant: Participant): void {
        for(const [key, supplier] of this.#states) this.#sendState(participant, key, supplier())
        for(const instance of [...this.#instances.values()]){
            if(instance.owner === participant || instance.follows.has(participant.id)){
                this.#deliver(instance, participant)
            }
        }
    }

    // ----- What the players say, resolved -----

    /** Something said to the manager (id 0) or on an instance: the controller is checked, then the owner hears it. */
    #heard(from: string, id: number, message: unknown, req: number|null): void {
        const participant = this.#session.participant(from)
        if(!participant || !this.#joinedIds.has(from)) return
        if(id === 0){
            const said = decodeShareable(message, id => this.#memberOf(id))
            this.#enter(() => this.#hearManager(participant, said, req))
            return
        }
        const instance = this.#instances.get(id)
        if(instance?.isValid && instance.owner === participant){
            // The owner speaks to the manager.
            if(req === null) instance.said.notify(decodeShareable(message, id => this.#memberOf(id)))
            else this.#answer(from, req, null, "the manager answers nothing")
            return
        }
        const follow = instance?.follows.get(from)
        if(!instance || !instance.isValid || !instance.owner || !follow?.controlled){
            if(req !== null) this.#answer(from, req, null, "this player does not act on it")
            return
        }
        this.#route(instance, instance.owner, participant, follow.info, message, req)
    }

    /** What a client says to the manager: its `onMessage`, or its `onAsk` whose answer goes back. */
    #hearManager(participant: Participant, message: GameModeShareable, req: number|null): void {
        const member = this.#view(participant)
        let value: unknown
        try {
            if(req === null) this.mode.onMessage?.(this, member, message)
            else value = this.mode.onAsk ? this.mode.onAsk(this, member, message) : new NoAnswerFault("nobody listens")
        } catch(error){
            this.faulted.notify(new UnloadableFault("act", detailOf(error), participant.id))
            if(req !== null) this.#answer(participant.id, req, null, "the answer failed")
            return
        }
        if(req === null) return
        Promise.resolve(value).then(
            answer => {
                if(answer instanceof NoAnswerFault) this.#answer(participant.id, req, null, answer.detail)
                else this.#answer(participant.id, req, (answer ?? null) as GameModeShareable, null)
            },
            (error: unknown) => this.#answer(participant.id, req, null, detailOf(error)),
        )
    }

    /** Pass what a controller, or the manager, says on to the owner of the instance. */
    #route(
        instance: HostInstance|null, owner: Participant, from: Participant|null, info: unknown, message: unknown,
        req: number|null,
        resolve?: (answer: unknown) => void,
        timeoutMs?: number,
    ): void {
        const routed: RouteMessage = {
            id: instance?.id ?? 0, from: from?.id ?? null, name: from?.name ?? null, info: encodeShareable(info as GameModeShareable),
            message: encodeShareable(message as GameModeShareable),
        }
        if(req === null){
            this.#sendOrLater(owner, () => {
                if(owner.peer === null) this.#local?.receiveRoute(routed)
                else owner.tell(ROUTE_TOPIC, write(routed))
            })
            return
        }
        const mine = this.#nextReq++
        const pending: PendingAsk = { asker: from?.id ?? null, req, owner: owner.id, resolve }
        if(resolve && timeoutMs !== undefined){
            pending.timeout = this.options.timer.after(timeoutMs, () => {
                if(this.#asks.delete(mine)) resolve(new NoAnswerFault("too slow", "timeout"))
            })
        }
        this.#asks.set(mine, pending)
        const ask: RouteAskMessage = { ...routed, req: mine }
        this.#sendOrLater(owner, () => {
            if(owner.peer === null) this.#local?.receiveRouteAsk(ask)
            else owner.tell(ROUTE_ASK_TOPIC, write(ask))
        })
    }

    /**
     * Do a sending to a participant now, or when its connection is back if it is lost: what is told to it is
     * never lost in silence, and arrives in the order it was told. One that quits gets none of it.
     */
    #sendOrLater(participant: Participant, send: () => void): void {
        if(participant.connection === "lost" && participant.peer !== null){
            let queue = this.#missed.get(participant.id)
            if(!queue) this.#missed.set(participant.id, queue = [])
            queue.push(send)
            return
        }
        send()
    }

    /** What a participant missed while its connection was lost is told to it, in order. */
    #catchUp(participant: Participant): void {
        const queue = this.#missed.get(participant.id)
        if(!queue) return
        this.#missed.delete(participant.id)
        for(const send of queue) send()
    }

    /** Tell a player what it asked: the value, or why there is none. */
    #answer(id: string, req: number, value: GameModeShareable|null, fault: string|null): void {
        const participant = this.#session.participant(id)
        if(!participant || !this.#ready.has(id)) return
        const answer: AnswerMessage = { req, value: encodeShareable(value), fault }
        this.#sendOrLater(participant, () => {
            if(participant.peer === null) this.#local?.receiveAnswer(answer)
            else participant.tell(ANSWER_TOPIC, write(answer))
        })
    }

    // ----- State and orders -----

    #sendOrder(participant: Participant, order: GameModeShareable): void {
        if(!this.#ready.has(participant.id)) return
        const encoded = encodeShareable(order)
        this.#sendOrLater(participant, () => {
            if(participant.peer === null) this.#local?.receiveOrder(encoded)
            else participant.tell(ORDER_TOPIC, write({ order: encoded }))
        })
    }

    #sendState(participant: Participant, key: string, value: GameModeShareable): void {
        if(!this.#ready.has(participant.id)) return
        const encoded = encodeShareable(value)
        if(participant.peer === null) this.#local?.receiveState(key, encoded)
        else participant.tell(STATE_TOPIC, write({ key, value: encoded }))
    }

    /** A member as the mode sees it, whoever it is: one that quit is still given. */
    #memberOf(id: string): GameMember {
        const participant = this.#session.participant(id)
        return participant ? this.#view(participant) : { id, name: id, connected: false, options: {} }
    }

    // ----- Instances -----

    #open(kind: AnyKind, owner: GameMember, spec: GameModeShareable): InstanceHandle {
        const participant = this.#participantOf(owner)
        const report = (error: unknown): void => this.options.report(String(error))
        const instance: HostInstance = {
            id: this.#nextId++, kind, spec: encodeShareable(spec), owner: participant, audience: new Audience(), follows: new Map(),
            invalidated: new Replayed<void>(report), said: new Replayed<GameModeShareable>(report), isShownToAll: false, relay: null,
            isValid: true,
        }
        this.#instances.set(instance.id, instance)
        if(!participant) this.#invalidate(instance)
        else if(this.#ready.has(participant.id)) this.#deliver(instance, participant)
        return this.#handle(instance)
    }

    /** What the owner tells of the instance goes on to everyone that follows it, as it is. */
    #forward(instance: HostInstance, text: string): void {
        instanceTopic(instance.id).sender(instance.audience).send(text)
    }

    /** What the owner of an instance on the manager's client tells of it. */
    public heardUp(from: string, id: number, text: string): void {
        const instance = this.#instances.get(id)
        if(instance?.isValid && instance.relay && instance.owner?.id === from) this.#forward(instance, text)
    }

    /**
     * Have the owner tell what it plays, which the manager passes on to those that follow: said again when
     * one comes, for it to start from. The manager holds no engine of it.
     */
    #relay(instance: HostInstance): void {
        const { owner } = instance
        if(!owner || !instance.isValid) return
        if(!instance.relay){
            instance.relay = owner.peer
                ? owner.listen(upTopic(instance.id), text => this.#forward(instance, text))
                : { remove: () => {} }
        }
        if(owner.peer === null) this.#local?.receiveFollow(instance.id)
        else owner.tell(FOLLOW_TOPIC, write({ id: instance.id }))
    }

    /** The owner is told nobody follows its instance any more. */
    #unfollowIfAlone(instance: HostInstance): void {
        const { owner } = instance
        if(!owner || instance.relay === null || instance.follows.size > 0) return
        if(owner.peer === null) this.#local?.receiveUnfollow(instance.id)
        else owner.tell(UNFOLLOW_TOPIC, write({ id: instance.id }))
        instance.relay.remove()
        instance.relay = null
    }

    /** What a follower on the manager's client hears of an instance: by calls, as it would by a link. */
    #localPeer(participant: Participant, instance: HostInstance): SyncPeer {
        return {
            id: participant.id,
            send: text => this.#local?.receiveStream(instance.id, text),
            listen: () => ({ remove: () => {} }),
        }
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
        if(participant.peer === null){
            const local = this.#local
            if(!local) return
            local.receiveOpen(instance.kind, message)
            if(isOwner){
                if(instance.relay !== null) local.receiveFollow(instance.id)
                return
            }
            instance.audience.add(this.#localPeer(participant, instance))
            this.#relay(instance)
            return
        }
        participant.tell(instance.kind.open, write(message))
        if(isOwner){
            if(instance.relay !== null) participant.tell(FOLLOW_TOPIC, write({ id: instance.id }))
            return
        }
        instance.audience.add(participant.peer)
        this.#relay(instance)
    }

    #follow(instance: HostInstance, who: GameMember, info: unknown, controlled: boolean): void {
        const participant = this.#participantOf(who)
        if(!instance.isValid || !participant) return
        const known = instance.follows.get(participant.id)
        instance.follows.set(participant.id, {
            participant,
            info: controlled ? encodeShareable(info as GameModeShareable) : (known?.controlled ? known.info : null),
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
        instance.audience.remove(participant.id)
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
        instance.relay?.remove()
        instance.audience.dispose()
        instance.follows.clear()
        instance.relay = null
        this.#instances.delete(instance.id)
    }

    #handle(instance: HostInstance): InstanceHandle {
        return {
            notify: message => {
                if(!instance.isValid || !instance.owner) return false
                this.#route(instance, instance.owner, null, null, message, null)
            },
            ask: (message, timeoutMs) => {
                const { owner } = instance
                if(!instance.isValid || !owner) return new NoAnswerFault("the instance is not there", "unreachable")
                return new Promise(resolve => this.#route(instance, owner, null, null, message, 0, resolve, timeoutMs))
            },
            said: instance.said,
            spectate: who => this.#follow(instance, who, null, false),
            spectateAll: () => {
                if(!instance.isValid) return
                instance.isShownToAll = true
                // One that follows already is left as it is: it is not shown the instance again.
                for(const member of this.members()){
                    if(member.id !== instance.owner?.id && !instance.follows.has(member.id)){
                        this.#follow(instance, member, null, false)
                    }
                }
            },
            control: (who, info) => this.#follow(instance, who, info, true),
            play: (who, units, info) => this.#follow(instance, who, { ...info, units }, true),
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
        }
    }
}
