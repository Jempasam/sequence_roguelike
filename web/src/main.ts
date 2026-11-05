import { NetSync, startGame } from "@game/core"
import type { SyncPort } from "@game/core"

import { BrowserNet, FetchAssets, IndexedDbStorage, TabSync, WebClipboard, WebGfx, WebInput, WebLoop } from "./platform"

/** The port of the signaling server when `?signal` gives no other address: the one `npm run server` uses. */
const SIGNALING_PORT = 8787

const canvas = document.querySelector<HTMLCanvasElement>("#game")
if(!canvas) throw new Error("index.html has no <canvas id=\"game\">.")

// `?view=CODE` watches a game hosted from the console, `?view=CODE&guest` plays what its host gives, and
// `?view` alone watches the game another tab of this browser plays. `?signal=ws://...` names another
// signaling server.
const query = new URLSearchParams(location.search)
const net = new BrowserNet()
const signaling = query.get("signal") ?? `ws://${location.hostname}:${SIGNALING_PORT}`
const viewed = query.get("view")
const sync = syncOf()

startGame({
    gfx: new WebGfx(canvas),
    loop: new WebLoop(),
    input: new WebInput(canvas),
    clipboard: new WebClipboard(navigator.clipboard),
    assets: new FetchAssets(import.meta.env.BASE_URL, BUILD_ID),
    storage: new IndexedDbStorage(indexedDB, navigator.locks, () => navigator.storage.persist()),
    net,
    signaling,
    sync,
    connect,
})

function syncOf(): SyncPort {
    if(viewed){
        const viewing = NetSync.view(net, signaling, viewed, query.has("guest"))
        viewing.ready.catch(error => console.error(`Could not watch the game ${viewed}:`, error))
        return viewing
    }
    return new TabSync(query.has("view") ? "viewer" : "main")
}

/** Load the page again on a game hosted, the signaling server kept. */
function connect(code: string, guest: boolean): void {
    const next = new URLSearchParams({ view: code })
    if(guest) next.set("guest", "")
    const signal = query.get("signal")
    if(signal !== null) next.set("signal", signal)
    location.search = next.toString()
}
