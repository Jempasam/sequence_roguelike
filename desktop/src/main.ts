import { parseArgs } from "node:util"
import { video } from "@kmamal/sdl"
import { NetSync, startGame } from "@game/core"

import { assetsDirectory, saveDirectory } from "./directories"
import { FsAssets, FsStorage, NodeNet, SdlClipboard, SdlGfx, SdlInput, SdlLoop } from "./platform"

/** The signaling server when `--signal` names no other: the one `npm run server` starts on this host. */
const DEFAULT_SIGNALING = "ws://localhost:8787"

// `--host` hosts the game over the network, `--view CODE` watches one hosted so.
const { values: args } = parseArgs({
    options: { host: { type: "boolean" }, view: { type: "string" }, signal: { type: "string" } },
    strict: true,
})
const net = new NodeNet()
const signaling = args.signal ?? DEFAULT_SIGNALING
const sync = syncOf()

const window = video.createWindow({
    title: "Roguelike",
    width: 1280,
    height: 720,
    resizable: true,
    opengl: true,
    vsync: true,
})

const game = startGame({
    gfx: new SdlGfx(window),
    loop: new SdlLoop(window),
    input: new SdlInput(window),
    clipboard: new SdlClipboard(),
    assets: new FsAssets(assetsDirectory()),
    storage: new FsStorage(saveDirectory()),
    net,
    sync,
})

/** Settles once the window has closed, so a host such as build/dev.mjs knows when to shut down. */
export const closed = new Promise<void>(resolve => window.on("close", () => {
    game.dispose()
    resolve()
}))

function syncOf(): NetSync|undefined {
    if(args.host){
        const hosting = NetSync.host(net, signaling, "Dungeon of the Mecard")
        hosting.ready.then(
            code => console.log(`Hosting on ${signaling}: viewers start with --view ${code}`),
            error => console.error(`Could not host on ${signaling}:`, error),
        )
        return hosting
    }
    if(args.view === undefined) return undefined
    const viewing = NetSync.view(net, signaling, args.view)
    viewing.ready.catch(error => console.error(`Could not watch the game ${args.view}:`, error))
    return viewing
}
