import { AssetError } from "../../../engine/assets"
import type { Assets } from "../../../engine/assets"
import { Console, CONSOLE_KEY, CONSOLE_SECOND_KEY, ConsoleView } from "../../../engine/console"
import type { Painter } from "../../../engine/gpu"
import type { InputFrame } from "../../../engine/input"
import type { Theme, UiRoot } from "../../../engine/ui"
import type { ClipboardPort } from "../../../platform"
import { Run } from "../sim/run/Run"
import type { Battle } from "../sim/battle/Battle"
import { RunBroadcaster } from "../sync/run/RunBroadcaster"
import { RunHost } from "../sync/run/RunHost"
import type { SeatMode, SeatPolicy } from "../sync/run/Seats"
import type { SyncRoom, SyncSender } from "../sync/SyncChannel"

import type { SaveSlot } from "../../../engine/save"
import type { RunSave } from "../sim/save/runSave"
import { RunSaver } from "../sync/run/RunSaver"

import { LiveContext, registerCommands } from "./commands"
import type { MecardContext, MecardHost } from "./commands"
import { LibraryScreen } from "./library/LibraryScreen"
import { UnitSprites } from "./look/UnitSprites"
import { GuideScreen } from "./guide/GuideScreen"
import { MainMenuScreen } from "./menu/MainMenuScreen"
import { PnjScreen } from "./pnj/PnjScreen"
import { NO_RUN_LOCKS, RunScreen } from "./run/RunScreen"
import { ArmScreen } from "./travel/ArmScreen"

/** The share of the height of the screen the console takes, from the top. */
const CONSOLE_SHARE = 0.45

/** A room opened for others to connect to. */
export interface OpenedRoom extends SyncSender {
    /** The clients connected one by one, none when they cannot be told apart. */
    readonly room: SyncRoom|null

    /** Settles with the code of the room once it is open, or fails when it never opens. */
    readonly ready: Promise<string>

    /** Close the room. */
    close(): void
}

/** How the game reaches the others. */
export interface MecardNetwork {
    /** Open a room for others to connect to. */
    open(): OpenedRoom

    /**
     * Leave the game for the one a room holds.
     *
     * @param guest - Does the player come to play, rather than to watch?
     */
    connect(code: string, guest: boolean): void
}

/**
 * Dungeon of the Mecard, played: a run on a {@link RunScreen}, back to the start after a defeat. The console
 * lies over it all, and the benches of the characters and of the forearm in its place.
 *
 * @remarks
 * Given a channel to viewers, it tells them the run through a {@link RunBroadcaster}, which only reads it:
 * nothing of the game knows it is watched. Hosted from the console, it tells a room the same way, and a
 * {@link RunHost} has clients play units: the screen only says the players are ready, and this game starts
 * the round once the host says everyone is.
 */
export class MecardGame {


    public run: Run

