import { Keyword } from "../../../../../../semantic"

/** Letting a step go by without playing anything. */
export const SKIP_TURN = new Keyword("passer son tour")

/** Greying out a step not played yet, so it never plays. */
export const DISABLE = new Keyword("griser")
