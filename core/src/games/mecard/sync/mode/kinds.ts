import type { Fault } from "../../../../engine/net/Fault"
import type { Battle } from "../../sim/battle/Battle"
import type { Run } from "../../sim/run/Run"

import { BattleBroadcaster } from "../battle/BattleBroadcaster"
import { BattleReceiver } from "../battle/BattleReceiver"
import { RunBroadcaster } from "../run/RunBroadcaster"
import { RunReceiver } from "../run/RunReceiver"
import type { SyncSender, SyncSource, SyncTopic } from "../SyncChannel"

import type { GameMode, Me, GameMember } from "./GameMode"
import { OPEN_BATTLE_TOPIC, OPEN_RUN_TOPIC } from "./messages"

/** What the runner needs to know of an instance that is a run or a battle, and nothing else. */
export interface InstanceKind<E extends Run|Battle> {
    /** What an instance of this kind is opened by. */
    readonly open: SyncTopic

    /** Make one from its spec, by the mode. */
    create(mode: GameMode, spec: unknown): E

    /** Tell what happens to it. */
    broadcast(engine: E, sender: SyncSender): { dispose(): void }

    /** Take in what is told of it, from a source: what could not be taken in goes to `faulted`. */
    receive(engine: E, source: SyncSource, faulted: (fault: Fault) => void, desync: (text: string) => void): {
        dispose(): void
    }

    /** Show it to a player. */
    show(mode: GameMode, me: Me, engine: E, info: unknown): void

    /** Do what a controller wants on it. */
    resolve(mode: GameMode, from: GameMember, info: unknown, engine: E, intent: unknown): boolean
}

/** The run, with its travel and its battles. */
export const RUN_KIND: InstanceKind<Run> = {
    open: OPEN_RUN_TOPIC,
    create: (mode, spec) => mode.createRun(spec),
    broadcast: (engine, sender) => new RunBroadcaster(engine, sender),
    receive: (engine, source, faulted, desync) => {
        const receiver = new RunReceiver(engine, source)
        receiver.faulted.add(faulted)
        receiver.battle.onDesync = ({ round }) => desync(`Désynchronisé au round ${round} : rattrapé.`)
        receiver.travel.onDesync = () => desync("Désynchronisé sur la carte : rattrapé.")
        return receiver
    },
    show: (mode, me, engine, info) => mode.onShowRun?.(me, engine, info),
    resolve: (mode, from, info, engine, intent) => mode.onRunIntent?.(from, info, engine, intent) ?? false,
}

/** The battle alone. */
export const BATTLE_KIND: InstanceKind<Battle> = {
    open: OPEN_BATTLE_TOPIC,
    create: (mode, spec) => mode.createBattle(spec),
    broadcast: (engine, sender) => new BattleBroadcaster(engine, sender),
    receive: (engine, source, faulted, desync) => {
        const receiver = new BattleReceiver(engine, source)
        receiver.faulted.add(faulted)
        receiver.onDesync = ({ round }) => desync(`Désynchronisé au round ${round} : rattrapé.`)
        return receiver
    },
    show: (mode, me, engine, info) => mode.onShowBattle?.(me, engine, info),
    resolve: (mode, from, info, engine, intent) => mode.onBattleIntent?.(from, info, engine, intent) ?? false,
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
