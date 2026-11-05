import { spawn } from "node:child_process"
import { parseArgs } from "node:util"
import { video } from "@kmamal/sdl"
import { NetSync, startGame } from "@game/core"

import { assetsDirectory, saveDirectory } from "./directories"
import { FsAssets, FsStorage, NodeNet, SdlClipboard, SdlGfx, SdlInput, SdlLoop } from "./platform"

/** The signaling server when `--signal` names no other: the one `npm run server` starts on this host. */
const DEFAULT_SIGNALING = "ws://localhost:8787"

// `--view CODE` watches a game hosted from the console, and with `--guest` plays what its host gives.
const { values: args } = parseArgs({
    options: { view: { type: "string" }, guest: { type: "boolean" }, signal: { type: "string" } },
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
    signaling,
    sync,
    connect,
})

/** Settles once the window has closed, so a host such as build/dev.mjs knows when to shut down. */
export const closed = new Promise<void>(resolve => window.on("close", () => {
    game.dispose()
    resolve()
}))

function syncOf(): NetSync|undefined {
    if(args.view === undefined) return undefined
    const viewing = NetSync.view(net, signaling, args.view, args.guest)
    viewing.ready.catch(error => console.error(`Could not watch the game ${args.view}:`, error))
    return viewing
}

/** Start the program again on a game hosted, the signaling server kept, and close this one. */
function connect(code: string, guest: boolean): void {
    const options = ["--view", code, "--signal", signaling, ...guest ? ["--guest"] : []]
    const program = [...process.execArgv, ...process.argv.slice(1, 2), ...options]
    spawn(process.execPath, program, { detached: true, stdio: "inherit" }).unref()
    window.destroy()
}
