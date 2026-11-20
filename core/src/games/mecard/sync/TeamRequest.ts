import type { SyncPeer } from "../../../platform"
import { Fault } from "../../../engine/net/Fault"
import { duelSave } from "../sim/duel/duelBattle"
import { BATTLE_SAVE_VERSION, loadBattle } from "../sim/save/battleSave"
import type { SavedUnit } from "../sim/save/battleSave"

import { Asker } from "./Asker"
import { TEAM_TOPIC } from "./SyncChannel"
import { InvalidTeamFault, signal, UnreadableFault } from "./faults"
import { detailOf, readJson, wrongShape, wrongVersion } from "./read"

/** The question a client is asked: the team it brings. It has no content. */
export const TEAM_QUESTION = ""

/** What a client answers: the units it brings, and the version of the saves they are written in. */
interface TeamMessage {
    readonly version: number
    readonly units: readonly SavedUnit[]
}

/** The answer of a client: its units as sent. */
export function writeTeamMessage(units: readonly SavedUnit[]): string {
    const message: TeamMessage = { version: BATTLE_SAVE_VERSION, units }
    return JSON.stringify(message)
}

/** The units a client answered, or why they cannot be read. */
export function readTeamMessage(text: string): SavedUnit[]|UnreadableFault {
    const message = readJson(TEAM_TOPIC.name, text) as Partial<TeamMessage>|null|UnreadableFault
    if(message instanceof UnreadableFault) return message
    if(typeof message !== "object" || message === null || !Array.isArray(message.units)){
        return wrongShape(TEAM_TOPIC.name, text, "team")
    }
    if(message.version !== BATTLE_SAVE_VERSION){
        return wrongVersion(TEAM_TOPIC.name, text, message.version, BATTLE_SAVE_VERSION)
    }
    return message.units as SavedUnit[]
}

/**
 * Whether the simulation can load a team: the one that brings it is never trusted. Everything the simulation
 * does with it is tried here first, in a battle of the team alone, and what it refuses is a fault: nothing is
 * loaded for real from what a client sent without this.
 *
 * @returns Why it cannot be loaded, none when it can.
 */
export function teamFault(who: string, units: readonly SavedUnit[]): Fault|null {
    if(units.length === 0) return new InvalidTeamFault(who, "it has no unit.")
    if(units.some(unit => typeof unit !== "object" || unit === null || typeof unit.name !== "string")){
        return new InvalidTeamFault(who, "a unit has no name.")
    }
    try {
        loadBattle(duelSave([[{ name: who, units }]], 0))
        return null
    } catch(error){
        return new InvalidTeamFault(who, detailOf(error))
    }
}

/**
 * What asks the clients of a duel for the team each brings, and checks it before it is taken: an
 * {@link Asker} on the teams topic, and the check of {@link teamFault}.
 *
 * @remarks
 * A client that does not answer in time, leaves, or brings a team that cannot be loaded is a fault, and only
 * that client is left out: the answer to its question says why.
 */
export class TeamRequest {


    /** Told of each team received and found loadable, with who brought it. */
    public readonly teamReceived = signal<{ readonly id: string, readonly units: readonly SavedUnit[] }>()

    /** Told of each client left out, by the fault that says why: no answer, or a team not loadable. */
    public readonly faulted = signal<Fault>()

    constructor(
        private readonly asker: Asker,

        /** How long a client has to answer, in milliseconds. */
        private readonly timeoutMs: number,
    ){}


    /**
     * Ask a client for its team.
     *
     * @returns The units it brings, or why it brings none. It never rejects.
     */
    public async ask(peer: SyncPeer): Promise<SavedUnit[]|Fault> {
        const answer = await this.asker.ask(peer, TEAM_QUESTION, this.timeoutMs)
        if(answer instanceof Fault) return this.#fault(answer)
        const units = readTeamMessage(answer)
        if(units instanceof Fault) return this.#fault(units)
        const fault = teamFault(peer.id, units)
        if(fault) return this.#fault(fault)
        this.teamReceived.notify({ id: peer.id, units })
        return units
    }


    #fault(fault: Fault): Fault {
        this.faulted.notify(fault)
        return fault
    }
}
