import type { Observer } from "../../../sim/base/Observable"
import type { Battle } from "../../../sim/battle/Battle"
import type { Run } from "../../../sim/run/Run"
import { POSSESSED } from "../../../sim/status/subs/Possessed"

import { BattleGuest } from "../../battle/BattleGuest"
import { BattleHost } from "../../battle/BattleHost"
import { Admissions } from "../../participation/Participation"
import type { Admission } from "../../participation/Participation"
import type { GameMember, GameMode, GameModeContext, GameModeDef, Me, RunHandle } from "../../mode/GameMode"
import type { GameBench } from "../../mode/gameModeAsLobbyMode"
import { COOP_SEATS, ENEMY_SEATS, FIXED_SEATS, mixedSeats, randomSeats, Seats, sidedSeats } from "../../run/Seats"
import type { Seatable, SeatMode, Side } from "../../run/Seats"
import { ChoiceSetting } from "../Setting"
import type { SettingValues } from "../Setting"

/** What a mode of a run asks of the screen, which it knows nothing of. */
export interface TableBench extends GameBench {
    /**
     * Make a run, which no screen shows yet: the run of the table, and the replica of it each client holds.
     */
    newRun(seed: number): Run

    /**
     * Show the run the table plays to its owner: it plays what no client does, and starts the rounds. Said
     * again
     * whenever who plays what changes.
     *
     * @param isGuests - Is a unit played by a client?
     * @param ready - Said when the owner is ready.
     * @param over - Said when the party fell and the owner leaves it.
     */
    showOwned(run: Run, isGuests: (unit: Seatable) => boolean, ready: () => void, over: () => void): void

    /**
     * Show the run to a client, which plays the units it is given and only watches with none. Said again
     * whenever
     * they change.
     */
    showSeat(run: Run, units: readonly string[], ready: () => void): void

    /**
     * Start the round of the battle on the screen of the owner: it and every client it waits for are ready.
     */
    startRound(): void

    /** Take the run off the screen. */
    hideRun(): void
}

/** The ways the places of a run are given to the clients. */
const PLACES = ["fixées", "aléatoires"] as const

/** The word of the owner, when it is ready. */
const READY = "ready"

/** The word of the owner, when the party fell and it leaves. */
const OVER = "over"

/** The word of the manager to the owner, when the round starts. */
const START_ROUND = "start-round"

/** What the manager tells the owner of the table: which units a client plays. */
interface OwnerInfo {
    readonly locked: readonly string[]
}

/** What the manager tells a client of the table: which units it plays. */
interface SeatInfo {
    readonly units: readonly string[]
}

/** A client that came to play, and what it was last told it plays. */
interface Guest {
    readonly member: GameMember
    told: string
}

/**
 * A run several clients play together: the first of its members owns the table and plays what no other
 * does, the
 * others are dealt some of its units, and a client that comes late watches.
 *
 * @remarks
 * What differs among its kinds is what the clients are given to play: the heroes of the party, or the foes.
 * The run is
 * the manager's, a replica of which each client holds, and the battles follow it. A client says its plans
 * as the intent
 * of its run, and the owner says it is ready the same way.
 */
class RunTable implements GameMode {


    constructor(
        private readonly seatMode: SeatMode,
        private readonly bench: TableBench,
        private readonly isRandom: boolean,

        /** Does each client choose its side? */
        private readonly isSided: boolean = false,
    ){}


    // ===== The manager =====

