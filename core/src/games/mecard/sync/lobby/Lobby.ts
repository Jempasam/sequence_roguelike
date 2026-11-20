import { Fault } from "../../../../engine/net/Fault"
import type { Observer } from "../../sim/base/Observable"

import { ChatHost } from "../chat/ChatHost"
import type { Chat } from "../chat/Chat"
import { signal } from "../faults"
import type { SyncRoom, SyncSender } from "../SyncChannel"

import { LobbyRoom } from "./LobbyRoom"
import type { LobbyMode, ModeRun } from "./LobbyMode"
import { LockedFault, ModeSelection } from "./ModeSelection"
import { ParticipantChoices } from "./ParticipantChoices"
import { hueOfName } from "./Profile"
import { Roster } from "./Roster"
import { checkValues } from "./Setting"
import { HostStage } from "./Stage"

/**
 * What lives in a room as long as it is open, as the host keeps it: who is in it, the chat, the mode it
 * is set on, and the game played from it. A game is played on a stage of its own, dropped when it is over:
 * the players come back to the lobby with the session as it was.
 *
 * @remarks
 * It is given the room and the sender of the session as they are, and opens no connection nor closes any.
 */
export class Lobby {


    /** Told of what was dealt with: a message left out, a client turned away, a game that ended badly. */
    public readonly faulted = signal<Fault>()

    /** Told each time a game starts or ends. */
    public readonly gameChanged = signal<void>()

    public readonly roster: Roster
    public readonly selection: ModeSelection
    public readonly chat: Chat

    constructor(
        room: SyncRoom,
        sender: SyncSender,
        hostName: string,

        /** The modes offered, the first of which the lobby is set on at first. */
        modes: readonly LobbyMode[],

        /** What the host sets for itself, told to the game it starts. */
        private readonly choices: ParticipantChoices = new ParticipantChoices(),
    ){
        this.#room = new LobbyRoom(room)
        this.#sender = sender
        this.roster = new Roster(this.#room, sender, hostName)
        this.selection = new ModeSelection(sender, modes)
        const host = this.roster.members[0].name
        this.chat = new ChatHost(this.#room, sender, { name: host, hue: hueOfName(host) })
        this.#observers = [
            this.roster.faulted.add(fault => this.faulted.notify(fault)),
            this.chat.faulted.add(fault => this.faulted.notify(fault)),
        ]
    }


    /** Is a game being played? */
    public get playing(): boolean { return this.#run !== null }

    /** Start the game of the mode the lobby is set on, or say why it cannot be. */
    public start(): Fault|null {
        if(this.#run) return new LockedFault()
        const { mode, values } = this.selection
        const invalid = checkValues(mode.settings, values)
        if(invalid) return invalid
        const stage = new HostStage(this.#room, this.#sender, this.selection.nextGame, this.chat)
        const run = mode.host(stage, values, this.choices.valuesFor(mode))
        if(run instanceof Fault){
            stage.dispose()
            return run
        }
        this.#stage = stage
        this.#run = run
        this.#ended = run.ended.add(fault => this.#over(fault))
        // The stage takes in the clients of the lobby once the game is made, which is one task after: what a
        // client says as it is told the game starts would be lost to a game that is not listening yet. They
        // are told the game starts before the stage greets them, so they are listening too.
        queueMicrotask(() => {
            if(this.#run !== run) return
            this.selection.begin()
            stage.greetAll()
        })
        this.gameChanged.notify()
        return null
    }

    /** End the game being played, if any, and unlock the mode. */
    public stop(): void {
        this.#over(null)
    }

    /** End the game, and stop following the room. It leaves the session open. */
    public dispose(): void {
        this.#over(null)
        for(const observer of this.#observers) observer.remove()
        this.chat.dispose()
        this.selection.dispose()
        this.roster.dispose()
    }


    readonly #room: LobbyRoom
    readonly #sender: SyncSender
    readonly #observers: Observer[]
    #run: ModeRun|null = null
    #stage: HostStage|null = null
    #ended: Observer|null = null

    #over(fault: Fault|null): void {
        const run = this.#run
        const stage = this.#stage
        if(!run || !stage) return
        this.#run = null
        this.#stage = null
        this.#ended?.remove()
        this.#ended = null
        run.dispose()
        stage.dispose()
        this.selection.end()
        if(fault) this.faulted.notify(fault)
        this.gameChanged.notify()
    }
}
