import { SignalKey } from "../../ObserverMap"
import type { JumpSignal } from "../relocation/signals"

/** A unit teleported. */
export const TELEPORTED = new SignalKey<JumpSignal>("teleported")