    public run(ctx: GameModeContext): void {
        const handle = ctx.openManagedRun({ seed: ctx.rng().int(2 ** 31) })
        const run = handle.run()
        if(!run){
            ctx.end()
            return
        }
        this.#ctx = ctx
        this.#handle = handle
        this.#table = run
        const places = this.isRandom ? randomSeats(ctx.rng()) : FIXED_SEATS
        const policy = this.isSided ? sidedSeats(who => this.#sideOf(who), places) : places
        this.#seats = new Seats(this.seatMode, policy)
        this.#battle = new BattleHost(null, this.#seats, () => this.#startRound())
        void [
            run.battleStarted.add(battle => this.#enterBattle(battle)),
            run.heroJoined.add(() => this.#reseat()),
            run.heroLeft.add(() => this.#reseat()),
            run.phaseChanged.add(phase => {
                if(phase !== "travel") return
                this.#leaveBattle()
                this.#deal()
            }),
        ]
        ctx.joined.add(member => this.#welcome(member))
        this.#reseat()
    }

    public onJoin(ctx: GameModeContext, who: GameMember): Admission {
        if(this.#owner === null) this.#owner = who.id
        this.#sides.set(who.id, who.options.camp === "ennemi" ? "ennemi" : "allié")
        if(who.id === this.#owner) return Admissions.seat("owner")
        // The clients of the lobby when the game started play, the owner being one of them; one that comes
        // after them,
        // and is not one that came back, watches.
        if(!this.#known.has(who.id) && this.#known.size >= ctx.expected() - 1) return Admissions.spectate()
        this.#known.add(who.id)
        return Admissions.seat("guest")
    }

    public onLeave(_ctx: GameModeContext, who: GameMember, gone: boolean): void {
        // A connection lost may come back: the units are planned as bots meanwhile. A client that left is
        // let go.
        if(who.presence !== "left" && !gone) this.#battle?.lost(who.id)
        else this.#part(who)
    }

    public onBack(_ctx: GameModeContext, who: GameMember): void {
        this.#battle?.back(who.id)
    }

    public onTell(_ctx: GameModeContext, from: GameMember, message: unknown): void {
        if(message === OVER && from.id === this.#owner) this.#ctx?.end()
    }

    // ===== The owner of the run, and its replicas =====

    public createRun(spec: unknown): Run {
        const seed = (spec as { seed?: unknown }|null)?.seed
        return this.bench.newRun(typeof seed === "number" ? seed : 0)
    }

    public createBattle(): Battle {
        throw new Error("A run holds its battles.")
    }

    public onRunIntent(from: GameMember, _info: unknown, _run: Run, intent: unknown): boolean {
        if(!this.#battle) return false
        if(from.id === this.#owner){
            if(intent === READY) this.#battle.ready()
            return intent === READY
        }
        this.#battle.receive(from.id, JSON.stringify(intent))
        return true
    }

    // ===== The player =====

    public onShowRun(me: Me, run: Run, info: unknown): void {
        const locked = (info as Partial<OwnerInfo>|null)?.locked
        if(Array.isArray(locked)){
            const names = new Set<string>(locked)
            const isGuests = (unit: Seatable): boolean => names.has(unit.name)
            this.bench.showOwned(run, isGuests, () => me.intent(run, READY), () => me.tellManager(OVER))
            return
        }
        const units = (info as Partial<SeatInfo>|null)?.units
        const mine = Array.isArray(units) ? units.filter((unit): unit is string => typeof unit === "string") : []
        this.bench.showSeat(run, mine, () => this.#say(me, run, mine))
    }

    public onHide(): void {
        this.bench.hideRun()
    }

    public onOrder(_me: Me, order: unknown): void {
        if(order === START_ROUND) this.bench.startRound()
    }


    #ctx: GameModeContext|null = null
    #handle: RunHandle|null = null
    #table: Run|null = null
    #seats: Seats|null = null
    #battle: BattleHost|null = null
    #battleObservers: Observer[] = []

    /** The id of the member that owns the table, none before the first. */
    #owner: string|null = null

    /** The side each client chose, by its id: the allies' for one that chose none, and for the host. */
    readonly #sides = new Map<string, Side>()

    #sideOf(who: string|undefined): Side {
        return (who === undefined ? undefined : this.#sides.get(who)) ?? "allié"
    }

    /** The ids of the clients that took part, to tell one that comes back from one that is late. */
    readonly #known = new Set<string>()
    readonly #guests = new Map<string, Guest>()

    /** What the owner was last told. */
    #ownerTold = ""

    /** The units of the battle that are bots but for the client playing them, by their names. */
    readonly #handed = new Set<string>()

    /** Give the manager what a client committed for its units: it is ready. */
    #say(me: Me, run: Run, units: readonly string[]): void {
        const { battle } = run
        if(!battle) return
        new BattleGuest(
            battle,
            { send: text => me.intent(run, JSON.parse(text)), listen: () => ({ dispose: () => {} }) },
            () => units,
        ).ready()
    }

    /** The members of the table follow its run, as what they are given says. */
    #welcome(member: GameMember): void {
        const handle = this.#handle
        if(!handle || !this.#ctx) return
        if(member.presence === "spectator"){
            handle.spectate(member)
            return
        }
        if(member.id === this.#owner){
            this.#ownerTold = ""
            this.#deal()
            return
        }
        this.#guests.set(member.id, { member, told: "" })
        if(this.#table && !this.#table.battle) this.#deal()
        else this.#tell(this.#guests.get(member.id) as Guest)
    }

    /** Let a client go, what it played given back: the round goes on without it. */
    #part(who: GameMember): void {
        const guest = this.#guests.get(who.id)
        const seats = this.#seats
        if(!guest || !seats) return
        this.#guests.delete(who.id)
        this.#battle?.fillIn(who.id)
        const battle = this.#table?.battle
        for(const name of seats.unitsOf(who.id)){
            const unit = battle?.units.find(each => each.name === name)
            if(!unit || !this.#handed.delete(name)) continue
            battle?.control(unit, "bot")
            battle?.removeStatus(unit, POSSESSED)
        }
        seats.drop(who.id)
        this.#battle?.gone(who.id)
        this.#tellOwner()
    }

    /** Give the seats for a battle that starts, then host it. */
    #enterBattle(battle: Battle): void {
        const seats = this.#seats
        if(!seats) return
        this.#handed.clear()
        seats.mode.enterBattle(seats)
        this.#reseat()
        for(const unit of battle.units){
            if(seats.holderOf(unit.name) === null || unit.controller === "player") continue
            battle.control(unit, "player")
            battle.applyStatus(unit, POSSESSED, 1)
            battle.reshuffle(unit)
            this.#handed.add(unit.name)
        }
        if(this.#battle) this.#battle.engine = battle
        this.#battleObservers = [battle.roundStarted.add(() => this.#deal())]
    }

    #leaveBattle(): void {
        for(const observer of this.#battleObservers) observer.remove()
        this.#battleObservers = []
        if(this.#battle) this.#battle.engine = null
    }

    /** Free the seats that may not be held anymore, then give them out. */
    #reseat(): void {
        if(this.#seats && this.#table) this.#seats.prune(this.#table)
        this.#deal()
    }

    /** Give a seat to whoever has none, the owner first, then tell those whose seats changed. */
    #deal(): void {
        const seats = this.#seats
        const run = this.#table
        if(!seats || !run) return
        seats.mode.seatHost(seats, run)
        for(const id of this.#guests.keys()) seats.seat(id, run)
        for(const guest of this.#guests.values()) this.#tell(guest)
        this.#tellOwner()
    }

    #tell(guest: Guest): void {
        const units = this.#seats?.unitsOf(guest.member.id) ?? []
        const text = JSON.stringify(units)
        if(text === guest.told) return
        guest.told = text
        this.#handle?.control(guest.member, { units } satisfies SeatInfo)
    }

    /** Tell the owner which units clients play, so it plays no other. */
    #tellOwner(): void {
        const owner = this.#ownerMember()
        const seats = this.#seats
        if(!owner || !seats) return
        const locked = [...this.#guests.keys()].flatMap(id => seats.unitsOf(id))
        const text = JSON.stringify(locked)
        if(text === this.#ownerTold) return
        this.#ownerTold = text
        this.#handle?.control(owner, { locked } satisfies OwnerInfo)
    }

    #ownerMember(): GameMember|null {
        return this.#ctx?.members().find(each => each.id === this.#owner) ?? null
    }

    /** Everyone is ready: the owner starts the round on its screen. */
    #startRound(): void {
        const owner = this.#ownerMember()
        if(owner) this.#ctx?.order(owner, START_ROUND)
    }
}

/** What each client sets for itself at a mixed table: the side it plays on. */
const SIDES = ["allié", "ennemi"] as const

/** A kind of run played by a table: what the clients are given to play differs among them. */
function runTableMode(
    id: string, title: string, description: string, seats: () => SeatMode, bench: TableBench, isSided = false,
): GameModeDef {
    return {
        id,
        title,
        description,
        settings: [new ChoiceSetting("places", "Places", PLACES)],
        participantSettings: isSided ? [new ChoiceSetting("camp", "Camp", SIDES)] : [],
        create: (values: SettingValues) => new RunTable(seats(), bench, values.places === "aléatoires", isSided),
    }
}

/** The clients play the heroes of the party by the side of the host. */
export function runCoopTable(bench: TableBench): GameModeDef {
    return runTableMode(
        "run-coop", "Run coop", "Les clients jouent les héros de la partie de l'hôte, à ses côtés.", () => COOP_SEATS,
        bench,
    )
}

/** The clients play the enemies the host's party fights. */
export function runEnemyTable(bench: TableBench): GameModeDef {
    return runTableMode(
        "run-ennemi", "Run ennemi", "Les clients jouent les ennemis que la partie de l'hôte affronte.", () => ENEMY_SEATS,
        bench,
    )
}

/** Each client chooses its side: with the party of the host, or among the enemies it affronts. */
export function runMixedTable(bench: TableBench): GameModeDef {
    return runTableMode(
        "run-mixte", "Run mixte",
        "Chaque client choisit son camp : jouer un héros aux côtés de l'hôte, ou un ennemi contre lui.",
        mixedSeats, bench, true,
    )
}
