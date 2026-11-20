import { Fault } from "../../../../engine/net/Fault"
import type { Observer } from "../../sim/base/Observable"

import { ChatGuest } from "../chat/ChatGuest"
import type { Chat } from "../chat/Chat"
import { signal } from "../faults"
import type { SyncLink, SyncSource } from "../SyncChannel"

import type { LobbyMode, ModeRun } from "./LobbyMode"
import { UnknownModeFault } from "./ModeSelection"
import { ModeSelectionView } from "./ModeSelectionView"
import { hueOfName } from "./Profile"
import { RosterView } from "./RosterView"
import { checkValues } from "./Setting"
import { GuestStage } from "./Stage"

/**
 * What lives in a room as long as it is open, as a client sees it: who is in it, the chat, the mode the
 * host set, and the game it plays from the lobby. A game is played on a stage of its own, dropped when the
 * host says it is over.
 *
 * @remarks
 * A client that hears a game is being played as soon as it hears of the lobby came in late: it watches.
 * The chat is made once the host has said who this client is, so what it says is under the name it was given.
 */
export class LobbyGuest {


    /** Told of what was dealt with: a message left out, a game that could not be played or ended badly. */
    public readonly faulted = signal<Fault>()

    /** Told each time the chat is made, or a game starts or ends for this client. */
    public readonly changed = signal<void>()

    public readonly roster: RosterView
    public readonly selection: ModeSelectionView

    constructor(
        private readonly link: SyncLink,
        private readonly source: SyncSource,

        /** The name it asks the host for. */
        name: string,

        /** The modes the host may offer. */
        private readonly modes: readonly LobbyMode[],
    ){
        this.roster = new RosterView(link, source, name)
        this.selection = new ModeSelectionView(source)
        this.#observers = [
            this.roster.faulted.add(fault => this.faulted.notify(fault)),
            this.roster.changed.add(() => this.#makeChat()),
            this.selection.faulted.add(fault => this.faulted.notify(fault)),
            this.selection.changed.add(() => this.#follow()),
        ]
        // What a session tells at once, as it is listened to, was told before this was listening.
        this.#makeChat()
        this.#follow()
    }


    /** The chat, none until the host has said who this client is. */
    public get chat(): Chat|null { return this.#chat }

    /** Is a game being played by this client? */
    public get playing(): boolean { return this.#run !== null }

    /** Stop the game and the chat, and stop listening. It leaves the session open. */
    public dispose(): void {
        this.#stop()
        for(const observer of this.#observers) observer.remove()
        this.#chat?.dispose()
        this.#chat = null
        this.selection.dispose()
        this.roster.dispose()
    }


    readonly #observers: Observer[]
    #chat: Chat|null = null
    #run: ModeRun|null = null
    #stage: GuestStage|null = null
    #ended: Observer|null = null

    /** Is a game being played in the lobby, whether or not this client could join it? */
    #inGame = false

    #makeChat(): void {
        const { self } = this.roster
        if(this.#chat || !self) return
        this.#chat = new ChatGuest(this.link, { name: self.name, hue: hueOfName(self.name) })
        this.#chat.faulted.add(fault => this.faulted.notify(fault))
        this.changed.notify()
    }

    #follow(): void {
        const { state, previous } = this.selection
        if(!state) return
        if(state.playing && !this.#inGame){
            this.#inGame = true
            this.#join(state.mode, state.values, previous === null ? "spectator" : "player")
        } else if(!state.playing && this.#inGame){
            this.#inGame = false
            this.#stop()
        }
    }

    #join(id: string, values: Readonly<Record<string, string|number>>, role: "player"|"spectator"): void {
        const mode = this.modes.find(each => each.id === id)
        if(!mode){
            this.faulted.notify(new UnknownModeFault(id))
            return
        }
        const invalid = checkValues(mode.settings, values)
        if(invalid){
            this.faulted.notify(invalid)
            return
        }
        const stage = new GuestStage(role === "player" ? this.link : null, this.source, this.roster.self?.id ?? null)
        const run = mode.guest(stage, values, role)
        if(run instanceof Fault){
            stage.dispose()
            this.faulted.notify(run)
            return
        }
        this.#stage = stage
        this.#run = run
        this.#ended = run.ended.add(fault => {
            this.#stop()
            if(fault) this.faulted.notify(fault)
        })
        this.changed.notify()
    }

    #stop(): void {
        const run = this.#run
        const stage = this.#stage
        if(!run || !stage) return
        this.#run = null
        this.#stage = null
        this.#ended?.remove()
        this.#ended = null
        run.dispose()
        stage.dispose()
        this.changed.notify()
    }
}
