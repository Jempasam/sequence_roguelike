import type { Observable } from "../base/Observable"
import type { Rng } from "../base/Rng"

import type { GameMember } from "./GameMember"
import type { GameModeShareable } from "./GameModeShareable"
import type { HandleChannel } from "./HandleChannel"

/** The way to open, show and close the run or the battle of a mode, from the manager. */
export interface InstanceHandle extends HandleChannel {
    /** What the owner says to the manager, which it does by the channel it was given when it made it. */
    readonly said: Observable<GameModeShareable>

    /** Show the instance to a member, who may not act on it. */
    spectate(who: GameMember): void

    /** Show the instance to everyone that takes part, now or later, but its owner: none may act on it. */
    spectateAll(): void

    /** Have a member act on the instance too: `info` is given back to every resolution of its intents. */
    control(who: GameMember, info: GameModeShareable): void

    /**
     * Have a member play these units of the battle of the instance, and act on it too: it is shown them, and
     * says the plans committed for them with `ready`. `info` goes with them to `control`, as an object.
     */
    play(who: GameMember, units: readonly string[], info?: { readonly [key: string]: GameModeShareable }): void

    /** Take the control from a member, who goes on following. */
    uncontrol(who: GameMember): void

    /** Take the instance from a member altogether: it is told it is gone. */
    release(who: GameMember): void

    /** Stop the instance for everyone: the handle is not valid any more. */
    close(): void

    /** Is it still there: not closed, and its owner not gone for good? */
    valid(): boolean

    /** Told once when the instance is not valid any more. Calls to the handle then do nothing. */
    readonly invalidated: Observable<void>
}

/** A run opened by the manager: it never holds it, its owner does. */
export type RunHandle = InstanceHandle

/** A battle opened by the manager: it never holds it, its owner does. */
export type BattleHandle = InstanceHandle

/**
 * What the manager of a mode asks of the game: everything, none of it written. It knows no network and no
 * screen, and the same context is given by a network manager and by a local one.
 */
export interface GameModeContext {
    /** Everyone that took part and did not quit, those lost included. */
    members(): readonly GameMember[]

    /** Open a run a member owns: it makes it from the spec on its client. */
    openRun(owner: GameMember, spec: GameModeShareable): RunHandle

    /** Open a battle a member owns. */
    openBattle(owner: GameMember, spec: GameModeShareable): BattleHandle

    /** Publish a state for every client, one that arrives or comes back too, as it stands. */
    publish(key: string, value: GameModeShareable): void

    /**
     * Publish a state that depends on the time: the supplier is read each time it is sent, to a late client
     * too. Publish it again to tell of a change.
     */
    publishLazy(key: string, supplier: () => GameModeShareable): void

    /** Take a state back. */
    unpublish(key: string): void

    /** The way to say something to a member, and to ask it. */
    channel(member: GameMember): HandleChannel

    /** Say something to every member. */
    broadcast(message: GameModeShareable): void

    /** How many clients of the lobby the game waits for at its start, the manager's own included. */
    expected(): number

    /** Do something later. Cancelled when the game ends. */
    after(ms: number, task: () => void): { cancel(): void }

    /** Wait a while. Cancelled when the game ends: it never resolves then. */
    sleep(ms: number): Promise<void>

    /**
     * Wait until a source tells something the condition accepts. Cancelled when the game ends: it never
     * resolves then.
     */
    until<T>(source: Observable<T>, condition: (value: T) => boolean): Promise<T>

    /** The time, in ms, from an origin that does not matter: only what is between two readings does. */
    now(): number

    /** Where the chance of the game comes from. */
    rng(): Rng

    /** Say a line in the chat as the game, never as a player. */
    announce(text: string): void

    /** The game is over. */
    end(): void

    /** Tell of what went wrong, which does not stop the game. */
    report(text: string): void

    /** Told once for each member that joined, right after its `onJoin`. It tells to wait, not to initialize. */
    readonly joined: Observable<GameMember>
}
