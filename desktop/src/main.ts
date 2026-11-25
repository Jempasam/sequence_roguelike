import { spawn } from "node:child_process"
import { parseArgs } from "node:util"
import { video } from "@kmamal/sdl"
import { Fault, NetSync, signalingAt, startGame } from "@game/core"

import { assetsDirectories, audioWorkerFile, saveDirectory, sdlAddonFile } from "./directories"
import {
    FsAssets, FsStorage, NodeNet, NodeTimer, SdlClipboard, SdlGfx, SdlInput, SdlLoop, SdlWorkerAudio,
} from "./platform"

/** The signaling server when `--signal` names no other: the one `npm run server` starts on this host. */
const DEFAULT_SIGNALING = "ws://localhost:8787"

// `--view CODE` watches a game hosted from the console, and with `--guest` plays what its host gives.
const { values: args } = parseArgs({
    options: { view: { type: "string" }, guest: { type: "boolean" }, signal: { type: "string" } },
    strict: true,
})
const net = new NodeNet()
const timer = new NodeTimer()
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
    audio: new SdlWorkerAudio(audioWorkerFile(), sdlAddonFile()),
    assets: new FsAssets(assetsDirectories()),
    storage: new FsStorage(saveDirectory()),
    net,
    timer,
    signaling,
    sync,
    connect,
})

/**
 * Settles when the program shuts down, just before it exits. The window is not destroyed: the end of the
 * process closes it, and the process ends whatever keeps Node alive (sockets, native threads).
 */
let resolveClosed: () => void = () => {}
let shuttingDown = false
export const closed = new Promise<void>(resolve => {
    resolveClosed = resolve
})

window.on("beforeClose", event => {
    // The window is kept as it is until the process ends.
    event.prevent()
    shutdown()
})

function shutdown(): void {
    if(shuttingDown) return
    shuttingDown = true
    try {
        game.remove()
    }
    catch(error){
        console.error("The game did not dispose cleanly:", error)
    }
    finally {
        resolveClosed()
        process.exit(0)
    }
}

function syncOf(): NetSync|undefined {
    if(args.view === undefined) return undefined
    const viewing = NetSync.view(net, signalingAt(net, timer, signaling), args.view, timer, args.guest)
    void viewing.ready.then(ready => {
        if(ready instanceof Fault) console.error(`Could not watch the game ${args.view}:`, ready.describe())
    })
    return viewing
}

/** Start the program again on a game hosted, the signaling server kept, and close this one. */
function connect(code: string, guest: boolean): void {
    const options = ["--view", code, "--signal", signaling, ...guest ? ["--guest"] : []]
    const program = [...process.execArgv, ...process.argv.slice(1, 2), ...options]
    spawn(process.execPath, program, { detached: true, stdio: "inherit" }).unref()
    shutdown()
}
