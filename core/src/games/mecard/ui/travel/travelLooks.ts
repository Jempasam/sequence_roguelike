import type { PnjCue } from "../../sim/halt/SceneLook"

import {
    FEAR_ANIMATION, LAUGH_ANIMATION, NO_ANIMATION, POMP_ANIMATION, SPIN_ANIMATION, STRIKE_ANIMATION,
    SURPRISE_ANIMATION, YES_ANIMATION,
} from "../pnj/PnjAnimation"
import type { PnjAnimation } from "../pnj/PnjAnimation"

/** What each move a halt names plays. */
export const CUE_ANIMATIONS: Readonly<Record<PnjCue, PnjAnimation>> = {
    pomp: POMP_ANIMATION,
    strike: STRIKE_ANIMATION,
    fear: FEAR_ANIMATION,
    yes: YES_ANIMATION,
    no: NO_ANIMATION,
    surprise: SURPRISE_ANIMATION,
    laugh: LAUGH_ANIMATION,
    spin: SPIN_ANIMATION,
}
