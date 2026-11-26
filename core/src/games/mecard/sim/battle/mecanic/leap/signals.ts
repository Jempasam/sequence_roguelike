import { SignalKey } from "../../ObserverMap"
import type { JumpSignal } from "../relocation/signals"

/** A unit leapt, or was thrown out of where it had no room. */
export const LEAPED = new SignalKey<JumpSignal>("leaped")
