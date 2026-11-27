import { ManualScheduler } from "@game/core-src/engine/net/Scheduler"
import { Run } from "@game/core-src/games/mecard/sim/run/Run"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import { Admissions } from "@game/core-src/games/mecard/sim/mode/Admission"
import { reacting } from "@game/core-src/games/mecard/sim/mode/HandleChannel"
import { LobbyRoom } from "@game/core-src/games/mecard/sync/lobby/LobbyRoom"
import { GuestStage, HostStage } from "@game/core-src/games/mecard/sync/lobby/Stage"
import { gameModeAsLobbyMode } from "@game/core-src/games/mecard/sync/mode/gameModeAsLobbyMode"
import { LocalRoom, LocalSync } from "@game/core-src/games/mecard/sync/SyncChannel"
import type { GameMember } from "@game/core-src/games/mecard/sim/mode/GameMember"
import type {
    GameMode,
    GameModeManager,
    GameModeOwner,
    InstanceView,
} from "@game/core-src/games/mecard/sim/mode/GameMode"
import type { GameModeContext } from "@game/core-src/games/mecard/sim/mode/GameModeContext"
import type { GameModeShareable } from "@game/core-src/games/mecard/sim/mode/GameModeShareable"
import type { HandleChannel, HeardChannel, Heard } from "@game/core-src/games/mecard/sim/mode/HandleChannel"
import type { ModeRun } from "@game/core-src/games/mecard/sync/lobby/LobbyMode"

import { startedRun } from "../../../../fixtures/startedRun"
import type { Removable } from "@game/core-src/lifetime/Removable"

/** Let what was deferred to the end of the current task happen. */
export async function settle(): Promise<void> {
    for(let turn = 0; turn < 20; turn++) await Promise.resolve()
}

/**
 * A mode with nothing in it but what a test hands it: it keeps what it is told, for the test to read. One is
 * made for each role, the manager's first, then the client side of each client in turn.
 */
export class Toy implements GameModeManager, GameModeOwner {


    public ctx: GameModeContext|null = null

    /** What a client says to the manager by: set on the client side. */
    public toManager: HandleChannel|null = null

    /** What the owner of a run says to the manager by, for the run it made last. */
    public toInstance: HandleChannel|null = null
    public readonly shown: { run: Run, info: unknown }[] = []
    public readonly hidden: Run[] = []

    /** The units each run shown was given to play, in order. */
    public readonly units: (readonly string[])[] = []

    /** What the manager said to this client. */
    public readonly orders: unknown[] = []
    public readonly states: [string, unknown][] = []

    /** How many runs this side made with the mode: only the owner of a run does. */
    public made = 0

    /** What the manager was told of the people of the game, in order. */
    public readonly calls: string[] = []

    /** What clients said to the manager, with who said it. */
    public readonly told: [string, unknown][] = []
    public readonly intents: [string, unknown, unknown][] = []

    /** What each run shown lets this client say on it: none while it only follows. */
    readonly #says = new Map<Run, ((message: GameModeShareable) => void)|undefined>()

    constructor(
        private readonly begin: (ctx: GameModeContext, store: GameModeContext) => void,
        private readonly accept: boolean = true,
    ){}


    // ===== The manager =====

    public run(ctx: GameModeContext): void {
        this.ctx = ctx
        this.begin(ctx, ctx)
    }

    public onJoin(_ctx: GameModeContext, who: GameMember): ReturnType<NonNullable<GameModeManager["onJoin"]>> {
        this.calls.push(`join ${who.id}`)
        return this.accept ? Admissions.accept() : Admissions.refuse({ describe: () => "refused", who: null } as never)
    }

    public onQuit(_ctx: GameModeContext, who: GameMember): void {
        this.calls.push(`quit ${who.id}`)
    }

    public onLost(_ctx: GameModeContext, who: GameMember): void {
        this.calls.push(`lost ${who.id}`)
    }

    public onBack(_ctx: GameModeContext, who: GameMember): void {
        this.calls.push(`back ${who.id}`)
    }

    public onMessage(_ctx: GameModeContext, from: GameMember, message: GameModeShareable): void {
        this.told.push([from.id, message])
    }

    // ===== The client side =====

    public createRun(spec: GameModeShareable, manager: HandleChannel): [Run, HeardChannel] {
        if(spec === "boom") throw new Error("No run for this spec.")
        this.made++
        this.toInstance = manager
        // The owner: what a controller says is resolved, a refusal is the word "refused".
        const resolve = ({ from, info, message }: Heard): boolean => {
            this.intents.push([from?.id ?? "", info, message])
            return message !== "refused"
        }
        return [startedRun(Number(spec)), reacting({ act: resolve, ask: resolve })]
    }

    public createBattle(): [Battle, HeardChannel] {
        throw new Error("No battle here.")
    }

    public spectateRun({ engine, info, units, say }: InstanceView<Run>): Removable {
        this.units.push(units)
        this.#says.set(engine, say)
        this.shown.push({ run: engine, info })
        return { remove: () => void this.hidden.push(engine) }
    }

    /** The client answers "ping" with "pong" and anything else with nothing: for the manager's asks. */
    public onAsk = (...args: unknown[]): GameModeShareable => args.length === 1 && args[0] === "ping" ? "pong" : null

    public onState(key: string, value: GameModeShareable): void {
        this.states.push([key, value])
    }

    public onOrder(message: GameModeShareable): void {
        this.orders.push(message)
    }

    /** The player says what it wants done on a run it was shown: nothing is said when it may not act. */
    public intent(run: Run, message: GameModeShareable): void {
        this.#says.get(run)?.(message)
    }
}

/**
 * A game of toys: the manager's mode first, the one of the client that shares it next, then one per client.
 */
export function game(begin: (ctx: GameModeContext, store: GameModeContext) => void) {
    const room = new LocalRoom()
    const channel = new LocalSync()
    const lobby = new LobbyRoom(room)
    const modes: Toy[] = []
    const reports: string[] = []
    const mode: GameMode = {
        id: "toy",
        title: "Toy",
        description: "A mode of toys, for tests.",
        settings: [],
        manager: () => {
            const toy = new Toy(begin)
            modes.push(toy)
            return toy
        },
        owner: (_values, manager) => {
            const toy = new Toy(begin)
            toy.toManager = manager
            modes.push(toy)
            return toy
        },
    }
    const timer = new ManualScheduler()
    const lobbyMode = gameModeAsLobbyMode(mode, { report: text => reports.push(text) }, timer)
    let host: ModeRun|null = null
    return {
        room,
        timer,
        modes,
        reports,
        /** The manager is made, the clients connected before it hear of it once it is there. */
        async start(...early: string[]): Promise<Map<string, ReturnType<typeof room.join>>> {
            const links = new Map<string, ReturnType<typeof room.join>>()
            for(const id of early) links.set(id, room.join(id))
            const stage = new HostStage(lobby, channel, 1)
            const made = lobbyMode.host(stage, {})
            if("describe" in made) throw new Error(made.describe())
            host = made
            await settle()
            return links
        },
        /** A client comes and says it plays: its own mode is the next made. */
        play(id: string, links: Map<string, ReturnType<typeof room.join>>): { mode: Toy, run: ModeRun } {
            const link = links.get(id) ?? room.join(id)
            const index = modes.length
            const made = lobbyMode.guest(new GuestStage(link, channel, id, 1), {}, "player")
            if("describe" in made) throw new Error(made.describe())
            return { mode: modes[index], run: made }
        },
        manager: () => modes[0],
        dispose: () => host?.dispose(),
    }
}
