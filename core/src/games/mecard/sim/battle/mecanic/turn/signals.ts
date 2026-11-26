import { SignalKey } from "../../ObserverMap"
import type { GlideSignal } from "../relocation/signals"

/** A unit turned, on the spot or moved a little to find room. */
export const TURNED = new SignalKey<GlideSignal>("turned")
