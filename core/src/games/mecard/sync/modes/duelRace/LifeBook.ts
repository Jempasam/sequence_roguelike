import { Fault } from "../../../../../engine/net/Fault"
import type { SyncSender, SyncSource } from "../../SyncChannel"
import { signal } from "../../faults"
import type { LivesView } from "../players/HubPort"
import { LIVES_TOPIC } from "./topics"
import { readLifeMessage, writeLifeMessage } from "./LifeMessage"

/**
 * The lives of the players of a race of duels, which the hub keeps and tells everyone. The simulation knows
 * nothing of them: a life is a rule of the mode.
 *
 * @remarks
 * A player never has fewer than none, and the one that reaches none is eliminated. A player that left is
 * eliminated at once, whatever lives it had. The last one standing is told by {@link LifeBook.settle}, which
 * the hub calls once it applied everything a duel or a round changed: players eliminated together leave no
 * winner, which telling it at each change would give away.
 *
 * It is also the lives a player that plays on the hub reads, as a {@link LivesView}.
 */
export class LifeBook implements LivesView {


    /** Told of each life lost, with the lives left. */
    public readonly lifeLost = signal<{ readonly id: string, readonly left: number }>()

    /** Told of each player whose lives changed, with the lives it has left: a player eliminated has none. */
    public readonly livesChanged = signal<{ readonly id: string, readonly lives: number }>()

    /** Told of each player that is out. */
    public readonly eliminated = signal<string>()

    /** Told once, by {@link LifeBook.settle}, of the only player left, when there is one. */
    public readonly lastStanding = signal<string>()

    constructor(
        ids: readonly string[],
        lives: number,
        sender: SyncSender,
    ){
        for(const id of ids) this.#lives.set(id, lives)
        this.#count = ids.length
        this.#sender = LIVES_TOPIC.sender(sender)
        this.#handle = this.#sender.onPeer(() => this.#message())
    }


    /** The lives a player has left, none for one that is not playing. */
    public livesOf(id: string): number {
        return this.#lives.get(id) ?? 0
    }

    /** Is a player still in? */
    public isAlive(id: string): boolean {
        return this.livesOf(id) > 0
    }

    /** The players still in, in the order they were given. */
    public alive(): string[] {
        return [...this.#lives].filter(([, lives]) => lives > 0).map(([id]) => id)
    }

    /** A player loses a life, and is eliminated at the last one. A player that is out loses nothing more. */
    public lose(id: string): void {
        const lives = this.#lives.get(id)
        if(lives === undefined || lives <= 0) return
        this.#lives.set(id, lives - 1)
        this.lifeLost.notify({ id, left: lives - 1 })
        this.livesChanged.notify({ id, lives: lives - 1 })
        if(lives - 1 === 0) this.eliminated.notify(id)
        this.#sender.send(this.#message())
    }

    /** A player is out, whatever lives it has left. */
    public eliminate(id: string): void {
        const lives = this.#lives.get(id)
        if(lives === undefined || lives <= 0) return
        this.#lives.set(id, 0)
        this.livesChanged.notify({ id, lives: 0 })
        this.eliminated.notify(id)
        this.#sender.send(this.#message())
    }

    /** Tell who is the last one standing, when only one is, after everything a round changed was applied. */
    public settle(): void {
        const alive = this.alive()
        if(alive.length === 1 && this.#count > 1) this.lastStanding.notify(alive[0])
    }

    /** Stop telling. */
    public dispose(): void {
        this.#handle.dispose()
    }


    readonly #lives = new Map<string, number>()
    readonly #count: number
    readonly #sender: SyncSender
    readonly #handle: { dispose(): void }

    #message(): string {
        return writeLifeMessage({ lives: Object.fromEntries(this.#lives) })
    }
}

/**
 * The lives as a player hears them: told of each life lost and of each player eliminated, from the state the
 * hub sends, which is told again when a connection comes back and changes nothing then.
 */
export class LivesReceiver implements LivesView {


    /** Told of each player whose lives changed, with the lives it has left. */
    public readonly livesChanged = signal<{ readonly id: string, readonly lives: number }>()

    /** Told of each player that is out. */
    public readonly eliminated = signal<string>()

    /** Told of a message that could not be read: it is left out. */
    public readonly faulted = signal<Fault>()

    constructor(source: SyncSource){
        this.#listening = LIVES_TOPIC.source(source).listen(text => this.#told(text))
    }


    /** The lives of a player as last heard, none for one not heard of. */
    public livesOf(id: string): number|null {
        return this.#lives.get(id) ?? null
    }

    /** The players heard of that still have lives. */
    public alive(): string[] {
        return [...this.#lives].filter(([, lives]) => lives > 0).map(([id]) => id)
    }

    /** Stop listening. */
    public dispose(): void {
        this.#listening.dispose()
    }


    readonly #listening: { dispose(): void }
    readonly #lives = new Map<string, number>()

    #told(text: string): void {
        const message = readLifeMessage(text)
        if(message instanceof Fault){
            this.faulted.notify(message)
            return
        }
        for(const [id, lives] of Object.entries(message.lives)){
            const before = this.#lives.get(id)
            if(before === lives) continue
            this.#lives.set(id, lives)
            this.livesChanged.notify({ id, lives })
            if(lives <= 0 && (before === undefined || before > 0)) this.eliminated.notify(id)
        }
    }
}
