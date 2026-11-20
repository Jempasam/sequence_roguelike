import type { Fault } from "../../../../engine/net/Fault"
import type { TimerPort } from "../../../../platform"
import { signal, UnloadableFault, UnreadableFault } from "../faults"
import type { ModeRun } from "../lobby/LobbyMode"
import type { SettingValues } from "../lobby/Setting"
import { ParticipationReceiver } from "../participation/ParticipationReceiver"
import { detailOf } from "../read"
import type { SyncLink, SyncSender, SyncSource } from "../SyncChannel"

import type { GameMode, Me, GameMember } from "./GameMode"
import { ANY_BATTLE, ANY_RUN } from "./kinds"
import type { AnyKind, Engine } from "./kinds"
import {
    CLOSE_TOPIC, FOLLOW_TOPIC, instanceTopic, OPEN_BATTLE_TOPIC, OPEN_RUN_TOPIC, ORDER_TOPIC, readIdMessage,
    readOpenMessage, readOrderMessage, readRouteMessage, readStateMessage, ROUTE_TOPIC, STATE_TOPIC,
    UNFOLLOW_TOPIC, write,
} from "./messages"
import type { OpenMessage, RouteMessage } from "./messages"
import type { Seat } from "./Seat"
import { RemoteSeat } from "./Seat"

/** What a client needs of its surroundings, which the mode knows nothing of. */
export interface GuestOptions {
    /** Where time goes, none for a client that says it joins once and never again. */
    readonly timer: TimerPort|null

    /** Tell the player something went wrong, which does not stop the game. */
    report(text: string): void
}

/** An instance as a client holds it. */
interface GuestInstance {
    readonly id: number
    readonly kind: AnyKind
    readonly engine: Engine

    /** Does this client own it? */
    readonly own: boolean

    /** Is the engine the manager's, on this very client? */
    readonly shared: boolean

    info: unknown

    /** What takes in what the manager tells of it, for a replica. */
    down: { dispose(): void }|null

    /** What tells the manager what it plays, when its owner is this client and someone follows. */
    up: { dispose(): void }|null
}

/** A sender to the manager, which greets it at once with what it was asked to say first. */
class UpSender implements SyncSender {


    constructor(
        private readonly send_: (message: string) => void,
    ){}


    public send(message: string): void {
        this.send_(message)
    }

