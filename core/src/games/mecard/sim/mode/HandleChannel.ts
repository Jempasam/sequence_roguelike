import { Fault } from "../../../../engine/net/Fault"

import type { GameMember } from "./GameMember"
import type { GameModeShareable } from "./GameModeShareable"

/**
 * A way to say something to the other end and to ask it: what a client holds of the manager, what the manager
 * holds of a client or of the owner of an instance.
 *
 * @remarks
 * What is said to it arrives in the order it was said, whoever says it: see the guarantees in MODE.md.
 */
export interface HandleChannel {
    /**
     * Say something, which is not answered.
     *
     * @returns `false` when it is refused: the other end is gone, or does not take it.
     */
    notify(message: GameModeShareable): void|false

    /**
     * Ask something: what the other end answers, a value or a promise of it, or a {@link NoAnswerFault}.
     *
     * @param timeoutMs - How long to wait for an answer, for ever by default.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ask(message: GameModeShareable, timeoutMs?: number): any
}

/** Why there was no answer to an `ask`. */
export type NoAnswerCause =
    /** It took too long. */
    | "timeout"
    /** The other end left the game. */
    | "quit"
    /** Nobody was there to answer, or the answer could not be given. */
    | "unreachable"

/** Nobody answered an `ask`. */
export class NoAnswerFault extends Fault {


    constructor(
        public readonly detail: string,

        /** Why: the mode tells one that is too slow from one that is gone. */
        public readonly cause: NoAnswerCause = "unreachable",
    ){
        super()
    }


    public readonly who = null

    public describe(): string {
        return `Personne n'a répondu : ${this.detail}`
    }
}

/** The way to no one: what is said is refused, and what is asked is not answered. */
export const NO_ONE: HandleChannel = {
    notify: () => false,
    ask: () => new NoAnswerFault("nobody on the other end"),
}

/**
 * Something said on an instance, or by a client to the manager: who said it, what the manager gave it with
 * `control`, and what it said.
 */
export class Heard {


    constructor(
        /** Who said it, none for the manager. */
        public readonly from: GameMember|null,

        /** What the manager gave `from` with `control`: none for the manager, or one not acting. */
        public readonly info: GameModeShareable,

        public readonly message: GameModeShareable,
    ){}
}

/** What a mode does with what is said to it. */
export interface Reactions {
    /**
     * Someone said something.
     *
     * @returns Whether it was done: `false` refuses it.
     */
    act?(heard: Heard): boolean|void

    /** Someone asked something: what it returns is the answer. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ask?(heard: Heard): any
}

/** What an owner of an instance is told by: each thing said on the instance, with who said it. */
export interface HeardChannel {
    /** Something was said. `false` refuses it. */
    notify(heard: Heard): void|false

    /** Something was asked: the answer, a value or a promise of it. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ask(heard: Heard): any
}

/**
 * The channel of an owner that reacts to what is said on its instance, each thing by its own part. What it has
 * no part for is left out, and an `act` with none is refused.
 */
export function reacting(reactions: Reactions): HeardChannel {
    return {
        notify: heard => {
            if(!reactions.act) return false
            return reactions.act(heard) === false ? false : undefined
        },
        ask: heard => {
            if(reactions.ask) return reactions.ask(heard)
            return new NoAnswerFault("nobody listens")
        },
    }
}
