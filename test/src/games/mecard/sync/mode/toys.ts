import { Run } from "@game/core/mecard"
import type { Battle } from "@game/core/mecard"
import {
    Admissions, gameModeAsLobbyMode, GuestStage, HostStage, LobbyRoom, LocalRoom, LocalSync,
} from "@game/core/mecard/sync"
import type { GameMember, GameMode, GameModeContext, GameModeDef, Me, ModeRun } from "@game/core/mecard/sync"

import { startedRun } from "../../../../fixtures/startedRun"

/** Let what was deferred to the end of the current task happen. */
export async function settle(): Promise<void> {
    for(let turn = 0; turn < 20; turn++) await Promise.resolve()
}

/** A mode with nothing in it but what a test hands it: it keeps what it is told, for the test to read. */
export class Toy implements GameMode {


    public ctx: GameModeContext|null = null
    public readonly shown: { run: Run, info: unknown }[] = []
    public readonly hidden: Run[] = []
    public readonly orders: unknown[] = []
    public readonly states: [string, unknown][] = []
    public readonly told: [string, unknown][] = []
    public readonly intents: [string, unknown, unknown][] = []
    public me: Me|null = null

    constructor(
        private readonly begin: (ctx: GameModeContext) => void,
        private readonly accept: boolean = true,
    ){}


    public run(ctx: GameModeContext): void {
        this.ctx = ctx
        this.begin(ctx)
    }

    public onJoin(): ReturnType<NonNullable<GameMode["onJoin"]>> {
        return this.accept ? Admissions.seat("player") : Admissions.spectate()
    }

    public onTell(_ctx: GameModeContext, from: GameMember, message: unknown): void {
        this.told.push([from.id, message])
    }

    public createRun(spec: unknown): Run {
        if(spec === "boom") throw new Error("No run for this spec.")
        return startedRun(Number(spec))
    }

    public createBattle(): Battle {
        throw new Error("No battle here.")
    }

    public onRunIntent(from: GameMember, info: unknown, _run: Run, intent: unknown): boolean {
        this.intents.push([from.id, info, intent])
        return intent !== "refused"
    }

    public onShowRun(me: Me, run: Run, info: unknown): void {
        this.me = me
        this.shown.push({ run, info })
    }

    public onHide(_me: Me, instance: Run|Battle): void {
        this.hidden.push(instance as Run)
    }

    public onOrder(_me: Me, order: unknown): void {
        this.orders.push(order)
    }

    public onState(_me: Me, key: string, value: unknown): void {
        this.states.push([key, value])
    }
}

/**
 * A game of toys: the manager's mode first, the one of the client that shares it next, then one per client.
 */
export function game(begin: (ctx: GameModeContext) => void) {
    const room = new LocalRoom()
    const channel = new LocalSync()
    const lobby = new LobbyRoom(room)
    const modes: Toy[] = []
    const reports: string[] = []
    const def: GameModeDef = {
        id: "toy",
        title: "Toy",
        settings: [],
        create: () => {
            const mode = new Toy(begin)
            modes.push(mode)
            return mode
        },
    }
    const lobbyMode = gameModeAsLobbyMode(def, {
        timer: { after: () => ({ cancel: () => {} }), now: () => 0 },
        report: text => reports.push(text),
    })
    let host: ModeRun|null = null
    return {
        room,
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
            const mode = modes.length
            const made = lobbyMode.guest(new GuestStage(link, channel, id, 1), {}, "player")
            if("describe" in made) throw new Error(made.describe())
            return { mode: modes[mode], run: made }
        },
        manager: () => modes[0],
        dispose: () => host?.dispose(),
    }
}

