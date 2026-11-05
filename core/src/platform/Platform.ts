import type { AssetsPort } from "./AssetsPort"
import type { ClipboardPort } from "./ClipboardPort"
import type { GfxPort } from "./GfxPort"
import type { InputPort } from "./InputPort"
import type { LoopPort } from "./LoopPort"
import type { NetPort } from "./NetPort"
import type { StoragePort } from "./StoragePort"
import type { SyncPort } from "./SyncPort"

/**
 * Everything core needs from its environment. `web/` and `desktop/` each build one and hand it to
 * `startGame`, so core never touches a browser or Node API directly.
 */
export interface Platform {
    readonly gfx: GfxPort
    readonly loop: LoopPort
    readonly input: InputPort
    readonly clipboard: ClipboardPort
    readonly assets: AssetsPort
    readonly storage: StoragePort

    /** The network, none in an environment without one. */
    readonly net?: NetPort

    /** The channel to the other clients of the game, none when it is played alone. */
    readonly sync?: SyncPort
}
