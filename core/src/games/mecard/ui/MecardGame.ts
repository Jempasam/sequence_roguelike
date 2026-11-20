import { AssetError } from "../../../engine/assets"
import type { Assets } from "../../../engine/assets"
import { Fault } from "../../../engine/net"
import { Console, CONSOLE_KEY, CONSOLE_SECOND_KEY, ConsoleView } from "../../../engine/console"
import type { SoundPlayer } from "../../../engine/audio"
import type { Painter } from "../../../engine/gpu"
import type { InputFrame } from "../../../engine/input"
import { Button } from "../../../engine/ui"
import type { Layer, Theme, UiRoot } from "../../../engine/ui"
import type { ClipboardPort, TimerPort } from "../../../platform"
import { Run } from "../sim/run/Run"
import type { FloorType } from "../sim/floor/Floor"
import type { Battle } from "../sim/battle/Battle"
import { RunBroadcaster } from "../sync/run/RunBroadcaster"
import { RunHost } from "../sync/run/RunHost"
import type { SeatMode, SeatPolicy } from "../sync/run/Seats"
import type { SyncLink, SyncRoom, SyncSender } from "../sync/SyncChannel"
import type { HostBoard } from "../sync/hosts/HostDirectory"
import type { Chat } from "../sync/chat/Chat"
import { ChatGuest } from "../sync/chat/ChatGuest"
import { ChatHost } from "../sync/chat/ChatHost"
import type { ChatAuthor } from "../sync/chat/ChatMessage"
import { ChatScreen } from "./chat/ChatScreen"
import { LobbyController } from "./lobby/LobbyController"
import { LobbyScreen } from "./lobby/LobbyScreen"
import { duelRaceMode, versusMode } from "../sync/lobby/modes/DuelRaceMode"
import type { RaceBench, RaceScreen } from "../sync/lobby/modes/DuelRaceMode"
import type { DuelRacePlayer } from "../sync/modes/players/DuelRacePlayer"
import type { DuelAccess } from "../sync/modes/players/HubPort"
import { RaceTab } from "./duel/RaceTab"
import type { RaceTabAlign } from "./duel/RaceTab"
import { runCoopMode, runEnemyMode } from "../sync/lobby/modes/RunMode"
import type { HostedRun, JoinedRun, RunBench } from "../sync/lobby/modes/RunMode"
import { TEST_MODE } from "../sync/lobby/modes/TestMode"

import type { SaveSlot } from "../../../engine/save"
import type { RunSave } from "../sim/save/runSave"
import { RunSaver } from "../persist/RunSaver"
import { RunHistorian } from "../persist/RunHistorian"
import type { History } from "../sim/save/historySave"
import { HistoryScreen } from "./history/HistoryScreen"

import { LiveContext, registerCommands } from "./commands"
import type { MecardContext, MecardHost } from "./commands"
import { LibraryScreen } from "./library/LibraryScreen"
import { UnitSprites } from "./look/UnitSprites"
import { GuideScreen } from "./guide/GuideScreen"
import { MainMenuScreen } from "./menu/MainMenuScreen"
import { PnjScreen } from "./pnj/PnjScreen"
import { ALL_RUN_LOCKS, NO_RUN_LOCKS, RunScreen } from "./run/RunScreen"
import { locksForUnits } from "./MecardViewer"
import { RunSoundLink } from "./sound/RunSoundLink"
import { UiSoundLink } from "./sound/UiSoundLink"
import { ArmScreen } from "./travel/ArmScreen"
import { ParallaxScreen } from "./travel/ParallaxScreen"
import { SpriteBenchScreen } from "./look/SpriteBenchScreen"
import type { Visual } from "../sim/base/Visual"

/** The share of the height of the screen the console takes, from the top. */
const CONSOLE_SHARE = 0.45

/**
 * Where the tab of a race lies across the screen, by what the run shows under it: moved to leave the
 * interface of the screen free.
 */
