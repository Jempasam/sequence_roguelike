import { Observable } from "../../base/Observable"
import type { Rng } from "../../base/Rng"
import type { Battle } from "../../battle/Battle"
import type { Run } from "../../run/Run"
import type { Admission } from "../Admission"
import type { GameMember } from "../GameMember"
import type { GameMode, GameModeManager, GameModeOwner, InstanceView } from "../GameMode"
import type { BattleHandle, GameModeContext, InstanceHandle, RunHandle } from "../GameModeContext"
import { Replayed } from "../Replayed"
import { shareable } from "../GameModeShareable"
import type { GameModeShareable } from "../GameModeShareable"
import { Heard, NoAnswerFault } from "../HandleChannel"
import type { HandleChannel, HeardChannel } from "../HandleChannel"
import type { SettingValues } from "../Setting"

/** What a local game reads the time from, and waits with: nothing of the network, nothing of a platform. */
export interface LocalClock {
    /** The time now, in ms. */
    now(): number

    /** Run something once, after this many ms. */
    after(ms: number, run: () => void): { cancel(): void }
}

/** What a local game needs of its surroundings. */
export interface LocalOptions {
    readonly clock: LocalClock

    /** Where the chance of the game comes from. */
    readonly rng: Rng

    /** Say a line as the game. */
    announce(text: string): void

    /** Tell of what went wrong, which does not stop the game. */
    report(text: string): void
}

/** A member as the mode sees it. */
class Member implements GameMember {


    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly options: SettingValues,
    ){}


    public connected = true
    public isJoined = false
    public isQuit = false
}

/** What a member that follows an instance holds of it. */
interface Following {
    info: GameModeShareable
    controlled: boolean
    view: { dispose(): void }|null
}

/** An instance as the local game holds it: one engine, shared by every member that follows it. */
interface Instance {
    readonly id: number
    readonly isRun: boolean
    readonly owner: Member
    readonly engine: Run|Battle
    readonly channel: HeardChannel
    readonly follows: Map<string, Following>
    readonly said: Observable<GameModeShareable>
    readonly invalidated: Observable<void>
    isShownToAll: boolean
    isValid: boolean
}

/**
 * The context of a mode played on one client alone: the manager and the client side of the mode run on it, with
 * no network between them, and every member is one of the people at that client.
 *
 * @remarks
 * It is the proof that a mode needs nothing of a network. What goes between the manager and the client side
 * goes through the very text a network would carry, and is delivered later, one at a time in the order it was
 * sent, as it would arrive: nothing a mode shares is anything but a {@link GameModeShareable}, and nothing
 * reaches a handler of the manager while another runs. One engine is made for an instance, by the client of its
 * owner, and every member that follows it is shown that one.
 */
export class LocalManager implements GameModeContext {


    /** Told once when the game is over. */
    public readonly ended = new Replayed<null>(error => this.options.report(String(error)))

    public readonly joined: Observable<GameMember>

    constructor(
        mode: GameMode,
        values: SettingValues,
        private readonly options: LocalOptions,
    ){
        this.joined = new Observable<GameMember>(error => options.report(String(error)))
        this.#manager = mode.manager(values)
        this.#owner = mode.owner(values, this.#toManager())
    }


    // ============ The people ============

