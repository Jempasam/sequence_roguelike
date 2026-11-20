import { randomInt } from "node:crypto"

import { Room } from "./Room"
import type { RoomOptions } from "./Room"
import type { Session } from "./Session"

/** The letters of a room code: no 0 nor O, no 1 nor I, so a code read aloud or copied by hand stays right. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** How many letters a room code has: 32^6, about a billion codes. */
const CODE_LENGTH = 6

/**
 * The open rooms, by code. The server gives each room its code, so two hosts never fight over a name, and
 * forgets the room once it is over.
 */
export class RoomRegistry {


    /** How many rooms are open. */
    public get size(): number { return this.#rooms.size }

    /**
     * Open a room owned by a session, under a code no other open room has: the one asked for, or one the
     * server makes up. Checking and taking the code is one step, so of two sessions asking for the same code
     * at once, exactly one gets the room.
     *
     * @param asked - The code the owner wants, in capitals. None to have one made up.
     * @returns The room, none when the code asked for is taken.
     */
    public create(owner: Session, options: Omit<RoomOptions, "code">, asked?: string): Room|null {
        let code = asked ?? codeOf()
        if(asked === undefined) while(this.#rooms.has(code)) code = codeOf()
        else if(this.#rooms.has(code)) return null
        const room = new Room({ ...options, code }, owner, over => this.#rooms.delete(over.code))
        this.#rooms.set(code, room)
        return room
    }

    /** The open room with this code, none when there is no such room. */
    public find(code: string): Room|null {
        return this.#rooms.get(code.toUpperCase()) ?? null
    }


    readonly #rooms = new Map<string, Room>()
}

function codeOf(): string {
    return Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("")
}