const RACE_TAB_ALIGN: Readonly<Record<"map"|"battle", RaceTabAlign>> = { map: "center", battle: "center" }

/** Time that never passes: what the modes that need none are given when there is no network. */
const IDLE_TIMER: TimerPort = { after: () => ({ cancel: () => {} }), now: () => 0 }

/** A room opened for others to connect to. */
export interface OpenedRoom extends SyncSender {
    /** The clients connected one by one, none when they cannot be told apart. */
    readonly room: SyncRoom|null

    /** Settles with the code of the room once it is open, or with why it never opens. It never rejects. */
    readonly ready: Promise<string|Fault>

    /** Told once, when the room cannot be kept: its connection to the server is lost for good. */
    readonly ended?: { add(handler: (fault: Fault) => void): { dispose(): void } }

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

    /** Join a room as a client that speaks to its host, without leaving this game. */
    join(code: string): JoinedRoom

    /** Join the list of the rooms hosted, shared with everyone looking at it. It never rejects. */
    directory(): Promise<HostBoard|Fault>

    /** Where time goes: the deadlines of a race. */
    readonly timer: TimerPort
}

/** A room joined as a client, to speak to its host. */
export interface JoinedRoom {
    /** The way to the host, none when it cannot be spoken to. */
    readonly link: SyncLink|null

    /** Settles with the code of the room once it is joined, or with why it never is. It never rejects. */
    readonly ready: Promise<string|Fault>

    /** Told once, when the room cannot be kept. */
    readonly ended: { add(handler: (fault: Fault) => void): { dispose(): void } }

    /** Told each time the connection is lost and the client tries to come back to the room. */
    readonly reconnecting?: { add(handler: () => void): { dispose(): void } }

    /** Told each time the client is back in the room. */
    readonly reconnected?: { add(handler: () => void): { dispose(): void } }

    /** Leave the room. */
    close(): void
}

/** A group chat opened from the game, and the session it lives on. */
interface OpenedChat {
    readonly chat: Chat
    readonly close: () => void
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

