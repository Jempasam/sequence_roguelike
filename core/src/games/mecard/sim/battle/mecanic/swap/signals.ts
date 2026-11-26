import { SignalKey } from "../../ObserverMap"
import type { JumpSignal } from "../relocation/signals"

/** A unit took the place of another in a swap: told once for each of the two. */
export const SWAPPED = new SignalKey<JumpSignal>("swapped")
