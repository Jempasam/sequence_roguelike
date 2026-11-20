import type { Fault } from "../../../../engine/net/Fault"
import { VersionMismatchFault } from "../../../../engine/net/NetFaults"

import { signal, UnreadableFault } from "../faults"
import { PROFILE_REFUSED_TOPIC, PROFILE_TOPIC, ROSTER_SELF_TOPIC, ROSTER_TOPIC } from "../SyncChannel"
import type { SyncLink, SyncSource } from "../SyncChannel"

import { LOBBY_VERSION } from "./Profile"
import {
    readRefusedMessage, readRosterMessage, readSelfMessage, writeProfileMessage,
} from "./RosterMessage"
import type { RosterEntry, SelfMessage } from "./RosterMessage"

/**
 * Who is in the lobby, as a client sees it: it says who it is, and hears the list the host keeps, and who the
 * host made of it. It changes nothing of the list.
 */
export class RosterView {


    /** Told each time the list or who this client is changes. */
    public readonly changed = signal<void>()

    /** Told of what came and could not be read. */
    public readonly faulted = signal<Fault>()

    /** Told once, when the host turns this client away: it speaks another version of the lobby. */
    public readonly refused = signal<Fault>()

    constructor(
        private readonly link: SyncLink,

        /** What the host tells everyone, which the list comes on. */
        source: SyncSource,

        /** The name it asks for, which the host may change. */
        name: string,
    ){
        this.#handles = [
            ROSTER_TOPIC.source(source).listen(text => this.#roster(text)),
            ROSTER_SELF_TOPIC.link(link).listen(text => this.#self(text)),
            PROFILE_REFUSED_TOPIC.link(link).listen(text => this.#refused(text)),
        ]
        this.#say(name)
    }


    /** Everyone in the lobby, in the order they came, the host first: none until the host has told. */
    public get members(): readonly RosterEntry[] { return this.#members }

    /** Who this client is, with the name it was given: none until the host has told. */
    public get self(): SelfMessage|null { return this.#self_ }

    /** Ask for another name. */
    public rename(name: string): void {
        this.#say(name)
    }

    /** Stop listening. */
    public dispose(): void {
        for(const handle of this.#handles) handle.dispose()
    }


    readonly #handles: readonly { dispose(): void }[]
    #members: readonly RosterEntry[] = []
    #self_: SelfMessage|null = null

    #say(name: string): void {
        PROFILE_TOPIC.link(this.link).send(writeProfileMessage({ version: LOBBY_VERSION, name }))
    }

    #roster(text: string): void {
        const read = readRosterMessage(text)
        if(read instanceof UnreadableFault){
            this.faulted.notify(read)
            return
        }
        this.#members = read.members
        this.changed.notify()
    }

    #self(text: string): void {
        const read = readSelfMessage(text)
        if(read instanceof UnreadableFault){
            this.faulted.notify(read)
            return
        }
        this.#self_ = read
        this.changed.notify()
    }

    #refused(text: string): void {
        const read = readRefusedMessage(text)
        if(read instanceof UnreadableFault){
            this.faulted.notify(read)
            return
        }
        this.refused.notify(new VersionMismatchFault("this client", LOBBY_VERSION, read.ours))
    }
}
