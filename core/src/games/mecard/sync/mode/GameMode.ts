import type { Observable } from "../../sim/base/Observable"
import type { Rng } from "../../sim/base/Rng"
import type { Battle } from "../../sim/battle/Battle"
import type { Run } from "../../sim/run/Run"
import type { Admission } from "../participation/Participation"
import type { Presence } from "../session/Participant"
import type { Setting, SettingValues } from "../lobby/Setting"

/** Someone in the game, as the manager sees it. */
export interface GameMember {
    /** What tells it from the others, the same through a lost connection. */
    readonly id: string

    readonly name: string

    /** Does it play, only watch, or did it leave? */
    readonly presence: Presence

    /** Is its connection up? */
    readonly connected: boolean

    /**
     * What it set for itself when it joined, by the id of each participant setting of the mode: always fits
     * them, the initial values standing for what was missing or wrong.
     */
    readonly options: SettingValues
}

/** What a player of the game is, to its own mode: who it is, and how it talks to the manager. */
export interface Me {
    readonly id: string

    /** Say something to the manager, which the mode hears in {@link GameMode.onTell}. */
    tellManager(message: unknown): void

    /**
     * Say what this player wants done on an instance it controls, which the owner of the instance resolves in
     * {@link GameMode.onRunIntent} or {@link GameMode.onBattleIntent}.
     */
    intent(instance: Run|Battle, intent: unknown): void
}

/** The way to open, show and close the run or the battle of a mode, from the manager. */
export interface InstanceHandle {
    /** The manager reads the instance, which is a copy of its own, or a replica of its owner's. */
    watch(): void

    /** Show the instance to a member, who may not act on it. */
    spectate(who: GameMember): void

    /** Have a member act on the instance too: `info` is given back to every resolution of its intents. */
    control(who: GameMember, info: unknown): void

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

/** A run opened by the manager. */
export interface RunHandle extends InstanceHandle {
    /** The run as the manager has it: its own, a replica once it watches, none otherwise. */
    run(): Run|null
}

/** A battle opened by the manager. */
export interface BattleHandle extends InstanceHandle {
    /** The battle as the manager has it: its own, a replica once it watches, none otherwise. */
    battle(): Battle|null
}

/**
 * What the manager's code of a mode does with the game: everything it may ask of the network, none of it
 * written.
 */
export interface GameModeContext {
    /** Everyone that takes part, players and spectators, those lost included. */
    members(): readonly GameMember[]

    /** Open a run a member owns: it makes it from the spec on its client. */
    openRun(owner: GameMember, spec: unknown): RunHandle

    /** Open a run the manager owns. */
    openManagedRun(spec: unknown): RunHandle

    /** Open a battle a member owns. */
    openBattle(owner: GameMember, spec: unknown): BattleHandle

    /** Open a battle the manager owns. */
    openManagedBattle(spec: unknown): BattleHandle

    /** Tell a member something that happened: an event, which is not told again to one that comes back. */
    order(member: GameMember, order: unknown): void

    /** Publish a state, which whoever arrives or comes back is told as it stands. */
    publish(key: string, value: unknown): void

    /**
     * Publish a state that depends on the time: it is read each time it is sent, to a late client too.
     * Publish it again
     * to tell of a change.
     */
    publishLazy(key: string, value: () => unknown): void

    /** Take a state back. */
    unpublish(key: string): void

    /** How many clients of the lobby the game waits for at its start, the manager's own included. */
    expected(): number

    /** Do something later. Cancelled when the game ends. */
    after(ms: number, task: () => void): { cancel(): void }

    /**
     * Wait until a source tells something the condition accepts. Cancelled when the game ends: it never
     * resolves then.
     */
    until<T>(source: Observable<T>, condition: (value: T) => boolean): Promise<T>

    /** Where the chance of the game comes from. */
    rng(): Rng

    /** Say a line in the chat as the game, never as a player. */
    announce(text: string): void

    /** The game is over. */
    end(): void

    /** Tell of what went wrong, which does not stop the game. */
    report(text: string): void

    /** Told each time a member is given a part. */
    readonly joined: Observable<GameMember>
}

/**
 * What a mode of game does, with no network in it. One object plays each role: the manager's (everything of
 * {@link GameMode.run} and the hooks after it), the owner's of an instance, and the player's. Each client
 * makes its
 * own, so what one keeps is never seen by another by accident.
 *
 * @remarks
 * Specs, orders, states and intents are JSON the mode reads itself. Everything but {@link GameMode.run},
 * {@link GameMode.createRun} and {@link GameMode.createBattle} has an empty default.
 */
export interface GameMode {
    // ===== The manager =====

    /**
     * The main sequence of the game, told of nothing but what the context says. Cancelled when the game
     * ends.
     */
    run(ctx: GameModeContext): void|Promise<void>

    /** Someone asks to take part, or to again: what does it hold? */
    onJoin?(ctx: GameModeContext, who: GameMember): Admission

    /** A member lost its connection, or left the game: `gone` when it will not come back. */
    onLeave?(ctx: GameModeContext, who: GameMember, gone: boolean): void

    /** A member whose connection was lost is back. */
    onBack?(ctx: GameModeContext, who: GameMember): void

    /** A member told the manager something. */
    onTell?(ctx: GameModeContext, from: GameMember, message: unknown): void

    // ===== The owner of an instance, and its replicas =====

    /** Make a run from its spec: on the client of its owner, and on each that follows it. */
    createRun(spec: unknown): Run

    /** Make a battle from its spec: on the client of its owner, and on each that follows it. */
    createBattle(spec: unknown): Battle

    /**
     * Do what a controller wants on a run, or refuse. `info` is what the manager gave it with
     * {@link Handle.control}.
     *
     * @returns Whether it was done.
     */
    onRunIntent?(from: GameMember, info: unknown, run: Run, intent: unknown): boolean

    /** Do what a controller wants on a battle, or refuse. */
    onBattleIntent?(from: GameMember, info: unknown, battle: Battle, intent: unknown): boolean

    // ===== The player =====

    /** A run is shown to this player, or its `info` changed: none for one that only watches. */
    onShowRun?(me: Me, run: Run, info: unknown): void

    /** A battle is shown to this player, or its `info` changed. */
    onShowBattle?(me: Me, battle: Battle, info: unknown): void

    /** An instance was closed or taken away: the screen comes back to where it waits. */
    onHide?(me: Me, instance: Run|Battle): void

    /** The manager told this player something that happened. */
    onOrder?(me: Me, order: unknown): void

    /** A state changed, or is told for the first time, when this player arrives or comes back. */
    onState?(me: Me, key: string, value: unknown): void
}

/**
 * A kind of game a lobby offers: what a lobby needs to set it, and the way to make an object for each role.
 */
export interface GameModeDef {
    /** What tells it from the other modes, as the clients are told which was chosen. */
    readonly id: string

    /** What it is called to the players. */
    readonly title: string

    /** What it does, in a sentence or two, as the lobby shows it. */
    readonly description: string

    readonly settings: readonly Setting[]

    /** What each participant sets for itself, which the manager reads in {@link GameMember.options}. */
    readonly participantSettings?: readonly Setting[]

    /** Make the mode for a game and a role. The values fit the settings. */
    create(values: SettingValues): GameMode
}
