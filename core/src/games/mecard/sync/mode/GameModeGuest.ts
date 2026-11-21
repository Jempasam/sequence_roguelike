import type { Fault } from "../../../../engine/net/Fault"
import type { TimerPort } from "../../../../platform"
import { BattleGuest } from "../battle/BattleGuest"
import { signal, UnloadableFault, UnreadableFault } from "../faults"
import type { ModeRun } from "../lobby/LobbyMode"
import type { SettingValues } from "../../sim/mode/Setting"
import { ParticipationReceiver } from "../participation/ParticipationReceiver"
import { detailOf } from "../read"
import type { SyncLink, SyncSender, SyncSource } from "../SyncChannel"

import type { GameMember } from "../../sim/mode/GameMember"
import type { GameMode, GameModeOwner, InstanceView } from "../../sim/mode/GameMode"
import { decodeShareable, encodeShareable } from "../../sim/mode/GameModeShareable"
import type { GameModeShareable } from "../../sim/mode/GameModeShareable"
import { Heard, NoAnswerFault } from "../../sim/mode/HandleChannel"
import type { HandleChannel, HeardChannel } from "../../sim/mode/HandleChannel"
import type { SettingValues as Values } from "../../sim/mode/Setting"

import { ANY_BATTLE, ANY_RUN } from "./kinds"
import type { AnyKind, Engine } from "./kinds"
import {
    ANSWER_TOPIC, CLOSE_TOPIC, FOLLOW_TOPIC, instanceTopic, OPEN_BATTLE_TOPIC, OPEN_RUN_TOPIC,
    ORDER_TOPIC, readAnswerMessage, readIdMessage, readOpenMessage, readOrderMessage,
    readRouteAskMessage, readRouteMessage, readStateMessage, ROUTE_ASK_TOPIC, ROUTE_TOPIC, STATE_TOPIC,
    UNFOLLOW_TOPIC, write,
} from "./messages"
import type { AnswerMessage, OpenMessage, RouteAskMessage, RouteMessage } from "./messages"
import type { Seat } from "./Seat"
import { RemoteSeat } from "./Seat"
import type { Removable } from "../../../../lifetime"

/** What a client needs of its surroundings, which the mode knows nothing of. */
export interface GuestOptions {
    /** Where time goes, none for a client that says it joins once and never again. */
    readonly timer: TimerPort|null

    /** Tell the player something went wrong, which does not stop the game. */
    report(text: string): void
}

/** What a replica is told by: nothing, since only the owner of an instance hears what is said on it. */
const NO_HEARD: HeardChannel = {
    notify: () => false,
    ask: () => new NoAnswerFault("only the owner hears", "unreachable"),
}

/** An instance as a client holds it. */
interface GuestInstance {
    readonly id: number
    readonly kind: AnyKind
    readonly engine: Engine

    /** What the manager tells the mode by, for this instance. */
    readonly channel: HeardChannel

    /** Does this client own it? */
    readonly own: boolean

    info: GameModeShareable

    /** What shows it to the player, none when the mode shows nothing of it. */
    spectator: Removable|null

    /** What takes in what the manager tells of it, for a replica. */
    down: { dispose(): void }|null

    /** What tells the manager what it plays, when its owner is this client and someone follows. */
    up: { dispose(): void }|null

    /** What `up` says by, to say again what it said first. */
    upSender: UpSender|null
}

/** A sender to the manager, which greets it at once with what it was asked to say first. */
class UpSender implements SyncSender {


    constructor(
        private readonly send_: (message: string) => void,
    ){}


    public send(message: string): void {
        this.send_(message)
    }

