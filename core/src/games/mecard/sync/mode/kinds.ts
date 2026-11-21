import type { Fault } from "../../../../engine/net/Fault"
import type { Battle } from "../../sim/battle/Battle"
import { Run } from "../../sim/run/Run"
import { loadBattle } from "../../sim/save/battleSave"
import type { BattleSave } from "../../sim/save/battleSave"

import { BattleBroadcaster } from "../battle/BattleBroadcaster"
import { BattleReceiver } from "../battle/BattleReceiver"
import { RunBroadcaster } from "../run/RunBroadcaster"
import { RunReceiver } from "../run/RunReceiver"
import type { SyncSender, SyncSource, SyncTopic } from "../SyncChannel"

import type { GameModeOwner, InstanceView } from "../../sim/mode/GameMode"
import type { GameModeShareable } from "../../sim/mode/GameModeShareable"
import type { HandleChannel, HeardChannel } from "../../sim/mode/HandleChannel"
import { OPEN_BATTLE_TOPIC, OPEN_RUN_TOPIC } from "./messages"
import type { Removable } from "../../../../lifetime"

/** What the runner needs to know of an instance that is a run or a battle, and nothing else. */
export interface InstanceKind<E extends Run|Battle> {
    /** What an instance of this kind is opened by. */
    readonly open: SyncTopic

    /** Make one from its spec: the mode speaks to the manager by `manager`. */
    create(owner: GameModeOwner, spec: GameModeShareable, manager: HandleChannel): [E, HeardChannel]

    /**
     * Make the replica a client that follows holds, from the same spec: the game does it, the mode makes
     * nothing but the real one, on the client of the owner.
     */
    replica(spec: GameModeShareable, report: (error: unknown) => void): E

    /** Show it to the player, which the mode does by its screen: `null` when the mode shows no such thing. */
    spectate(owner: GameModeOwner, view: InstanceView<E>): Removable|null

    /** The battle a player of it plans, none when there is none now. */
    battleOf(engine: E): Battle|null

    /** Tell what happens to it. */
    broadcast(engine: E, sender: SyncSender): { dispose(): void }

    /** Take in what is told of it, from a source: what could not be taken in goes to `faulted`. */
    receive(engine: E, source: SyncSource, faulted: (fault: Fault) => void, desync: (text: string) => void): {
        dispose(): void
    }
}

/** The mode made nothing of what it was asked: it never says it opens such an instance. */
function noInstance(kind: string): never {
    throw new Error(`the mode makes no ${kind}`)
}

/** The run, with its travel and its battles. */
export const RUN_KIND: InstanceKind<Run> = {
    open: OPEN_RUN_TOPIC,
    create: (owner, spec, manager) => owner.createRun?.(spec, manager) ?? noInstance("run"),
    // A run that is only followed starts bare, from the seed of its spec: what it holds is told by its owner.
    replica: (spec, report) => new Run((spec as { seed?: unknown }|null)?.seed as number ?? 0, report),
    spectate: (owner, view) => owner.spectateRun?.(view) ?? null,
    battleOf: engine => engine.battle,
    broadcast: (engine, sender) => new RunBroadcaster(engine, sender),
    receive: (engine, source, faulted, desync) => {
        const receiver = new RunReceiver(engine, source)
        receiver.faulted.add(faulted)
        receiver.battle.desynced.add(({ round }) => desync(`Désynchronisé au round ${round} : rattrapé.`))
        receiver.travel.desynced.add(() => desync("Désynchronisé sur la carte : rattrapé."))
        return receiver
    },
}

/** The battle alone. */
export const BATTLE_KIND: InstanceKind<Battle> = {
    open: OPEN_BATTLE_TOPIC,
    create: (owner, spec, manager) => owner.createBattle?.(spec, manager) ?? noInstance("battle"),
    // A battle is loaded from its save, which is what every spec of a battle is.
    replica: spec => loadBattle(spec as unknown as BattleSave),
    spectate: (owner, view) => owner.spectateBattle?.(view) ?? null,
    battleOf: engine => engine,
    broadcast: (engine, sender) => new BattleBroadcaster(engine, sender),
    receive: (engine, source, faulted, desync) => {
        const receiver = new BattleReceiver(engine, source)
        receiver.faulted.add(faulted)
        receiver.desynced.add(({ round }) => desync(`Désynchronisé au round ${round} : rattrapé.`))
        return receiver
    },
}

/** Either engine. */
export type Engine = Run|Battle

/**
 * Either kind, as the runner holds it: it never reads what the engine is, and hands each kind the engine it
 * made.
 */
export type AnyKind = InstanceKind<Engine>

/** The kind of the runs, as the runner holds it. */
export const ANY_RUN = RUN_KIND as unknown as AnyKind

/** The kind of the battles, as the runner holds it. */
export const ANY_BATTLE = BATTLE_KIND as unknown as AnyKind
