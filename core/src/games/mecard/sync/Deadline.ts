import type { Cancel, TimerPort } from "../../../platform"
import { Fault } from "../../../engine/net/Fault"
import { DEADLINE_EXPIRED_TOPIC, DEADLINE_TOPIC } from "./SyncChannel"
import type { SyncSender, SyncSource } from "./SyncChannel"
import { signal, UnreadableFault } from "./faults"
import { readJson, wrongShape } from "./read"
import type { DeadlineView } from "./modes/players/HubPort"

/** What the host tells of a deadline: how long is left, none when there is none. */
interface DeadlineMessage {
    readonly remainingMs: number|null
}

/**
 * A time limit the clients are told of. The host is the authority: it alone decides that it is over, and
 * then tells it, so a client with a late clock never ends it before the others.
 *
 * @remarks
 * A client connecting is told how long is left as it stands then, and one whose connection came back is told
 * again by the same first message. What a client shows of the time left is its own count from there: it is
 * for display, and {@link DeadlineReceiver.expired} is told when the host says so.
 */
export class Deadline implements DeadlineView {


    /** Told, with how long it runs, each time it starts. */
    public readonly started = signal<number>()

    /** Told once the time is over, on the host. */
    public readonly expired = signal<void>()

    constructor(
        private readonly timer: TimerPort,
        sender: SyncSender,
    ){
        this.#remaining = DEADLINE_TOPIC.sender(sender)
        this.#over = DEADLINE_EXPIRED_TOPIC.sender(sender)
        this.#handle = this.#remaining.onPeer(() => this.#message())
    }


    /** Is it running? */
    public get isRunning(): boolean { return this.#end !== null }

    /** How long is left, in milliseconds, none when it is not running. */
    public remaining(): number|null {
        return this.#end === null ? null : Math.max(0, this.#end - this.timer.now())
    }

    /** Run it for this long, in place of what ran. */
    public start(ms: number): void {
        this.#wait?.cancel()
        this.#end = this.timer.now() + ms
        this.#wait = this.timer.after(ms, () => this.#finish())
        this.#remaining.send(this.#message())
        this.started.notify(ms)
    }

    /** Stop it without it coming. */
    public cancel(): void {
        if(this.#end === null) return
        this.#wait?.cancel()
        this.#wait = null
        this.#end = null
        this.#remaining.send(this.#message())
    }

    /** Stop for good. */
    public dispose(): void {
        this.#wait?.cancel()
        this.#handle.dispose()
    }


    readonly #remaining: SyncSender
    readonly #over: SyncSender
    readonly #handle: { dispose(): void }
    #end: number|null = null
    #wait: Cancel|null = null

    #message(): string {
        const message: DeadlineMessage = { remainingMs: this.remaining() }
        return JSON.stringify(message)
    }

    #finish(): void {
        this.#wait = null
        this.#end = null
        this.#over.send("")
        this.expired.notify()
    }
}

/**
 * The time limit as a client hears it: how long is left, for display, and its end when the host says it came.
 */
export class DeadlineReceiver implements DeadlineView {


    /** Told, with how long is left, each time the host says it runs. */
    public readonly started = signal<number>()

    /** Told once the host says the time is over. */
    public readonly expired = signal<void>()

    /** Told of a message that could not be read: it is left out. */
    public readonly faulted = signal<Fault>()

    constructor(
        private readonly timer: TimerPort,
        source: SyncSource,
    ){
        this.#listening = [
            DEADLINE_TOPIC.source(source).listen(text => this.#told(text)),
            DEADLINE_EXPIRED_TOPIC.source(source).listen(() => {
                this.#end = null
                this.expired.notify()
            }),
        ]
    }


    /** How long is left by this client's own count, in milliseconds, none when nothing runs. */
    public remaining(): number|null {
        return this.#end === null ? null : Math.max(0, this.#end - this.timer.now())
    }

    /** Stop listening. */
    public dispose(): void {
        for(const handle of this.#listening) handle.dispose()
    }


    readonly #listening: readonly { dispose(): void }[]
    #end: number|null = null

    #told(text: string): void {
        const message = readJson(DEADLINE_TOPIC.name, text) as Partial<DeadlineMessage>|null|UnreadableFault
        if(message instanceof UnreadableFault){
            this.faulted.notify(message)
            return
        }
        const remaining = message?.remainingMs
        if(remaining !== null && typeof remaining !== "number"){
            this.faulted.notify(wrongShape(DEADLINE_TOPIC.name, text, "message of a deadline"))
            return
        }
        this.#end = remaining === null ? null : this.timer.now() + remaining
        if(remaining !== null) this.started.notify(remaining)
    }
}