    public onPeer(initial: () => string|null): Removable {
        const entry = { initial }
        this.#entries.add(entry)
        return { remove: () => this.#entries.delete(entry) }
    }

    /** Say again what was asked to be said first. */
    public greet(): void {
        for(const { initial } of [...this.#entries]){
            const message = initial()
            if(message !== null) this.send_(message)
        }
    }


    readonly #entries = new Set<{ initial: () => string|null }>()
}

/**
 * The code of a game on a player's client: the instances and stores the manager shows to it or has it
 * own, what it is told, and the way back to the manager. It is the same code whether the manager is far
 * away or on this client.
 *
 * @remarks
 * What the manager tells arrives from a link, or by the calls of {@link GameModeGuest.receiveOpen} and the
 * others
 * when the manager is on the same client: the engine is then the manager's own, never a second copy.
 */
export class GameModeGuest implements ModeRun {


    /** Told once when the game is over for this client. */
    public readonly ended = signal<Fault|null>()

    /** Told of what came and could not be read or taken in: it is left out. */
    public readonly faulted = signal<Fault>()

    constructor(
        mode: GameMode,
        values: Values,
        private readonly seat: Seat,
        private readonly options: GuestOptions,

        /** The way to the manager, none when it is on this client. */
        link: SyncLink|null,

        /** What the manager knows this client by. */
        public readonly id: string,

        /** The number of the game, which what the manager says is told apart by. */
        game: number,
    ){
        this.#owner = mode.owner(values, this.#toManager(0))
        if(!link) return
        this.#handles = [
            this.#hear(link, OPEN_RUN_TOPIC, text => this.#openText(ANY_RUN, OPEN_RUN_TOPIC, text)),
            this.#hear(link, OPEN_BATTLE_TOPIC, text => this.#openText(ANY_BATTLE, OPEN_BATTLE_TOPIC, text)),
            this.#hear(link, CLOSE_TOPIC, text => {
                this.#idText(CLOSE_TOPIC, text, id => this.receiveClose(id))
            }),
            this.#hear(link, FOLLOW_TOPIC, text => {
                this.#idText(FOLLOW_TOPIC, text, id => this.receiveFollow(id))
            }),
            this.#hear(link, UNFOLLOW_TOPIC, text => {
                this.#idText(UNFOLLOW_TOPIC, text, id => this.receiveUnfollow(id))
            }),
            this.#hear(link, ORDER_TOPIC, text => this.#orderText(text)),
            this.#hear(link, STATE_TOPIC, text => this.#stateText(text)),
            this.#hear(link, ROUTE_TOPIC, text => this.#routeText(text)),
            this.#hear(link, ROUTE_ASK_TOPIC, text => this.#routeAskText(text)),
            this.#hear(link, ANSWER_TOPIC, text => this.#answerText(text)),
        ]
        this.#link = link
        this.#participation = new ParticipationReceiver(link, game, options.timer)
        this.#participation.faulted.add(fault => this.faulted.notify(fault))
        this.#participation.ended.add(fault => this.ended.notify(fault))
    }


    /** Say it takes part, once everything it is told is listened to. */
    public join(options?: SettingValues): void {
        this.#participation?.join(options)
    }

    public quit(): void {
        this.#participation?.quit()
    }

    /** An instance is shown to this client, or owned by it, or told again with other `info`. */
    public receiveOpen(kind: AnyKind, message: OpenMessage): void {
        if(this.#isDisposed) return
        const known = this.#instances.get(message.id)
        if(known){
            known.info = decodeShareable(message.info, id => this.#memberOf(id))
            this.#show(known)
            return
        }
        let engine: Engine
        let channel: HeardChannel
        try {
            const spec = decodeShareable(message.spec, id => this.#memberOf(id))
            if(message.own) [engine, channel] = kind.create(this.#owner, spec, this.#toManager(message.id))
            else {
                // Only the owner makes the real one with the mode: the others hold a replica the game makes.
                engine = kind.replica(spec, error => this.options.report(String(error)))
                channel = NO_HEARD
            }
        } catch(error){
            this.faulted.notify(new UnloadableFault(kind.open.name, detailOf(error)))
            return
        }
        const instance: GuestInstance = {
            id: message.id, kind, engine, channel, own: message.own,
            info: decodeShareable(message.info, id => this.#memberOf(id)), spectator: null, down: null, up: null,
            upSender: null,
        }
        // A replica listens before the manager gives it what it holds.
        if(!message.own){
            const source: SyncSource = instanceTopic(message.id).source(this.#streamOf(message.id))
            instance.down = kind.receive(
                engine, source, fault => this.faulted.notify(fault), text => this.options.report(text),
            )
        }
        this.#instances.set(message.id, instance)
        this.#show(instance)
    }

    /** An instance is over for this client. */
    public receiveClose(id: number): void {
        const instance = this.#instances.get(id)
        if(!instance) return
        this.#instances.delete(id)
        instance.down?.dispose()
        instance.up?.dispose()
        instance.spectator?.remove()
    }

    /**
     * Someone follows an instance this client owns: tell what it plays, or tell it again for the one that
     * comes. A message told again is one the others have taken in already.
     */
    public receiveFollow(id: number): void {
        const instance = this.#instances.get(id)
        if(!instance || !instance.own) return
        if(instance.up){
            instance.upSender?.greet()
            return
        }
        const sender = new UpSender(message => this.seat.up(id, message))
        instance.upSender = sender
        instance.up = instance.kind.broadcast(instance.engine, sender)
        sender.greet()
    }

    /** Nobody follows an instance this client owns any more. */
    public receiveUnfollow(id: number): void {
        const instance = this.#instances.get(id)
        instance?.up?.dispose()
        if(instance){
            instance.up = null
            instance.upSender = null
        }
    }

    /** What the manager tells of an instance this client follows, when the manager is on this client. */
    public receiveStream(id: number, text: string): void {
        for(const handler of [...(this.#streams.get(id) ?? [])]) handler(text)
    }

    /** The manager said something to this client. */
    public receiveOrder(order: unknown): void {
        if(this.#isDisposed) return
        this.#guard("order", () => this.#owner.onOrder?.(decodeShareable(order, id => this.#memberOf(id))))
    }

    /** A published state is told, which is not told again while it does not change. */
    public receiveState(key: string, value: unknown): void {
        if(this.#isDisposed) return
        const text = JSON.stringify(value ?? null)
        if(this.#states.get(key) === text) return
        if(value === null || value === undefined) this.#states.delete(key)
        else this.#states.set(key, text)
        this.#guard("state", () => this.#owner.onState?.(key, decodeShareable(value, id => this.#memberOf(id))))
    }

    /** What a controller says on an instance this client owns, passed on by the manager. */
    public receiveRoute(message: RouteMessage): void {
        const instance = this.#instances.get(message.id)
        if(!instance || !instance.own || this.#isDisposed) return
        this.#guardHeard(instance.channel, this.#heard(message))
    }

    /** What a controller asks on an instance this client owns, or the manager asks this client, by the manager. */
    public receiveRouteAsk(message: RouteAskMessage): void {
        if(this.#isDisposed) return
        let answer: unknown
        try {
            if(message.id === 0){
                answer = this.#owner.onAsk
                    ? this.#owner.onAsk(decodeShareable(message.message, id => this.#memberOf(id)))
                    : new NoAnswerFault("nobody listens")
            } else {
                const instance = this.#instances.get(message.id)
                if(!instance || !instance.own) return
                answer = instance.channel.ask(this.#heard(message))
            }
        } catch(error){
            this.faulted.notify(new UnloadableFault("ask", detailOf(error), this.id))
        }
        const given = (value: unknown): unknown => value instanceof NoAnswerFault ? null : (value ?? null)
        Promise.resolve(answer).then(
            value => this.seat.reply(write({ req: message.req, value: encodeShareable(given(value) as GameModeShareable) })),
            () => this.seat.reply(write({ req: message.req, value: null })),
        )
    }

    /** What this client asked is answered. */
    public receiveAnswer(message: AnswerMessage): void {
        const resolve = this.#asks.get(message.req)
        if(!resolve) return
        this.#asks.delete(message.req)
        resolve(
            message.fault === null
                ? decodeShareable(message.value, id => this.#memberOf(id))
                : new NoAnswerFault(message.fault, "unreachable"),
        )
    }

    public dispose(): void {
        this.#isDisposed = true
        for(const handle of this.#handles) handle.remove()
        this.#participation?.dispose()
        const instances = [...this.#instances.values()]
        this.#instances.clear()
        for(const resolve of this.#asks.values()) resolve(new NoAnswerFault("the game is over", "unreachable"))
        this.#asks.clear()
        // What was shown to the player is taken off its screen.
        for(const instance of instances){
            instance.down?.dispose()
            instance.up?.dispose()
            instance.spectator?.remove()
        }
    }


    #handles: readonly Removable[] = []
    #link: SyncLink|null = null

    /** Who hears what the manager tells of an instance, when it is on this client: by the instance. */
    readonly #streams = new Map<number, Set<(text: string) => void>>()

    /** What the manager tells of an instance, from the link to it, or from its calls when it is here. */
    #streamOf(id: number): SyncSource {
        const link = this.#link
        if(link) return link
        return {
            listen: handler => {
                let handlers = this.#streams.get(id)
                if(!handlers) this.#streams.set(id, handlers = new Set())
                handlers.add(handler)
                return { remove: () => void handlers.delete(handler) }
            },
        }
    }
    #participation: ParticipationReceiver|null = null
    readonly #instances = new Map<number, GuestInstance>()
    readonly #states = new Map<string, string>()
    readonly #owner: GameModeOwner
    readonly #asks = new Map<number, (answer: unknown) => void>()
    #nextReq = 1
    readonly #names = new Map<string, string>()
    #isDisposed = false

    #hear(link: SyncLink, topic: { link(link: SyncLink): SyncLink }, handler: (text: string) => void) {
        return topic.link(link).listen(handler)
    }

    /** What an instance (or the manager itself, with id 0) is told by: it is passed on to the manager. */
    #toManager(id: number): HandleChannel {
        return {
            notify: message => this.seat.act(write({ id, message: encodeShareable(message) })),
            ask: (message, timeoutMs) => new Promise(resolve => {
                const req = this.#nextReq++
                // The timer goes with the ask, whether it is answered or the game ends first.
                const timer = timeoutMs !== undefined ? this.options.timer?.after(timeoutMs, () => {
                    if(this.#asks.delete(req)) resolve(new NoAnswerFault("too slow", "timeout"))
                }) : undefined
                this.#asks.set(req, answer => {
                    timer?.cancel()
                    resolve(answer)
                })
                this.seat.ask(write({ id, req, message: encodeShareable(message) }))
            }),
        }
    }

    /** A member as this client knows it: no more than what the manager said of it. */
    #memberOf(id: string): GameMember {
        return { id, name: this.#names.get(id) ?? id, connected: true, options: {} }
    }

    #heard(message: RouteMessage): Heard {
        if(message.from !== null) this.#names.set(message.from, message.name ?? message.from)
        const info = decodeShareable(message.info, id => this.#memberOf(id))
        const said = decodeShareable(message.message, id => this.#memberOf(id))
        return new Heard(message.from === null ? null : this.#memberOf(message.from), info, said)
    }

    /** Run something of the mode, which never throws: what the mode does wrong is a fault. */
    #guard(what: string, task: () => void): void {
        try {
            task()
        } catch(error){
            this.faulted.notify(new UnloadableFault(what, detailOf(error), this.id))
        }
    }

    #guardHeard(channel: HeardChannel, heard: Heard): void {
        this.#guard("act", () => void channel.notify(heard))
    }

    #show(instance: GuestInstance): void {
        const { engine, info, own } = instance
        const given = (info as { units?: unknown }|null)?.units
        const units = Array.isArray(given) ? given.filter((unit): unit is string => typeof unit === "string") : []
        // A follower that plays says its plans as the intent of its instance, which the owner takes in.
        const ready = own || units.length === 0 ? undefined : () => this.#ready(instance, units)
        const controlled = info !== null
        const say = controlled ? (message: GameModeShareable): void => void this.#toManager(instance.id).notify(message) : undefined
        const view: InstanceView<Engine> = { engine, own, me: this.id, info, units, say, ready }
        // Shown again when what the client was given changes: the mode updates what it shows, and `dispose`
        // of the last it returned is called once, when the instance is gone for this client.
        this.#guard("show", () => {
            instance.spectator = instance.kind.spectate(this.#owner, view)
        })
    }

    /** Say the plans committed for these units of the battle of an instance: this client is ready. */
    #ready(instance: GuestInstance, units: readonly string[]): void {
        const battle = instance.kind.battleOf(instance.engine)
        if(!battle) return
        const link = {
            send: (text: string) => this.#toManager(instance.id).notify(JSON.parse(text)),
            listen: () => ({ remove: () => {} }),
        }
        const guest = new BattleGuest(battle, link, () => units)
        guest.faulted.add(fault => this.faulted.notify(fault))
        guest.ready()
    }

    #openText(kind: AnyKind, topic: typeof OPEN_RUN_TOPIC, text: string): void {
        const message = readOpenMessage(topic, text)
        if(message instanceof UnreadableFault) this.faulted.notify(message)
        else this.receiveOpen(kind, message)
    }

    #idText(topic: typeof CLOSE_TOPIC, text: string, then: (id: number) => void): void {
        const message = readIdMessage(topic, text)
        if(message instanceof UnreadableFault) this.faulted.notify(message)
        else then(message.id)
    }

    #orderText(text: string): void {
        const message = readOrderMessage(text)
        if(message instanceof UnreadableFault) this.faulted.notify(message)
        else this.receiveOrder(message.order)
    }

    #stateText(text: string): void {
        const message = readStateMessage(text)
        if(message instanceof UnreadableFault) this.faulted.notify(message)
        else this.receiveState(message.key, message.value)
    }

    #routeText(text: string): void {
        const message = readRouteMessage(text)
        if(message instanceof UnreadableFault) this.faulted.notify(message)
        else this.receiveRoute(message)
    }

    #routeAskText(text: string): void {
        const message = readRouteAskMessage(text)
        if(message instanceof UnreadableFault) this.faulted.notify(message)
        else this.receiveRouteAsk(message)
    }

    #answerText(text: string): void {
        const message = readAnswerMessage(text)
        if(message instanceof UnreadableFault) this.faulted.notify(message)
        else this.receiveAnswer(message)
    }
}

/** A guest of a manager far away. */
export function remoteGuest(
    mode: GameMode, values: Values, link: SyncLink, id: string, game: number, options: GuestOptions,
): GameModeGuest {
    return new GameModeGuest(mode, values, new RemoteSeat(link), options, link, id, game)
}
