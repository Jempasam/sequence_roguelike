import type { Fault } from "../../../../engine/net/Fault"
import { VersionMismatchFault } from "../../../../engine/net/NetFaults"
import type { SyncPeer, SyncRoom } from "../../../../platform"

import { signal, UnreadableFault } from "../faults"
import { PROFILE_REFUSED_TOPIC, PROFILE_TOPIC, ROSTER_SELF_TOPIC, ROSTER_TOPIC } from "../SyncChannel"
import type { SyncSender } from "../SyncChannel"

import { cleanName, HOST_ID, LOBBY_VERSION, uniqueName } from "./Profile"
import {
    readProfileMessage, writeRefusedMessage, writeRosterMessage, writeSelfMessage,
} from "./RosterMessage"
import type { RosterEntry } from "./RosterMessage"
import type { Removable } from "../../../../lifetime"

/** A client of the lobby that told who it is. */
interface Present {
    readonly peer: SyncPeer
    name: string
    lost: boolean
}

/**
 * Who is in the lobby, as the host keeps it: each client says who it is, and the host tells everyone the whole
 * list, as a state, so whoever connects or comes back is told how it stands.
 *
 * @remarks
 * The host is the authority on names: a client asks for one, and gets it cleaned and made different from the
 * others, then is told what it was given. Someone is in the list from the moment they say who they are to the
 * moment they leave for good; a connection that is only lost keeps its place, marked lost.
 *
 * It lives as long as the lobby, not as long as a game: it is given the room of the lobby.
 */
export class Roster {


    /** Told each time someone comes, is lost, comes back, leaves or changes name. */
    public readonly changed = signal<void>()

    /** Told of what was dealt with: a message left out, a client turned away. */
    public readonly faulted = signal<Fault>()

    constructor(
        room: SyncRoom,
        sender: SyncSender,
        hostName: string,
    ){
        this.#sender = ROSTER_TOPIC.sender(sender)
        this.#hostName = cleanName(hostName)
        this.#handles = [
            room.onJoin(peer => this.#listen(peer)),
            room.onLost(peer => this.#lose(peer)),
            room.onBack(peer => this.#return(peer)),
            room.onLeave(peer => this.#leave(peer)),
            this.#sender.onPeer(() => this.#text()),
        ]
    }


    /** Everyone in the lobby, in the order they came, the host first. */
    public get members(): readonly RosterEntry[] {
        const guests = [...this.#present].map(([id, { name, lost }]) => ({ id, name, lost }))
        return [{ id: HOST_ID, name: this.#hostName, lost: false }, ...guests]
    }

    /** The name someone goes by, none when they are not in the lobby. */
    public nameOf(id: string): string|null {
        return this.members.find(member => member.id === id)?.name ?? null
    }

    /** Change the name the host goes by: it is cleaned, and made different from the names of the guests. */
    public rename(name: string): void {
        const guests = [...this.#present.values()].map(present => present.name)
        this.#hostName = uniqueName(cleanName(name), guests)
        this.#tellAll()
    }

    /** Stop following the lobby. */
    public dispose(): void {
        for(const handle of this.#handles) handle.remove()
        for(const handles of this.#listening.values()) handles.remove()
        this.#listening.clear()
    }


    readonly #sender: SyncSender
    readonly #handles: readonly Removable[]
    readonly #present = new Map<string, Present>()
    readonly #listening = new Map<string, Removable>()
    #hostName: string

    #listen(peer: SyncPeer): void {
        this.#listening.get(peer.id)?.remove()
        this.#listening.set(peer.id, PROFILE_TOPIC.link(peer).listen(text => this.#profile(peer, text)))
    }

    #profile(peer: SyncPeer, text: string): void {
        const profile = readProfileMessage(text)
        if(profile instanceof UnreadableFault){
            this.faulted.notify(profile)
            return
        }
        if(profile.version !== LOBBY_VERSION){
            PROFILE_REFUSED_TOPIC.link(peer).send(writeRefusedMessage({ ours: LOBBY_VERSION }))
            this.faulted.notify(new VersionMismatchFault(peer.id, profile.version, LOBBY_VERSION))
            return
        }
        const known = this.#present.get(peer.id)
        const others = this.members.filter(member => member.id !== peer.id).map(member => member.name)
        const name = uniqueName(cleanName(profile.name), others)
        if(known) known.name = name
        else this.#present.set(peer.id, { peer, name, lost: false })
        this.#tellSelf(peer.id)
        this.#tellAll()
    }

    #lose(peer: SyncPeer): void {
        const present = this.#present.get(peer.id)
        if(!present || present.lost) return
        present.lost = true
        this.#tellAll()
    }

    #return(peer: SyncPeer): void {
        const present = this.#present.get(peer.id)
        if(!present) return
        present.lost = false
        this.#tellSelf(peer.id)
        this.#tellAll()
    }

    #leave(peer: SyncPeer): void {
        this.#listening.get(peer.id)?.remove()
        this.#listening.delete(peer.id)
        if(this.#present.delete(peer.id)) this.#tellAll()
    }

    /** Tell a client who it is: the name it asked for may not be the one it was given. */
    #tellSelf(id: string): void {
        const present = this.#present.get(id)
        if(!present) return
        ROSTER_SELF_TOPIC.link(present.peer).send(writeSelfMessage({ id, name: present.name }))
    }

    #tellAll(): void {
        this.#sender.send(this.#text())
        this.changed.notify()
    }

    #text(): string {
        return writeRosterMessage({ members: this.members })
    }
}
