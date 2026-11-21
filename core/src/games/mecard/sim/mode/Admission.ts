import type { Fault } from "../../../../engine/net/Fault"

/**
 * What a mode makes of someone who joins, or joins again, while its game is played: it takes part, or it is
 * told why it does not. What a participant is to the game after that (a seat, a side, a life) is the mode's
 * own, which it keeps by the id of the member.
 */
export type Admission =
    | { readonly kind: "accept" }
    | { readonly kind: "refuse", readonly fault: Fault }

/** The admissions a mode gives. */
export const Admissions = {
    /** It takes part. */
    accept: (): Admission => ({ kind: "accept" }),

    /** It is told why it does not take part. */
    refuse: (fault: Fault): Admission => ({ kind: "refuse", fault }),
} as const
