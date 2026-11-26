import { Gpu, Painter, RenderTexture, ScreenSurface, TextureSurface } from "../engine/gpu"
import { InputSystem } from "../engine/input"
import { Color } from "../engine/math"
import { CosmosGame } from "../games/cosmos/game/CosmosGame"
import { LevelPanel, PANEL_WIDTH } from "../games/cosmos/ui/LevelPanel"
import type { Removable } from "../lifetime"
import type { Platform } from "../platform"

/** The size of the world as drawn, in pixels, before its integer upscale to the screen. */
const LOW_RES_WIDTH = 320
const LOW_RES_HEIGHT = 180

/** The color of the empty space, and of the screen around the upscaled world. */
const SPACE = new Color(0.01, 0.01, 0.03)

/**
 * Runs the universe of procedural scales on `platform` until the returned handle is disposed: a target to
 * move, turn around and zoom, from the galaxies down to the ground.
 */
export function startCosmos(platform: Platform, seed = Math.floor(Math.random() * 0x7fffffff)): Removable {
    const { gfx, loop } = platform
    const input = new InputSystem(platform.input)
    const gpu = new Gpu(gfx)
    const screen = new ScreenSurface(gpu)
    const lowRes = new RenderTexture(gpu, LOW_RES_WIDTH, LOW_RES_HEIGHT, { depth: "renderbuffer" })
    const world = new TextureSurface(gpu, lowRes)
    const painter = new Painter(gpu, world)
    const game = new CosmosGame(seed)
    const panel = new LevelPanel(gpu)

    loop.start(dtMs => {
        const dt = Math.min(0.1, dtMs / 1000)
        const room = screen.width - PANEL_WIDTH
        const fit = Math.min(room / LOW_RES_WIDTH, screen.height / LOW_RES_HEIGHT)
        const scale = Math.max(1, Math.floor(fit))
        painter.setTarget(world)
        world.clear(SPACE, true)
        game.frame(input.beginFrame(dt), painter, dt)
        painter.setTarget(screen)
        screen.clear(SPACE, true)
        painter.push()
        painter.setDepthTest("always")
        painter.translate(
            Math.floor((room - LOW_RES_WIDTH * scale) / 2),
            Math.floor((screen.height - LOW_RES_HEIGHT * scale) / 2),
        )
        painter.scale(scale)
        painter.sprite(lowRes.sprite, 0, 0)
        painter.pop()
        painter.push()
        painter.setDepthTest("always")
        panel.draw(painter, game.panel(), game.speedFactor, screen.width, screen.height)
        painter.pop()
        gpu.flush()
        gfx.present()
    })

    return {
        remove: () => {
            loop.stop()
            lowRes.dispose()
            gpu.dispose()
        },
    }
}