    public onPeer(initial: () => string|null): { dispose(): void } {
        const entry = { initial }
        this.#entries.add(entry)
        return { dispose: () => this.#entries.delete(entry) }
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
 * The code of a game on a player's client: the instances the manager shows to it or has it own, what it is
 * told, and
 * the way back to the manager. It is the same code whether the manager is far away or on this client.
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

    /** What this player is to its mode. */
    public readonly me: Me

    constructor(
        private readonly mode: GameMode,
        private readonly seat: Seat,
        private readonly options: GuestOptions,

        /** The way to the manager, none when it is on this client. */
        link: SyncLink|null,

        /** What the manager knows this client by. */
        public readonly id: string,

        /** The number of the game, which what the manager says is told apart by. */
        game: number,
    ){
        this.me = {
            id,
            tellManager: message => this.seat.tell(write({ message })),
            intent: (instance, intent) => {
                const found = [...this.#instances.values()].find(each => each.engine === instance)
                if(found) this.seat.intent(write({ id: found.id, intent }))
            },
        }
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

    /** The engine of an instance, none when it is not there. */
    public engineOf(id: number): Engine|null {
        return this.#instances.get(id)?.engine ?? null
    }

    /**
     * An instance is shown to this client, or owned by it, or told again with other `info`.
     *
     * @param shared - The engine of the manager, when it is on this client: none to make one from the spec.
     */
    public receiveOpen(kind: AnyKind, message: OpenMessage, shared: Engine|null): void {
        if(this.#isDisposed) return
        const known = this.#instances.get(message.id)
        if(known){
            known.info = message.info
            this.#show(known)
            return
        }
        let engine: Engine
        try {
            engine = shared ?? kind.create(this.mode, message.spec)
        } catch(error){
            this.faulted.notify(new UnloadableFault(kind.open.name, detailOf(error)))
            return
        }
        const instance: GuestInstance = {
            id: message.id, kind, engine, own: message.own, shared: shared !== null, info: message.info,
            down: null, up: null,
        }
        // A replica listens before the manager gives it what it holds.
        if(!shared && !message.own && this.#link){
            const source: SyncSource = instanceTopic(message.id).source(this.#link)
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
        this.mode.onHide?.(this.me, instance.engine)
    }

    /** Someone follows an instance this client owns: tell what it plays. */
    public receiveFollow(id: number): void {
        const instance = this.#instances.get(id)
        if(!instance || !instance.own || instance.shared || instance.up) return
        const sender = new UpSender(message => this.seat.up(id, message))
        instance.up = instance.kind.broadcast(instance.engine, sender)
        sender.greet()
    }

    /** Nobody follows an instance this client owns any more. */
    public receiveUnfollow(id: number): void {
        const instance = this.#instances.get(id)
        instance?.up?.dispose()
        if(instance) instance.up = null
    }

    /** Something happened, told by the manager. */
    public receiveOrder(order: unknown): void {
        if(!this.#isDisposed) this.mode.onOrder?.(this.me, order)
    }

    /** A state is told, which is not told again while it does not change. */
    public receiveState(key: string, value: unknown): void {
        if(this.#isDisposed) return
        const text = JSON.stringify(value ?? null)
        if(this.#states.get(key) === text) return
        if(value === null) this.#states.delete(key)
        else this.#states.set(key, text)
        this.mode.onState?.(this.me, key, value)
    }

    /** What a controller wants done on an instance this client owns, passed on by the manager. */
    public receiveRoute(message: RouteMessage): void {
        const instance = this.#instances.get(message.id)
        if(!instance || !instance.own || this.#isDisposed) return
        const from: GameMember = {
            id: message.from, name: message.name, presence: "player", connected: true, options: {},
        }
        try {
            instance.kind.resolve(this.mode, from, message.info, instance.engine, message.intent)
        } catch(error){
            this.faulted.notify(new UnloadableFault("route", detailOf(error), message.from))
        }
    }

    public dispose(): void {
        this.#isDisposed = true
        for(const handle of this.#handles) handle.dispose()
        this.#participation?.dispose()
        const instances = [...this.#instances.values()]
        this.#instances.clear()
        this.#states.clear()
        // What was shown to the player is taken off its screen.
        for(const instance of instances){
            instance.down?.dispose()
            instance.up?.dispose()
            this.mode.onHide?.(this.me, instance.engine)
        }
    }


    #handles: readonly { dispose(): void }[] = []
    #link: SyncLink|null = null
    #participation: ParticipationReceiver|null = null
    readonly #instances = new Map<number, GuestInstance>()
    readonly #states = new Map<string, string>()
    #isDisposed = false

    #hear(link: SyncLink, topic: { link(link: SyncLink): SyncLink }, handler: (text: string) => void) {
        return topic.link(link).listen(handler)
    }

    #show(instance: GuestInstance): void {
        try {
            instance.kind.show(this.mode, this.me, instance.engine, instance.info)
        } catch(error){
            this.faulted.notify(new UnloadableFault(instance.kind.open.name, detailOf(error)))
        }
    }

    #openText(kind: AnyKind, topic: typeof OPEN_RUN_TOPIC, text: string): void {
        const message = readOpenMessage(topic, text)
        if(message instanceof UnreadableFault) this.faulted.notify(message)
        else this.receiveOpen(kind, message, null)
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
}

/** A guest of a manager far away. */
export function remoteGuest(
    mode: GameMode, link: SyncLink, id: string, game: number, options: GuestOptions,
): GameModeGuest {
    return new GameModeGuest(mode, new RemoteSeat(link), options, link, id, game)
}
