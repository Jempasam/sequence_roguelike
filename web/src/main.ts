import { Fault, NetSync, signalingAt, startGame } from "@game/core"
import type { SyncPort } from "@game/core"

import {
    BrowserNet, FetchAssets, IndexedDbStorage, TabSync, WebAudio, WebClipboard, WebGfx, WebInput, WebLoop, WebTimer,
} from "./platform"

// peerjss://0.peerjs.com
const SIGNALING_SERVER = `ws://${location.hostname}:8787`

const canvas = document.querySelector<HTMLCanvasElement>("#game")
if(!canvas) throw new Error("index.html has no <canvas id=\"game\">.")

// `?view=CODE` watches a game hosted from the console, `?view=CODE&guest` plays what its host gives, and
// `?view` alone watches the game another tab of this browser plays. `?signal=ws://...` names another
// signaling server.
const query = new URLSearchParams(location.search)
const net = new BrowserNet()
const timer = new WebTimer()
const signaling = query.get("signal") ?? SIGNALING_SERVER
const viewed = query.get("view")
const sync = syncOf()

if(query.has("noreload")){
    try{
        if ((import.meta as any).hot) {
            (import.meta as any).hot.on('vite:beforeFullReload', () => {
                throw '(skipping full reload)';
            });
        }
    }catch(_){}
}

startGame({
    gfx: new WebGfx(canvas),
    loop: new WebLoop(),
    input: new WebInput(canvas),
    clipboard: new WebClipboard(navigator.clipboard),
    audio: new WebAudio(new AudioContext()),
    assets: new FetchAssets(import.meta.env.BASE_URL, BUILD_ID),
    storage: new IndexedDbStorage(indexedDB, navigator.locks, () => navigator.storage.persist()),
    net,
    timer,
    signaling,
    sync,
    connect,
})

function syncOf(): SyncPort {
    if(viewed){
        const viewing = NetSync.view(net, signalingAt(net, timer, signaling), viewed, timer, query.has("guest"))
        void viewing.ready.then(ready => {
            if(ready instanceof Fault) console.error(`Could not watch the game ${viewed}:`, ready.describe())
        })
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
