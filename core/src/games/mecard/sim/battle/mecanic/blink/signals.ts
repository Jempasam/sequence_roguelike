import { SignalKey } from "../../ObserverMap"
import type { JumpSignal } from "../relocation/signals"

/** A unit blinked. */
export const BLINKED = new SignalKey<JumpSignal>("blinked")
