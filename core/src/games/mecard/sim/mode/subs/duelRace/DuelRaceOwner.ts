import type { TimerPort } from "../../../../../../platform"
import { Fault } from "../../../../../../engine/net/Fault"
import type { Battle } from "../../../battle/Battle"
import type { FloorType } from "../../../floor/Floor"
import type { Run } from "../../../run/Run"
import { loadBattle } from "../../../save/battleSave"
import type { BattleSave } from "../../../save/battleSave"
import type { GameBench } from "../../GameBench"
import type { GameModeOwner, InstanceView } from "../../GameMode"
import type { GameModeShareable } from "../../GameModeShareable"
import { reacting } from "../../HandleChannel"
import type { HandleChannel, HeardChannel } from "../../HandleChannel"
import { DuelOwner } from "../duel/DuelOwner"
import type { DuelOrder } from "../duel/DuelOwner"

import type { DuelRules } from "./DuelRules"
import { DuelRacePlayer } from "./players/DuelRacePlayer"
import { ModeHub } from "./players/ModeHub"

/** A run played on the screen of a player of a race, by itself: nobody plays it for it. */
export interface RaceScreen {
    /** The run of the player, new, which the screen shows. */
    readonly run: Run

    /**
     * Show the race of a player on the run: its duels fought or watched, the lives of the players, the time
     * left, and who stands where. Does nothing of what the player does: it only shows, and says it is ready.
     */
    follow(player: DuelRacePlayer): void

    /** Take the run off the screen. */
    close(): void
}

/** The race started with the lobby, and this client came when it was on already. */
export class RaceStartedFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "La course a déjà commencé : elle ne se rejoint pas en cours."
    }
}

/** What a race of duels asks of the screen, which it knows nothing of. */
export interface RaceTableBench extends GameBench {
    /** Where time goes: the countdown a player is shown, and the deadlines of the race. */
    readonly timer: TimerPort

    /**
     * Show a new run for a player of a race.
     *
     * @param firstFloor - The floor it starts on, the usual one for none.
     */
    race(firstFloor: FloorType|null): RaceScreen
}

/**
 * The client side of a race of duels: it plays its run, which its screen shows, through a
 * {@link DuelRacePlayer} that reaches the manager through a {@link ModeHub}, and plays the duels it owns.
 */
export class DuelRaceOwner implements GameModeOwner {


    constructor(
        protected readonly rules: DuelRules,
        protected readonly floor: FloorType|null,
        protected readonly bench: RaceTableBench,

        /** The way to the manager. */
        protected readonly manager: HandleChannel,
    ){}


    public createRun(spec?: GameModeShareable): [Run, HeardChannel] {
        const screen = this.bench.race(this.floorFor(spec ?? null))
        this.#screens.set(screen.run, screen)
        this.made(screen.run, spec ?? null)
        return [screen.run, reacting({})]
    }

    /** The floor a run starts on, from the spec it was opened with: the same for everyone by default. */
    protected floorFor(spec: GameModeShareable): FloorType|null {
        void spec
        return this.floor
    }

    /** The rules a player of a run plays by: the same for everyone by default. */
    protected rulesFor(run: Run): DuelRules {
        void run
        return this.rules
    }

    /** A run was made, from the spec it was opened with: nothing is done by default. */
    protected made(run: Run, spec: GameModeShareable): void {
        void run
        void spec
    }

    /** The player of a run was made, before the screen follows it: nothing is done by default. */
    protected joined(player: DuelRacePlayer, run: Run): void {
        void player
        void run
    }

    /** The run is shown to this player: it plays it, which its screen shows. */
    public spectateRun(view: InstanceView<Run>): { dispose(): void } {
        const { engine: run, me } = view
        const screen = this.#screens.get(run)
        if(screen && this.#mine?.run !== run){
            const hub = new ModeHub(this.manager, this.bench.timer)
            // What was told before the run was shown is told now.
            for(const [key, value] of this.#told) hub.state(key, value)
            const player = new DuelRacePlayer(this.rulesFor(run), hub, run, me)
            player.faulted.add(fault => this.bench.report(fault.describe()))
            this.joined(player, run)
            screen.follow(player)
            this.#mine = { run, hub, player, screen }
        }
        return {
            dispose: () => {
                const mine = this.#mine
                if(!mine || run !== mine.run) return
                this.#mine = null
                mine.player.dispose()
                mine.screen.close()
            },
        }
    }

    public createBattle(spec: GameModeShareable, manager: HandleChannel): [Battle, HeardChannel] {
        const battle = loadBattle(spec as unknown as BattleSave)
        const owner = new DuelOwner(battle, manager, text => this.bench.report(text))
        this.#owners.set(battle, owner)
        return [battle, reacting({
            // The owner of the duel: what the manager says, and what a player says on it.
            act: ({ from, message }) => {
                if(from === null) owner.order(message as DuelOrder)
                else return owner.heard(from.id, message)
            },
        })]
    }

    /** The duel is shown to this player, who fights or watches it. Its owner plays on its own engine. */
    public spectateBattle(view: InstanceView<Battle>): { dispose(): void } {
        const owner = this.#owners.get(view.engine)
        if(view.own) owner?.show(view.me)
        // The owner plays on its own engine, which holds its plans already: it only says it is ready.
        const submit = view.own ? (): void => void owner?.heard(view.me, null) : view.ready ?? (() => {})
        this.#mine?.hub.duel(view.engine, view.info, view.units, submit)
        return {
            dispose: () => {
                owner?.dispose()
                this.#mine?.hub.endDuel()
                // Brought to its end for the screen to leave it once shown: a battle over already stays so.
                view.engine.abort()
            },
        }
    }

    public onState(key: string, value: GameModeShareable): void {
        if(value === null) this.#told.delete(key)
        else this.#told.set(key, value)
        this.#mine?.hub.state(key, value)
    }

    public onOrder(message: GameModeShareable): void {
        this.#mine?.hub.order(message)
    }


    /** What the player holds of the race it plays: its run, what reads it, the screen. */
    #mine: {
        readonly run: Run
        readonly hub: ModeHub
        readonly player: DuelRacePlayer
        readonly screen: RaceScreen
    }|null = null

    /** The runs and screens made here, by their run. */
    readonly #screens = new WeakMap<Run, RaceScreen>()
    readonly #owners = new WeakMap<Battle, DuelOwner>()

    /** What the manager told, as it came: told to the player once it has a run to show. */
    readonly #told = new Map<string, unknown>()
}
