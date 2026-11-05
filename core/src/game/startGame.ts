import { Assets } from "../engine/assets"
import { Gpu, Painter, RenderTexture, ScreenSurface, TextureSurface } from "../engine/gpu"
import { InputSystem } from "../engine/input"
import { Color } from "../engine/math"
import { NetSync } from "../engine/net"
import { UiRoot } from "../engine/ui"
import { MecardGame, MecardViewer, mecardTheme } from "../games/mecard/ui"
import type { MecardNetwork } from "../games/mecard/ui"
import type { Platform } from "../platform"

/** The size of the world as drawn, in pixels, before its integer upscale to the screen. */
const LOW_RES_WIDTH = 320
const LOW_RES_HEIGHT = 180

/** The color of the world behind the board, and of the screen around the upscaled world. */
const BACKGROUND = new Color(0.05, 0.04, 0.08)

/** The seed of the first run. Each new run takes the next one. */
const FIRST_SEED = 1

/** The name of the rooms of the game, which clients are told. */
const ROOM_NAME = "Dungeon of the Mecard"

/**
 * Runs the game on `platform` until the returned handle is disposed: Dungeon of the Mecard, the first
 * game of the repository. Played, and sent to the viewers when the platform has a channel to them, or to a
 * room its console opens; or watched, its units played when the host gives some, when the platform is a
 * viewer of another client.
 */
export function startGame(platform: Platform): { dispose(): void } {
    const { gfx, loop } = platform
    const input = new InputSystem(platform.input)
    const gpu = new Gpu(gfx)
    const screen = new ScreenSurface(gpu)
    const lowRes = new RenderTexture(gpu, LOW_RES_WIDTH, LOW_RES_HEIGHT, { depth: "renderbuffer" })
    const world = new TextureSurface(gpu, lowRes)
    const painter = new Painter(gpu, world)
    const ui = new UiRoot(gpu, screen, { clipboard: platform.clipboard })
    // How the world lies on the screen: its whole scale and its offset, set at each frame.
    let scale = 1
    let offsetX = 0
    let offsetY = 0
    const toWorld = (x: number, y: number) => [
        (x * ui.scale - offsetX) / scale, (y * ui.scale - offsetY) / scale,
    ] as const
    const toUi = (x: number, y: number) => [
        (x * scale + offsetX) / ui.scale, (y * scale + offsetY) / ui.scale,
    ] as const
    const theme = mecardTheme(gpu)
    const sync = platform.sync
    const game = sync?.role === "viewer"
        ? new MecardViewer(theme, ui, sync, new Assets(platform.assets), toWorld, toUi, sync.link)
        : new MecardGame(
            theme, ui, new Assets(platform.assets), FIRST_SEED, toWorld, toUi, sync ?? null,
            networkOf(platform),
        )

    loop.start(dtMs => {
        const dt = dtMs / 1000
        const fit = Math.min(screen.width / LOW_RES_WIDTH, screen.height / LOW_RES_HEIGHT)
        scale = Math.max(1, Math.floor(fit))
        offsetX = Math.floor((screen.width - LOW_RES_WIDTH * scale) / 2)
        offsetY = Math.floor((screen.height - LOW_RES_HEIGHT * scale) / 2)
        painter.setTarget(world)
        world.clear(BACKGROUND, true)
        game.frame(input.beginFrame(dt), painter, dt)
        painter.setTarget(screen)
        screen.clear(BACKGROUND)
        painter.push()
        painter.translate(offsetX, offsetY)
        painter.scale(scale)
        painter.sprite(lowRes.sprite, 0, 0)
        painter.pop()
        ui.render()
        gpu.flush()
        gfx.present()
    })

    return {
        dispose: () => {
            loop.stop()
            if(game instanceof MecardViewer) game.dispose()
            ui.dispose()
            lowRes.dispose()
            gpu.dispose()
        },
    }
}

/** How the game reaches the others, none on a platform missing a part of it. */
function networkOf({ net, signaling, connect }: Platform): MecardNetwork|null {
    if(!net || signaling === undefined || !connect) return null
    return { open: () => NetSync.host(net, signaling, ROOM_NAME), connect }
}