    /**
     * Someone joins. The manager says what it makes of it once its turn comes: a member is not one before
     * it accepts.
     */
    public addMember(id: string, name: string, options: SettingValues = {}): Promise<Admission> {
        return new Promise(resolve => this.#later(() => {
            const known = this.#members.get(id)
            if(known?.isJoined && !known.isQuit){
                resolve({ kind: "accept" })
                return
            }
            const member = new Member(id, name, options)
            this.#members.set(id, member)
            const admission = this.#manager.onJoin?.(this, member) ?? { kind: "accept" as const }
            if(admission.kind === "refuse"){
                this.#members.delete(id)
                this.options.report(admission.fault.describe())
                resolve(admission)
                return
            }
            member.isJoined = true
            this.#client ??= member
            for(const instance of this.#instances.values()){
                if(instance.isShownToAll && instance.owner !== member) this.#follow(instance, member, null, false)
            }
            if(this.#isStarted) this.joined.notify(member)
            else this.#early.push(member)
            resolve(admission)
        }))
    }

    /** A member left the game: the manager is told once, and only after it was told of its join. */
    public quit(id: string): void {
        this.#later(() => {
            const member = this.#members.get(id)
            if(!member?.isJoined || member.isQuit) return
            this.#notice(member, { left: id })
            member.isQuit = true
            const missed = this.#missed.get(id) ?? []
            this.#missed.delete(id)
            for(const { drop } of missed) drop()
            for(const instance of [...this.#instances.values()]){
                this.#unfollow(instance, member)
                if(instance.owner === member) this.#invalidate(instance)
            }
            this.#manager.onQuit?.(this, member)
        })
    }

    /** A member lost a connection: its units are played as bots until it is back. */
    public lose(id: string): void {
        this.#later(() => {
            const member = this.#members.get(id)
            if(!member?.isJoined || member.isQuit || !member.connected) return
            member.connected = false
            this.#notice(member, { lost: id })
            this.#manager.onLost?.(this, member)
        })
    }

    /** A member whose connection was lost is back. */
    public back(id: string): void {
        this.#later(() => {
            const member = this.#members.get(id)
            if(!member?.isJoined || member.isQuit || member.connected) return
            member.connected = true
            this.#notice(member, { back: id })
            // What it missed is told to it, in the order it was told.
            const missed = this.#missed.get(id) ?? []
            this.#missed.delete(id)
            for(const { send } of missed) send()
            this.#manager.onBack?.(this, member)
        })
    }

    /** Start the main sequence of the mode: those that joined before are told to it once it does. */
    public start(): void {
        this.#later(() => {
            let result: void|Promise<void>
            try {
                result = this.#manager.run(this)
            } catch(error){
                this.#fail(error)
                return
            }
            this.#isStarted = true
            for(const member of this.#early.splice(0)) this.joined.notify(member)
            if(result) result.catch((error: unknown) => this.#fail(error))
        })
    }

    /** Stop everything: nothing is told any more. */
    public dispose(): void {
        this.#isDisposed = true
        for(const cancel of [...this.#cancels]) cancel()
        this.#cancels.clear()
        for(const instance of [...this.#instances.values()]) this.#drop(instance)
        this.#queue.length = 0
    }

    // ============ The context ============

    public members(): readonly GameMember[] {
        return [...this.#members.values()].filter(each => each.isJoined && !each.isQuit)
    }

    public openRun(owner: GameMember, spec: GameModeShareable): RunHandle {
        return this.#open(true, owner, spec)
    }

    public openBattle(owner: GameMember, spec: GameModeShareable): BattleHandle {
        return this.#open(false, owner, spec)
    }

    public publish(key: string, value: GameModeShareable): void {
        this.publishLazy(key, () => value)
    }

    public publishLazy(key: string, supplier: () => GameModeShareable): void {
        this.#states.set(key, supplier)
        this.#tellState(key, supplier)
    }

    public unpublish(key: string): void {
        if(!this.#states.delete(key)) return
        this.#tellState(key, () => null)
    }

    public channel(member: GameMember): HandleChannel {
        return {
            notify: message => {
                if(!this.#isThere(member)) return false
                this.#whenBack(member, () => this.#later(() => this.#owner.onOrder?.(this.#share(message))))
            },
            ask: (message, timeoutMs) => {
                if(!this.#isThere(member)) return new NoAnswerFault("the member is not there", "quit")
                return this.#askClient(member, message, timeoutMs)
            },
        }
    }

    public broadcast(message: GameModeShareable): void {
        this.#later(() => this.#owner.onOrder?.(this.#share(message)))
    }

    public expected(): number {
        return Math.max(1, this.#members.size)
    }

    public after(ms: number, task: () => void): { cancel(): void } {
        const timer = this.options.clock.after(ms, () => {
            this.#cancels.delete(cancel)
            if(!this.#isDisposed) this.#later(task)
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

    public now(): number {
        return this.options.clock.now()
    }

    public rng(): Rng {
        return this.options.rng
    }

    public announce(text: string): void {
        this.options.announce(text)
    }

    public end(): void {
        this.ended.notify(null)
    }

    public report(text: string): void {
        this.options.report(text)
    }


    readonly #manager: GameModeManager
    readonly #owner: GameModeOwner
    readonly #members = new Map<string, Member>()
    readonly #early: Member[] = []
    readonly #instances = new Map<number, Instance>()
    readonly #states = new Map<string, () => GameModeShareable>()
    readonly #cancels = new Set<() => void>()
    readonly #queue: (() => void)[] = []

    /** What was told to a member whose connection is lost, to tell it when it is back. */
    readonly #missed = new Map<string, { send: () => void, drop: () => void }[]>()

    /** The member the client speaks as: the first to join, since the one client is all of them. */
    #client: Member|null = null
    #isScheduled = false
    #isStarted = false
    #isDisposed = false
    #nextId = 1

    /** Deliver something later, in the order it was sent and never while another delivery runs. */
    #later(task: () => void): void {
        if(this.#isDisposed) return
        this.#queue.push(task)
        if(this.#isScheduled) return
        this.#isScheduled = true
        queueMicrotask(() => {
            this.#isScheduled = false
            while(this.#queue.length > 0 && !this.#isDisposed){
                const next = this.#queue.shift() as () => void
                try {
                    next()
                } catch(error){
                    this.options.report(String(error))
                }
            }
        })
    }

    #fail(error: unknown): void {
        if(!this.#isDisposed) this.options.report(`Le mode de jeu a échoué : ${String(error)}`)
    }

    #memberOf(id: string): GameMember {
        return this.#members.get(id) ?? new Member(id, id, {})
    }

    /** What a value becomes by going through the API, as it would through a network. */
    #share(value: GameModeShareable|undefined): GameModeShareable {
        return shareable(value, id => this.#memberOf(id))
    }

    #isThere(member: GameMember): boolean {
        const known = this.#members.get(member.id)
        return known !== undefined && known.isJoined && !known.isQuit
    }

    /** What the client says to the manager. */
    #toManager(): HandleChannel {
        return {
            notify: message => {
                const from = this.#client
                if(!from) return false
                this.#later(() => this.#manager.onMessage?.(this, from, this.#share(message)))
            },
            ask: message => {
                const from = this.#client
                if(!from || !this.#manager.onAsk) return new NoAnswerFault("nobody listens", "unreachable")
                return new Promise(resolve => this.#later(() => {
                    const answer = this.#manager.onAsk?.(this, from, this.#share(message))
                    Promise.resolve(answer).then(
                        value => resolve(this.#share(value as GameModeShareable)),
                        () => resolve(new NoAnswerFault("the answer failed", "unreachable")),
                    )
                }))
            },
        }
    }

    #askClient(member: GameMember, message: GameModeShareable, timeoutMs?: number): Promise<unknown> {
        return new Promise(resolve => {
            let isSettled = false
            const settle = (answer: unknown): void => {
                if(isSettled) return
                isSettled = true
                timer?.cancel()
                resolve(answer)
            }
            const timer = timeoutMs === undefined
                ? null
                : this.after(timeoutMs, () => settle(new NoAnswerFault("too slow", "timeout")))
            this.#whenBack(member, () => this.#later(() => {
                const answer = this.#owner.onAsk
                    ? this.#owner.onAsk(this.#share(message))
                    : new NoAnswerFault("nobody listens", "unreachable")
                Promise.resolve(answer).then(
                    value => settle(value instanceof NoAnswerFault ? value : this.#share(value as GameModeShareable)),
                    () => settle(new NoAnswerFault("the answer failed", "unreachable")),
                )
            }), () => settle(new NoAnswerFault("the member quit", "quit")))
        })
    }

    /**
     * Do something for a member now, or when it is back if its connection is lost: what is told to it is never
     * lost in silence, and arrives in the order it was told. `drop` is told if it quits instead.
     */
    #whenBack(member: GameMember, send: () => void, drop: () => void = () => {}): void {
        if((this.#members.get(member.id) as Member|undefined)?.connected !== false){
            send()
            return
        }
        let queue = this.#missed.get(member.id)
        if(!queue) this.#missed.set(member.id, queue = [])
        queue.push({ send, drop })
    }

    #tellState(key: string, supplier: () => GameModeShareable): void {
        this.#later(() => this.#owner.onState?.(key, this.#share(supplier())))
    }

    /** Tell the owners of the instances a member plays on what became of it. */
    #notice(member: Member, notice: { readonly [key: string]: string }): void {
        for(const instance of this.#instances.values()){
            if(!instance.isValid || instance.owner === member) continue
            if(instance.follows.get(member.id)?.controlled) this.#hear(instance, null, null, notice)
        }
    }

    /** Pass something said on an instance on to its owner, as it would arrive. */
    #hear(
        instance: Instance, from: GameMember|null, info: GameModeShareable, message: GameModeShareable,
    ): boolean {
        if(!instance.isValid) return false
        const heard = new Heard(from === null ? null : this.#memberOf(from.id), this.#share(info), this.#share(message))
        // An owner whose connection is lost is told when it is back, in order.
        this.#whenBack(instance.owner, () => this.#later(() => void instance.channel.notify(heard)))
        return true
    }

    // ----- Instances -----

    #open(isRun: boolean, owner: GameMember, spec: GameModeShareable): InstanceHandle {
        const member = this.#members.get(owner.id) as Member|undefined
        const id = this.#nextId++
        const said = new Replayed<GameModeShareable>(error => this.options.report(String(error)))
        const invalidated = new Replayed<void>(error => this.options.report(String(error)))
        const toManager: HandleChannel = {
            notify: message => {
                if(!instance?.isValid) return false
                this.#later(() => { if(instance?.isValid) said.notify(this.#share(message)) })
            },
            ask: () => new NoAnswerFault("the manager answers nothing", "unreachable"),
        }
        let instance: Instance|null = null
        if(!member || !this.#isThere(member)){
            invalidated.notify(undefined)
            return this.#deadHandle(said, invalidated)
        }
        try {
            const made = isRun
                ? this.#owner.createRun?.(this.#share(spec), toManager)
                : this.#owner.createBattle?.(this.#share(spec), toManager)
            if(!made) throw new Error(`the mode makes no ${isRun ? "run" : "battle"}`)
            instance = {
                id, isRun, owner: member, engine: made[0], channel: made[1], follows: new Map(),
                said, invalidated, isShownToAll: false, isValid: true,
            }
        } catch(error){
            this.options.report(`Le mode n'a pas pu ouvrir l'instance : ${String(error)}`)
            invalidated.notify(undefined)
            return this.#deadHandle(said, invalidated)
        }
        this.#instances.set(id, instance)
        // Its owner follows it too, whose engine it is.
        this.#follow(instance, member, null, false)
        return this.#handle(instance)
    }

    #deadHandle(said: Observable<GameModeShareable>, invalidated: Observable<void>): InstanceHandle {
        return {
            notify: () => false,
            ask: () => new NoAnswerFault("the instance is not there", "unreachable"),
            said, invalidated,
            spectate: () => {}, spectateAll: () => {}, control: () => {}, play: () => {},
            uncontrol: () => {}, release: () => {}, close: () => {}, valid: () => false,
        }
    }

    /** Show the instance to a member, or show it again with what it was given. */
    #follow(instance: Instance, who: GameMember, info: GameModeShareable, controlled: boolean): void {
        const member = this.#members.get(who.id)
        if(!instance.isValid || !member || !this.#isThere(member)) return
        const known = instance.follows.get(member.id)
        const following: Following = known ?? { info: null, controlled: false, view: null }
        if(controlled){
            following.info = this.#share(info)
            following.controlled = true
        }
        instance.follows.set(member.id, following)
        this.#later(() => this.#show(instance, member, following))
    }

    #show(instance: Instance, member: Member, following: Following): void {
        if(!instance.isValid || instance.follows.get(member.id) !== following) return
        // Shown again when what the member was given changes: `dispose` of the last view is called once, at the end.
        const given = (following.info as { units?: unknown }|null)?.units
        const units = Array.isArray(given) ? given.filter((unit): unit is string => typeof unit === "string") : []
        const own = instance.owner === member
        const say = following.controlled
            ? (message: GameModeShareable): void => void this.#hear(instance, member, following.info, message)
            : undefined
        const ready = !own && units.length > 0 ? (): void => void this.#hear(instance, member, following.info, null) : undefined
        const view = { engine: instance.engine, own, me: member.id, info: following.info, units, say, ready }
        try {
            following.view = instance.isRun
                ? this.#owner.spectateRun?.(view as InstanceView<Run>) ?? null
                : this.#owner.spectateBattle?.(view as InstanceView<Battle>) ?? null
        } catch(error){
            this.options.report(String(error))
        }
    }

    #unfollow(instance: Instance, member: Member): void {
        const following = instance.follows.get(member.id)
        if(!following) return
        instance.follows.delete(member.id)
        following.view?.dispose()
    }

    #invalidate(instance: Instance): void {
        if(!instance.isValid) return
        this.#drop(instance)
        instance.invalidated.notify(undefined)
    }

    #drop(instance: Instance): void {
        instance.isValid = false
        for(const following of instance.follows.values()) following.view?.dispose()
        instance.follows.clear()
        this.#instances.delete(instance.id)
    }

    #handle(instance: Instance): InstanceHandle {
        return {
            notify: message => this.#hear(instance, null, null, message) ? undefined : false,
            ask: (message, timeoutMs) => {
                if(!instance.isValid) return new NoAnswerFault("the instance is not there", "unreachable")
                return new Promise(resolve => {
                    const timer = timeoutMs === undefined
                        ? null
                        : this.after(timeoutMs, () => resolve(new NoAnswerFault("too slow", "timeout")))
                    this.#later(() => {
                        Promise.resolve(instance.channel.ask(new Heard(null, null, this.#share(message)))).then(
                            value => { timer?.cancel(); resolve(value) },
                            () => { timer?.cancel(); resolve(new NoAnswerFault("the answer failed", "unreachable")) },
                        )
                    })
                })
            },
            said: instance.said,
            spectate: who => this.#follow(instance, who, null, false),
            spectateAll: () => {
                if(!instance.isValid) return
                instance.isShownToAll = true
                for(const member of this.members()){
                    if(member.id !== instance.owner.id && !instance.follows.has(member.id)){
                        this.#follow(instance, member, null, false)
                    }
                }
            },
            control: (who, info) => this.#follow(instance, who, info, true),
            play: (who, units, info) => this.#follow(instance, who, { ...info, units }, true),
            uncontrol: who => {
                const following = instance.follows.get(who.id)
                const member = this.#members.get(who.id)
                if(!following || !member || !instance.isValid) return
                following.controlled = false
                following.info = null
                this.#later(() => this.#show(instance, member, following))
            },
            release: who => {
                const member = this.#members.get(who.id)
                if(member && instance.isValid) this.#unfollow(instance, member)
            },
            close: () => this.#invalidate(instance),
            valid: () => instance.isValid,
            invalidated: instance.invalidated,
        }
    }
}
