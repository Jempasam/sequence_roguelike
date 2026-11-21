import type { Battle } from "../battle/Battle"
import type { Run } from "../run/Run"

import type { Admission } from "./Admission"
import type { GameMember } from "./GameMember"
import type { GameModeContext } from "./GameModeContext"
import type { GameModeShareable } from "./GameModeShareable"
import type { HandleChannel, HeardChannel } from "./HandleChannel"
import type { Setting, SettingValues } from "./Setting"

/**
 * The manager of a game, which decides and never holds an engine.
 *
 * @remarks
 * Everything it is told, it is told once, in order, and one at a time: see MODE.md. Everything but
 * {@link GameModeManager.run} has an empty default.
 */
export interface GameModeManager {
    /** The main sequence of the game. Cancelled when the game ends. */
    run(ctx: GameModeContext): void|Promise<void>

    /** Someone joins: what does it hold? Called once for each join, for those that were there before `run` too. */
    onJoin?(ctx: GameModeContext, who: GameMember): Admission

    /** A member quit the game: once for each join, and only after it. */
    onQuit?(ctx: GameModeContext, who: GameMember): void

    /** A member lost a connection that is caught up when it comes back: a mode may ignore it altogether. */
    onLost?(ctx: GameModeContext, who: GameMember): void

    /** A member whose connection was lost is back. */
    onBack?(ctx: GameModeContext, who: GameMember): void

    /** A client said something to the manager. */
    onMessage?(ctx: GameModeContext, from: GameMember, message: GameModeShareable): void

    /** A client asked something to the manager: what it returns, a value or a promise of it, is the answer. */
    onAsk?(ctx: GameModeContext, from: GameMember, message: GameModeShareable): GameModeShareable|Promise<GameModeShareable>
}

/** What a client holds of an instance: the engine and what it was given with it. */
export interface InstanceView<E extends Run|Battle> {
    /** The engine: the owner's own on its client, a replica on the others. */
    readonly engine: E

    /** Is this client its owner? */
    readonly own: boolean

    /** The id this client goes by. */
    readonly me: string

    /** What the manager gave this client with `control` or `play`, none for one that only watches. */
    readonly info: GameModeShareable

    /** The units the manager gave this client to play, none for one that only watches. */
    readonly units: readonly string[]

    /** Say something to the owner of the instance: only for a client the manager gave the control to. */
    say?(message: GameModeShareable): void

    /**
     * Say the plans committed for `units`: this client is ready. Only for a client that plays, and not its
     * owner, whose engine holds them already.
     */
    ready?(): void
}

/**
 * The client side of a mode: it makes the engines it owns, shows what it follows, and hears the manager.
 * Each client makes its own, so what one keeps is never seen by another by accident.
 */
export interface GameModeOwner {
    // ===== The authority, on the client of the owner of an instance only =====
    //
    // The other clients hold a replica the game makes itself, shown by `spectateRun`/`spectateBattle`.

    /**
     * Make a run from its spec.
     *
     * @param toManager - The way to the manager, which the same client may be.
     * @returns The run, and the channel the controllers speak to it by.
     */
    createRun?(spec: GameModeShareable, toManager: HandleChannel): [Run, HeardChannel]

    /** Make a battle from its spec. */
    createBattle?(spec: GameModeShareable, toManager: HandleChannel): [Battle, HeardChannel]

    // ===== The screen, on every client that follows an instance, its owner included =====

    /** A run is shown to this client: `dispose` when it is gone for it. */
    spectateRun?(view: InstanceView<Run>): { dispose(): void }

    /** A battle is shown to this client: `dispose` when it is gone for it. */
    spectateBattle?(view: InstanceView<Battle>): { dispose(): void }

    // ===== The state and the messages, on every client =====

    /** A published state changed, or is told for the first time: `null` when it is taken back. */
    onState?(key: string, value: GameModeShareable): void

    /** The manager said something to this client. */
    onOrder?(message: GameModeShareable): void

    /** The manager asked something to this client: what it returns, a value or a promise of it, is the answer. */
    onAsk?(message: GameModeShareable): GameModeShareable|Promise<GameModeShareable>
}

/** A kind of game a lobby offers: what a lobby needs to set it, and the way to make each part of it. */
export interface GameMode {
    /** What tells it from the other modes, as the clients are told which was chosen. */
    readonly id: string

    /** What it is called to the players. */
    readonly title: string

    /** What it does, in a sentence or two, as the lobby shows it. */
    readonly description: string

    readonly settings: readonly Setting[]

    /** What each participant sets for itself, which the manager reads in {@link GameMember.options}. */
    readonly participantSettings?: readonly Setting[]

    /** Make the manager of a game. The values fit the settings. */
    manager(values: SettingValues): GameModeManager

    /** Make the client side of a game: `manager` is the way from the client to the manager. */
    owner(values: SettingValues, manager: HandleChannel): GameModeOwner
}
