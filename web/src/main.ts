import { NetSync, startGame } from "@game/core"
import type { SyncPort } from "@game/core"

import { BrowserNet, FetchAssets, IndexedDbStorage, TabSync, WebClipboard, WebGfx, WebInput, WebLoop } from "./platform"

/** The port of the signaling server when `?signal` gives no other address: the one `npm run server` uses. */
const SIGNALING_PORT = 8787

const canvas = document.querySelector<HTMLCanvasElement>("#game")
if(!canvas) throw new Error("index.html has no <canvas id=\"game\">.")

// `?host` hosts the game over the network, `?view=CODE` watches one hosted so, and `?view` alone watches
// the game another tab of this browser plays. `?signal=ws://...` names another signaling server.
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
    sync,
})

function syncOf(): SyncPort {
    if(query.has("host")){
        const hosting = NetSync.host(net, signaling, "Dungeon of the Mecard")
        // No screen shows the code yet: it goes to the console, where the host copies it to the viewers.
        hosting.ready.then(
            code => console.log(`Hosting on ${signaling}: viewers open ?view=${code}`),
            error => console.error(`Could not host on ${signaling}:`, error),
        )
        return hosting
    }
    if(viewed){
        const viewing = NetSync.view(net, signaling, viewed)
        viewing.ready.catch(error => console.error(`Could not watch the game ${viewed}:`, error))
        return viewing
    }
    return new TabSync(query.has("view") ? "viewer" : "main")
}