    /** The history of the games that ended. */
    public get history(): HistoryScreen { return this.#history }

    /** The lobby, none without a network. */
    public get lobby(): LobbyScreen|null { return this.#lobby }

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

        /** What plays the sounds of the run, none when the game is played silent. */
        sounds: SoundPlayer|null = null,
    ){
        this.#seed = seed
        this.#network = network
        this.run = this.#newRun()
        // Made before the screen, so it hears each battle before the screen starts its first round.
        this.#broadcaster = viewers ? new RunBroadcaster(this.run, viewers) : null
        this.#sound = sounds ? new RunSoundLink(this.run, sounds) : null
        // Listens to the interface for as long as the game lives: nothing to let go of.
        const uiSound = sounds ? new UiSoundLink(ui, sounds) : null
        const sprites = new UnitSprites()
        // Made before the screen, so the transitions it lays lie over them.
        this.#pnj = new PnjScreen(theme, ui, {
            report: text => this.#console.print(text),
            leave: () => this.#leaveBench(),
        }, assets)
        this.#arm = new ArmScreen(theme, ui, {
            report: text => this.#console.print(text),
            leave: () => this.#leaveBench(),
        }, assets)
        this.#parallax = new ParallaxScreen(theme, ui, {
            report: text => this.#console.print(text),
            print: text => this.#console.print(text),
            clipboard,
            leave: () => this.#leaveBench(),
        }, assets)
        this.#spriteBench = new SpriteBenchScreen(theme, ui, {
            report: text => this.#console.print(text),
            print: text => this.#console.print(text),
            clipboard,
            leave: () => this.#leaveBench(),
        }, sprites)
        this.#library = new LibraryScreen(theme, ui, { leave: () => this.#leaveBench() }, sprites)
        this.#screen = new RunScreen(ui, this.run, {
            theme, assets, sprites, toWorld, toUi, sounds: uiSound,
            // The party fell: its save is gone, back to the menu to start again.
            restart: () => {
                if(this.#shared) this.#shared.onOver?.()
                else this.#menuOn()
            },
            ready: () => {
                this.#host?.ready()
                this.#shared?.onReady?.()
            },
            report: text => this.report(text),
        })
        void sprites.load(ui.gpu, assets).catch((error: unknown) => {
            if(!(error instanceof AssetError)) throw error
            this.#console.print(`Les sprites des unités n'ont pas pu être chargés : ${error.message}`)
        })
        const actions: Omit<MecardHost, "run"|"battle"|"playing"> = {
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
            showParallax: parallax => this.#parallaxOn(parallax),
            showSprites: sprite => this.#spritesOn(sprite),
            showLibrary: () => this.#libraryOn(),
            hostGame: (mode, policy) => this.hostGame(mode, policy),
            connect: (code, guest) => this.#connect(code, guest),
            openChat: (role, code, author) => this.openChat(role, code, author),
            leaveChat: () => this.leaveChat(),
            playTransition: (transition, duration, reverse) => {
                void this.#screen.transitions.play(transition, {
                    duration,
                    reverse,
                    onMiddle: () => this.#console.print("Transition : milieu."),
                    onEnd: () => this.#console.print("Transition : fin."),
                })
            },
        }
        const host = (): MecardHost => ({ ...actions, playing: this.#playing, run: this.run, battle: this.battle })
        this.#console = new Console<MecardContext>(new LiveContext(host))
        registerCommands(this.#console)
        this.#console.print("Console : tape help pour la liste des commandes.")
        this.#consoleView = new ConsoleView(theme, this.#console)
        this.#consoleView.visible = false
        // Made last among the screens, so it lies over them.
        this.#menu = new MainMenuScreen(theme, ui, {
            newGame: () => this.#startNewGame(),
            continueGame: () => this.#continueGame(),
            openGuide: () => this.#guideOn(),
            openHistory: () => void this.#historyOn(),
            openMultiplayer: () => this.#lobbyOn(),
            report: text => this.#console.print(text),
        }, assets)
        // Over the menu, which it replaces while it is read.
        this.#guide = new GuideScreen(theme, ui, { leave: () => this.#menuOn() })
        this.#history = new HistoryScreen(theme, ui, { leave: () => this.#menuOn() }, sprites)
        this.#chat = new ChatScreen(theme, ui, { leave: () => this.leaveChat() })
        this.#menu.hasNetwork = network !== null
        this.#bench = {
            host: () => this.#hostShared(),
            join: () => this.#joinShared(),
            race: firstFloor => this.#raceShared(firstFloor),
            report: text => this.#console.print(text),
            timer: network?.timer ?? IDLE_TIMER,
        }
        this.#raceTab = new RaceTab(theme, ui, () => this.#lobbyController?.members ?? [], {
            sprites, onLeave: () => this.#leaveShared(),
        })
        const modes = [
            TEST_MODE, runCoopMode(this.#bench), runEnemyMode(this.#bench),
            duelRaceMode(this.#bench), versusMode(this.#bench),
        ]
        this.#lobbyController = network ? new LobbyController(network, modes) : null
        this.#lobby = this.#lobbyController ? new LobbyScreen(theme, ui, this.#lobbyController, {
            leave: () => this.#leaveLobby(),
            report: text => this.#console.print(text),
        }, clipboard, sprites) : null
        // Over the run of a lobby, to leave it.
        const exit = new Button(theme, "Quitter la partie")
        exit.onActivate = () => this.#leaveShared()
        this.#exit = ui.addLayer("shared")
        this.#exit.content.add(exit, { x: "end", y: "start", offsetX: -4, offsetY: 4 })
        this.#exit.content.visible = false
        // Over the menu and the guide too, so it can be opened from the main menu.
        ui.addLayer("console").content.add(this.#consoleView, { x: "start", y: "start", offsetX: 4, offsetY: 4 })
        this.#menuOn()
    }


    /** Read the input, then let what is shown play and draw: the run, or a bench. */
    public frame(input: InputFrame, world: Painter, dt: number): void {
        this.#consoleView.resize(this.ui.width - 8, Math.floor(this.ui.height * CONSOLE_SHARE))
        this.ui.handle(input)
        this.#openConsole(input)
        if(this.#guide.visible) this.#guide.frame(input)
        else if(this.#history.visible) this.#history.frame(input)
        else if(this.#chat.visible) this.#chat.frame()
        else if(this.#lobby?.visible) this.#lobby.frame()
        else if(this.#menu.visible) this.#menu.frame()
        else if(this.#pnj.visible) this.#pnj.frame()
        else if(this.#arm.visible) this.#arm.frame()
        else if(this.#parallax.visible) this.#parallax.frame()
        else if(this.#library.visible) this.#library.frame(input)
        // The tab of a race holds its own way out: the button only lies over the other shared games.
        this.#exit.content.visible = this.#shared !== null && this.#screen.visible && !this.#raceTab.active
        this.#raceTab.visible = this.#shared !== null && this.#screen.visible
        this.#raceTab.align = RACE_TAB_ALIGN[this.#raceTabSpot()]
        this.#raceTab.frame(dt)
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

    /**
     * Write each game that ends in a slot from now on, and show the games it holds in the history of the menu.
     * Until then, nothing is written and the history is empty.
     */
    public keepHistory(slot: SaveSlot<History>): void {
        this.#historySlot = slot
        this.#historian?.dispose()
        this.#historian = new RunHistorian(this.run, slot, () => this.#seed, text => this.#console.print(text))
    }

    /** Print what went wrong in the console. */
    public report(text: string): void {
        console.error(text)
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
        void room.ready.then(code => {
            if(!(code instanceof Fault)){
                this.#console.print(`Code de la partie : ${code}`)
                return
            }
            this.#stopHosting()
            this.#printFault(`La partie n'a pas pu être hébergée : ${code.describe()}`)
        })
    }

    /**
     * Open a group chat on a session of its own, and show it: host a room others join, or join one.
     *
     * @remarks
     * This is the only place that knows how the chat's session is opened: the chat and its screen are given a
     * room or a link already made, so what composes rooms later replaces this and nothing else.
     *
     * @param code - The code of the room to join, none when hosting.
     * @throws {@link Error} With no network, or when a chat is open already.
     */
    public openChat(role: "host"|"join", code: string|null, author: ChatAuthor): void {
        if(!this.#network) throw new Error("Le réseau n'est pas disponible ici.")
        if(this.#opened) throw new Error("Un chat est déjà ouvert : chat leave pour le quitter.")
        if(role === "host") this.#openHostedChat(this.#network, author)
        else this.#openJoinedChat(this.#network, code ?? "", author)
    }

    /** Close the group chat and its session, and leave its screen. Nothing happens with none open. */
    public leaveChat(): void {
        const opened = this.#opened
        if(!opened) return
        this.#opened = null
        opened.chat.dispose()
        opened.close()
        const wasShown = this.#chat.visible
        this.#chat.detach()
        this.#chat.visible = false
        if(wasShown) this.#leaveBench()
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
        if(this.#historian) this.#historian.engine = this.run
        if(this.#sound) this.#sound.engine = this.run
        this.#screen.engine = this.run
        this.#playing = true
        this.#travelOn()
    }


    readonly #menu: MainMenuScreen
    readonly #guide: GuideScreen
    #saves: SaveSlot<RunSave>|null = null
    #saver: RunSaver|null = null
    readonly #history: HistoryScreen
    #historySlot: SaveSlot<History>|null = null
    #historian: RunHistorian|null = null
    readonly #screen: RunScreen
    readonly #pnj: PnjScreen
    readonly #arm: ArmScreen
    readonly #parallax: ParallaxScreen
    readonly #spriteBench: SpriteBenchScreen
    readonly #library: LibraryScreen
    readonly #broadcaster: RunBroadcaster|null
    readonly #sound: RunSoundLink|null
    readonly #console: Console<MecardContext>

    /** Tell the player of a fault in the game console, and the JavaScript console too. */
    #printFault(text: string): void {
        console.error(text)
        this.#console.print(text)
    }

    readonly #consoleView: ConsoleView<MecardContext>
    readonly #network: MecardNetwork|null
    readonly #chat: ChatScreen
    readonly #lobby: LobbyScreen|null
    readonly #lobbyController: LobbyController|null
    readonly #exit: Layer

    /** The run of a lobby the screen shows in place of the one of the player, none when there is none. */
    #shared: { onReady: (() => void)|null, onOver?: (() => void)|null }|null = null
    #sharedCount = 0

    /** What the modes of the lobby ask of the screen. */
    readonly #bench: RunBench & RaceBench
    readonly #raceTab: RaceTab

    /** The group chat open, and what closes its session, none when there is none. */
    #opened: OpenedChat|null = null

    /** The room the game is hosted in, and what tells it the run, none when it is not hosted. */
    #hosted: { readonly room: OpenedRoom, readonly broadcaster: RunBroadcaster }|null = null

    /** What has clients play units, none when they only watch. */
    #host: RunHost|null = null

    #seed: number

    /** Whether a run is started: not while the main menu waits for a new game or the one kept. */
    #playing = false

    /** Whether the bench shown was opened from the menu, rather than from the run. */
    #benchFromMenu = false

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
        host.faulted.add(fault => this.#printFault(fault.describe()))
        this.#host = host
        this.#screen.locks = {
            ...NO_RUN_LOCKS, battle: { isLocked: unit => host.isGuests(unit), round: "gather" },
        }
    }

    /** Close everything this game holds open on the network: the chat, the hosted room, the lobby and its list. */
    public dispose(): void {
        this.leaveChat()
        this.#stopHosting()
        this.#lobbyController?.leave()
        this.#lobbyController?.watch(false)
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

    /** Host a room for the chat alone, and show the chat at once: the title tells the code once open. */
    #openHostedChat(network: MecardNetwork, author: ChatAuthor): void {
        const room = network.open()
        if(!room.room){
            room.close()
            throw new Error("Cette plateforme ne distingue pas les clients : pas de chat.")
        }
        const chat = new ChatHost(room.room, room, author)
        this.#showChat(chat, () => room.close(), "Chat · ouverture...")
        void room.ready.then(code => {
            if(this.#opened?.chat !== chat) return
            if(code instanceof Fault){
                this.leaveChat()
                this.#printFault(`Le chat n'a pas pu être hébergé : ${code.describe()}`)
                return
            }
            this.#chat.title = `Chat · code ${code}`
            this.#console.print(`Code du chat : ${code}`)
        })
    }

    /** Join the room of a chat, and show the chat at once: it is the title that tells when it is joined. */
    #openJoinedChat(network: MecardNetwork, code: string, author: ChatAuthor): void {
        const joined = network.join(code)
        if(!joined.link){
            joined.close()
            throw new Error("Cette plateforme ne permet pas de parler à l'hôte : pas de chat.")
        }
        const chat = new ChatGuest(joined.link, author)
        const ended = joined.ended.add(fault => {
            if(this.#opened?.chat !== chat) return
            this.leaveChat()
            this.#printFault(`Le chat s'est arrêté : ${fault.describe()}`)
        })
        this.#showChat(chat, () => {
            ended.dispose()
            joined.close()
        }, "Chat · connexion...")
        void joined.ready.then(opened => {
            if(this.#opened?.chat !== chat) return
            if(opened instanceof Fault){
                this.leaveChat()
                this.#printFault(`Le chat n'a pas pu être rejoint : ${opened.describe()}`)
                return
            }
            this.#chat.title = `Chat · code ${opened}`
        })
    }

    /** Show a chat opened, over what is shown. */
    #showChat(chat: Chat, close: () => void, title: string): void {
        this.#opened = { chat, close }
        this.#openBench()
        this.#chat.show(chat, title)
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
        this.#parallax.visible = false
        this.#spriteBench.visible = false
        this.#library.visible = false
        this.#guide.visible = false
        this.#history.visible = false
        this.#chat.visible = false
        if(this.#lobby) this.#lobby.visible = false
        this.#menu.visible = true
        this.#playing = false
        void this.#readSave()
    }

    /** Show the history alone, the menu left where it stands, with the games kept. */
    async #historyOn(): Promise<void> {
        try {
            this.#history.entries = (await this.#historySlot?.load())?.entries ?? []
        } catch(error){
            this.#history.entries = []
            this.#console.print(`L'historique n'a pas pu être lu : ${String(error)}`)
        }
        this.#menu.visible = false
        this.#history.visible = true
    }

    /** Show the lobby alone, the menu left where it stands. */
    #lobbyOn(): void {
        if(!this.#lobby) return
        this.#menu.visible = false
        this.#lobby.visible = true
    }

    /** Show a new run for the lobby to host, in place of the one of the player, which is left as it is. */
    #hostShared(): HostedRun {
        const run = this.#newSharedRun()
        const hosted: HostedRun = {
            run,
            startRound: () => this.#screen.battleScreen.startRound(),
            lockGuests: isGuests => {
                this.#screen.locks = { ...NO_RUN_LOCKS, battle: { isLocked: unit => isGuests(unit), round: "gather" } }
            },
            onReady: null,
            onOver: null,
            close: () => this.#closeShared(hosted),
        }
        this.#shared = hosted
        this.#screen.engine = run
        this.#travelOn()
        return hosted
    }

    /** Show the run another client plays for the lobby, once there is something to show of it. */
    #joinShared(): JoinedRun {
        const run = this.#newSharedRun()
        const joined: JoinedRun = {
            run,
            seat: units => { this.#screen.locks = locksForUnits(units) },
            onReady: null,
            close: () => this.#closeShared(joined),
        }
        this.#shared = joined
        this.#screen.engine = run
        this.#screen.locks = ALL_RUN_LOCKS
        const show = (): void => {
            if(this.#shared === joined && !this.#screen.visible) this.#benchesOff()
        }
        run.loaded.add(show)
        run.battleStarted.add(show)
        return joined
    }

    /** A run of its own for a lobby, which the saves of the player never see. */
    #newSharedRun(firstFloor?: FloorType): Run {
        return new Run(this.#seed * 7919 + ++this.#sharedCount, error => {
            this.#console.print(error instanceof Error ? error.message : String(error))
        }, firstFloor)
    }

    /** Show a new run for a player of a race, its own: the race shows over it what happens to its duels. */
    #raceShared(firstFloor: FloorType|null): RaceScreen {
        const run = this.#newSharedRun(firstFloor ?? undefined)
        const shared: { onReady: (() => void)|null, onOver?: (() => void)|null } = { onReady: null }
        const disposers: (() => void)[] = []
        this.#shared = shared
        this.#screen.engine = run
        this.#screen.locks = NO_RUN_LOCKS
        this.#travelOn()
        return {
            run,
            follow: player => disposers.push(this.#followRace(run, shared, player)),
            close: () => {
                for(const dispose of disposers) dispose()
                this.#raceTab.detach()
                this.#closeShared(shared)
            },
        }
    }

    /** What the run shows under the tab of the race: the battle, or the map. */
    #raceTabSpot(): "map"|"battle" {
        return this.#screen.battleScreen.visible ? "battle" : "map"
    }

    /**
     * Show the duels of a player of a race on its run: the duel it fights or watches takes the screen, with
     * only its units to plan, and the map comes back when it is over. What it says is ready goes to the hub.
     *
     * @returns What stops showing it.
     */
    #followRace(
        run: Run, shared: { onReady: (() => void)|null }, player: DuelRacePlayer,
    ): () => void {
        this.#raceTab.follow(player)
        let access: { readonly units: readonly string[], submit(): void }|null = null
        const show = (duel: DuelAccess): void => {
            access = duel
            this.#screen.locks = locksForUnits(duel.units)
            run.backToMap()
            run.playBattle(duel.battle)
        }
        shared.onReady = () => access?.submit()
        const observers = [
            player.fighting.add(show),
            player.watching.add(show),
            player.duelOver.add(() => {
                access = null
                this.#screen.locks = NO_RUN_LOCKS
                this.#screen.showMap()
            }),
        ]
        return () => {
            shared.onReady = null
            for(const observer of observers) observer.remove()
        }
    }

    /** Take the run of a lobby off the screen, the player's own back in its place, and show the lobby. */
    #closeShared(shared: object): void {
        if(this.#shared !== shared) return
        this.#shared = null
        this.#screen.locks = NO_RUN_LOCKS
        this.#screen.engine = this.run
        this.#screen.visible = false
        if(this.#lobby) this.#lobby.visible = true
    }

    /**
     * Leave the run of the lobby: the host ends it for everyone, a client leaves the game and stays in the room,
     * or leaves the room for a game that cannot be left on its own.
     */
    #leaveShared(): void {
        const controller = this.#lobbyController
        if(controller?.isHost) controller.stop()
        else if(!controller?.quitGame()) this.#leaveLobby()
    }

    /** Leave the lobby, and the room if the player is in one, for the menu. */
    #leaveLobby(): void {
        this.#lobbyController?.leave()
        this.#lobby?.reset()
        this.#menuOn()
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
            this.#playing = true
            this.#travelOn()
        }, (error: unknown) => {
            this.#console.print(`La sauvegarde n'a pas pu être lue : ${String(error)}`)
        })
    }

    /** Hide the benches, the run shown again. */
    #benchesOff(): void {
        this.#menu.visible = false
        this.#guide.visible = false
        this.#history.visible = false
        this.#chat.visible = false
        if(this.#lobby) this.#lobby.visible = false
        this.#pnj.visible = false
        this.#arm.visible = false
        this.#parallax.visible = false
        this.#spriteBench.visible = false
        this.#library.visible = false
        if(!this.#screen.visible) this.#screen.visible = true
    }

    /**
     * Hide all that a bench lies over, the menu and the guide too, and remember where it was opened from: the
     * menu, or the run. Going from a bench to another keeps what was remembered.
     */
    #openBench(): void {
        if(this.#menu.visible || this.#guide.visible) this.#benchFromMenu = true
        else if(this.#screen.visible) this.#benchFromMenu = false
        this.#menu.visible = false
        this.#guide.visible = false
        this.#history.visible = false
        this.#chat.visible = false
        if(this.#lobby) this.#lobby.visible = false
        this.#screen.visible = false
        this.#pnj.visible = false
        this.#arm.visible = false
        this.#parallax.visible = false
        this.#spriteBench.visible = false
        this.#library.visible = false
    }

    /** Leave a bench for where it was opened from: the menu, or the run. */
    #leaveBench(): void {
        if(this.#benchFromMenu) this.#menuOn()
        else this.#travelOn()
        this.#benchFromMenu = false
    }

    /** Show the bench of the characters alone, the run left where it stands. */
    #pnjOn(): void {
        this.#openBench()
        this.#pnj.visible = true
    }

    /** Show the bench of the forearm alone, the run left where it stands. */
    #armOn(): void {
        this.#openBench()
        this.#arm.visible = true
    }

    /** Show the bench of the parallaxes alone, on the one a visual names, the run left where it stands. */
    #parallaxOn(parallax: Visual): void {
        this.#openBench()
        this.#parallax.visible = true
        this.#parallax.show(parallax)
    }

    /** Show the bench of the sprites alone, on the one a visual names, the run left where it stands. */
    #spritesOn(sprite: Visual|null): void {
        this.#openBench()
        this.#spriteBench.visible = true
        this.#spriteBench.show(sprite)
    }

    /** Show the catalogue alone, the run left where it stands. */
    #libraryOn(): void {
        this.#openBench()
        this.#library.visible = true
    }


}