    public get battle(): Battle { return this.#screen.battleScreen.engine }

    /** The main menu. */
    public get menu(): MainMenuScreen { return this.#menu }

    constructor(
        theme: Theme,

        /** The interface the game lays its panels in. */
        public readonly ui: UiRoot,

        /** Where the pictures of the journey come from. */
        assets: Assets,

        /** The seed of the first run. */
        seed: number,

        /** Where a point of the interface, in virtual pixels, lies in the world, in its pixels. */
        toWorld: (x: number, y: number) => readonly [number, number],

        /** Where a point of the world, in its pixels, lies in the interface, in virtual pixels. */
        toUi: (x: number, y: number) => readonly [number, number],

        /** Where the battles and the journey go to their viewers, none when nobody watches. */
        viewers: SyncSender|null = null,

        /** How it reaches the others, none in an environment without a network. */
        network: MecardNetwork|null = null,

        /** The clipboard of the system, none when it has none: the battle commands copy and paste with it. */
        clipboard: ClipboardPort|null = null,
    ){
        this.#seed = seed
        this.#network = network
        this.run = this.#newRun()
        // Made before the screen, so it hears each battle before the screen starts its first round.
        this.#broadcaster = viewers ? new RunBroadcaster(this.run, viewers) : null
        const sprites = new UnitSprites()
        // Made before the screen, so the transitions it lays lie over them.
        this.#pnj = new PnjScreen(theme, ui, {
            report: text => this.#console.print(text),
            leave: () => this.#travelOn(),
        }, assets)
        this.#arm = new ArmScreen(theme, ui, {
            report: text => this.#console.print(text),
            leave: () => this.#travelOn(),
        }, assets)
        this.#library = new LibraryScreen(theme, ui, { leave: () => this.#travelOn() }, sprites)
        this.#screen = new RunScreen(ui, this.run, {
            theme, assets, sprites, toWorld, toUi,
            // The party fell: its save is gone, back to the menu to start again.
            restart: () => this.#menuOn(),
            ready: () => this.#host?.ready(),
            report: text => this.report(text),
        })
        void sprites.load(ui.gpu, assets).catch((error: unknown) => {
            if(!(error instanceof AssetError)) throw error
            this.#console.print(`Les sprites des unités n'ont pas pu être chargés : ${error.message}`)
        })
        const actions: Omit<MecardHost, "run"|"battle"> = {
            print: text => this.#console.print(text),
            refresh: () => {
                const { battleScreen, travelScreen } = this.#screen
                battleScreen.refresh()
                if(travelScreen.visible) travelScreen.refresh()
            },
            handChanged: unit => this.#screen.battleScreen.handChanged(unit),
            newBattle: () => this.#newBattle(),
            playBattle: battle => this.#playBattle(battle),
            clipboard,
            restart: () => this.restart(),
            go: place => {
                this.#travelOn()
                this.#screen.travelScreen.go(place)
            },
            showMap: () => this.#travelOn(),
            visit: type => {
                this.#travelOn()
                this.run.travel.visit(type)
            },
            showPnj: () => this.#pnjOn(),
            showArm: () => this.#armOn(),
            showLibrary: () => this.#libraryOn(),
            hostGame: (mode, policy) => this.hostGame(mode, policy),
            connect: (code, guest) => this.#connect(code, guest),
            playTransition: (path, duration, reverse) => {
                void this.#screen.transitions.play(path, {
                    duration,
                    reverse,
                    onMiddle: () => this.#console.print("Transition : milieu."),
                    onEnd: () => this.#console.print("Transition : fin."),
                })
            },
        }
        const host = (): MecardHost => ({ ...actions, run: this.run, battle: this.battle })
        this.#console = new Console<MecardContext>(new LiveContext(host))
        registerCommands(this.#console)
        this.#console.print("Console : tape help pour la liste des commandes.")
        this.#consoleView = new ConsoleView(theme, this.#console)
        this.#consoleView.visible = false
        ui.addLayer("console").content.add(this.#consoleView, { x: "start", y: "start", offsetX: 4, offsetY: 4 })
        // Made last among the screens, so it lies over them.
        this.#menu = new MainMenuScreen(theme, ui, {
            newGame: () => this.#startNewGame(),
            continueGame: () => this.#continueGame(),
            openGuide: () => this.#guideOn(),
            report: text => this.#console.print(text),
        }, assets)
        // Over the menu, which it replaces while it is read.
        this.#guide = new GuideScreen(theme, ui, { leave: () => this.#menuOn() })
        this.#menuOn()
    }


    /** Read the input, then let what is shown play and draw: the run, or a bench. */
    public frame(input: InputFrame, world: Painter, dt: number): void {
        this.#consoleView.resize(this.ui.width - 8, Math.floor(this.ui.height * CONSOLE_SHARE))
        this.ui.handle(input)
        this.#openConsole(input)
        if(this.#guide.visible) this.#guide.frame(input)
        else if(this.#menu.visible) this.#menu.frame()
        else if(this.#pnj.visible) this.#pnj.frame()
        else if(this.#arm.visible) this.#arm.frame()
        else if(this.#library.visible) this.#library.frame(input)
        this.#screen.frame(input, world, dt)
    }


    /**
     * Keep the run in progress in a slot from now on, and offer in the menu to go on with the one it holds.
     * Until then, nothing is kept.
     */
    public keep(slot: SaveSlot<RunSave>): void {
        this.#saves = slot
        this.#saver?.dispose()
        this.#saver = new RunSaver(this.run, slot, text => this.#console.print(text))
        if(this.#menu.visible) void this.#readSave()
    }

    /** Print what went wrong in the console. */
    public report(text: string): void {
        this.#console.print(text)
    }

    /**
     * Open a room, and print its code once it is open.
     *
     * @param mode - What the clients are given to play, none for clients that only watch.
     * @throws {@link Error} With no network, when already hosted, or during a battle, which a client
     *   connecting could not be told.
     */
    public hostGame(mode: SeatMode|null, policy: SeatPolicy): void {
        if(!this.#network) throw new Error("Le réseau n'est pas disponible ici.")
        if(this.#hosted) throw new Error("La partie est déjà hébergée.")
        if(this.run.phase !== "travel") throw new Error("Une partie s'héberge depuis le voyage.")
        const room = this.#network.open()
        // Made first: a battle told to the room has its units given already.
        if(mode && room.room) this.#seatGuests(room.room, mode, policy)
        this.#hosted = { room, broadcaster: new RunBroadcaster(this.run, room) }
        room.ready.then(code => this.#console.print(`Code de la partie : ${code}`), (error: unknown) => {
            this.#stopHosting()
            this.#console.print(`La partie n'a pas pu être hébergée : ${String(error)}`)
        })
    }

    /** Start a new run from the start of its journey. */
    public restart(): void {
        this.run.backToMap()
        this.#seed++
        this.run = this.#newRun()
        if(this.#host) this.#host.engine = this.run
        if(this.#broadcaster) this.#broadcaster.engine = this.run
        if(this.#hosted) this.#hosted.broadcaster.engine = this.run
        if(this.#saver) this.#saver.engine = this.run
        this.#screen.engine = this.run
        this.#travelOn()
    }


    readonly #menu: MainMenuScreen
    readonly #guide: GuideScreen
    #saves: SaveSlot<RunSave>|null = null
    #saver: RunSaver|null = null
    readonly #screen: RunScreen
    readonly #pnj: PnjScreen
    readonly #arm: ArmScreen
    readonly #library: LibraryScreen
    readonly #broadcaster: RunBroadcaster|null
    readonly #console: Console<MecardContext>
    readonly #consoleView: ConsoleView<MecardContext>
    readonly #network: MecardNetwork|null

    /** The room the game is hosted in, and what tells it the run, none when it is not hosted. */
    #hosted: { readonly room: OpenedRoom, readonly broadcaster: RunBroadcaster }|null = null

    /** What has clients play units, none when they only watch. */
    #host: RunHost|null = null

    #seed: number

    /** A run of the current seed, the errors of what listens to it told in the console. */
    #newRun(): Run {
        return new Run(this.#seed, error => {
            this.#console.print(error instanceof Error ? error.message : String(error))
        })
    }

    /** Open the console when its key was pressed and nothing took the press: open, the console takes it. */
    #openConsole(input: InputFrame): void {
        const pressed = input.events.some(event => {
            return event.type === "key-down" && (event.code === CONSOLE_KEY || event.code === CONSOLE_SECOND_KEY)
                && !event.consumed
        })
        if(pressed) this.#consoleView.open()
    }

    /** Have the clients of a room play units, the screen waiting for them. */
    #seatGuests(room: SyncRoom, mode: SeatMode, policy: SeatPolicy): void {
        const host = new RunHost(this.run, room, mode, policy, () => this.#screen.battleScreen.startRound())
        host.onError = error => this.#console.print(error instanceof Error ? error.message : String(error))
        this.#host = host
        this.#screen.locks = {
            ...NO_RUN_LOCKS, battle: { isLocked: unit => host.isGuests(unit), round: "gather" },
        }
    }

    /** Close the room, the game played alone again. */
    #stopHosting(): void {
        this.#host?.dispose()
        this.#host = null
        this.#hosted?.broadcaster.dispose()
        this.#hosted?.room.close()
        this.#hosted = null
        this.#screen.locks = NO_RUN_LOCKS
    }

    /** Leave the game for the one a room holds. */
    #connect(code: string, guest: boolean): void {
        if(!this.#network) throw new Error("Le réseau n'est pas disponible ici.")
        this.#network.connect(code, guest)
    }

    /** Fight the place the party stands on again, whatever was going on left. */
    #newBattle(): void {
        this.#benchesOff()
        this.run.backToMap()
        this.run.startBattle()
    }

    /** Fight a battle made apart, whatever was going on left. */
    #playBattle(battle: Battle): void {
        this.#benchesOff()
        this.run.backToMap()
        this.run.playBattle(battle)
    }

    /** Go back to the map, whatever was going on left, and show it. */
    #travelOn(): void {
        this.#benchesOff()
        this.#screen.showMap()
    }

    /** Show the main menu alone, with the choice of going on if a run is kept. */
    #menuOn(): void {
        this.#screen.visible = false
        this.#pnj.visible = false
        this.#arm.visible = false
        this.#library.visible = false
        this.#guide.visible = false
        this.#menu.visible = true
        void this.#readSave()
    }

    /** Show the guide alone, the menu left where it stands. */
    #guideOn(): void {
        this.#menu.visible = false
        this.#guide.visible = true
    }

    /** Learn whether a run is kept, and grey the menu's choice of going on with it if none is. */
    async #readSave(): Promise<void> {
        const saves = this.#saves
        if(!saves){
            this.#menu.hasSave = false
            return
        }
        try {
            this.#menu.hasSave = await saves.load() !== null
        } catch(error){
            this.#menu.hasSave = false
            this.#console.print(`La sauvegarde n'a pas pu être lue : ${String(error)}`)
        }
    }

    /** Leave the menu for a new run, the one kept forgotten once the new one leaves its first halt. */
    #startNewGame(): void {
        this.#menu.visible = false
        this.restart()
    }

    /** Leave the menu for the run kept. */
    #continueGame(): void {
        const saves = this.#saves
        if(!saves) return
        saves.load().then(save => {
            if(!save) return
            this.run.backToMap()
            this.run.load(save)
            this.#menu.visible = false
            this.#travelOn()
        }, (error: unknown) => {
            this.#console.print(`La sauvegarde n'a pas pu être lue : ${String(error)}`)
        })
    }

    /** Hide the benches, the run shown again. */
    #benchesOff(): void {
        this.#menu.visible = false
        this.#guide.visible = false
        this.#pnj.visible = false
        this.#arm.visible = false
        this.#library.visible = false
        if(!this.#screen.visible) this.#screen.visible = true
    }

    /** Show the bench of the characters alone, the run left where it stands. */
    #pnjOn(): void {
        this.#screen.visible = false
        this.#arm.visible = false
        this.#library.visible = false
        this.#pnj.visible = true
    }

    /** Show the bench of the forearm alone, the run left where it stands. */
    #armOn(): void {
        this.#screen.visible = false
        this.#pnj.visible = false
        this.#library.visible = false
        this.#arm.visible = true
    }

    /** Show the catalogue alone, the run left where it stands. */
    #libraryOn(): void {
        this.#screen.visible = false
        this.#pnj.visible = false
        this.#arm.visible = false
        this.#library.visible = true
    }


}
