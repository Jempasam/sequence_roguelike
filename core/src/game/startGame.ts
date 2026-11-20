import { Assets } from "../engine/assets"
import { SOUND_SETTINGS_FORMAT, SOUND_SLOT_KEY, SoundPlayer, SoundSettings } from "../engine/audio"
import type { SoundSettingsSave } from "../engine/audio"
import { Gpu, Painter, RenderTexture, ScreenSurface, TextureSurface } from "../engine/gpu"
import { InputSystem } from "../engine/input"
import { Color } from "../engine/math"
import { NetSync, signalingAt } from "../engine/net"
import { SaveSlot } from "../engine/save"
import { UiRoot } from "../engine/ui"
import { HISTORY_FORMAT, HISTORY_SLOT_KEY } from "../games/mecard/sim/save/historySave"
import { RUN_SAVE_FORMAT, RUN_SLOT_KEY } from "../games/mecard/sim/save/runSlot"
import { HostDirectory } from "../games/mecard/sync/hosts/HostDirectory"
import { MecardGame, MecardViewer, mecardTheme } from "../games/mecard/ui"
import type { MecardNetwork } from "../games/mecard/ui"
import type { Platform, PlayerStorage } from "../platform"

/** The size of the world as drawn, in pixels, before its integer upscale to the screen. */
const LOW_RES_WIDTH = 320
const LOW_RES_HEIGHT = 180

/** The color of the world behind the board, and of the screen around the upscaled world. */
const BACKGROUND = new Color(0.1, 0.06, 0.03)

/** The seed of the first run, drawn at each launch. Each new run takes the next one. */
const firstSeed = (): number => Math.floor(Math.random() * 0x7fffffff)

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
    const assets = new Assets(platform.assets)
    const soundSettings = new SoundSettings()
    // Silent on a platform without speakers.
    const sounds = platform.audio
        ? new SoundPlayer(soundSettings, platform.audio, assets, text => console.warn(text))
        : null
    const game = sync?.role === "viewer"
        ? new MecardViewer(theme, ui, sync, assets, toWorld, toUi, sync.link, sounds)
        : new MecardGame(
            theme, ui, assets, firstSeed(), toWorld, toUi, sync ?? null,
            networkOf(platform), platform.clipboard, sounds,
        )
    // The storage opens on its own time: the menu offers to go on once the run kept is read. None when
    // another instance of the game holds it, which then keeps nothing.
    let storage: PlayerStorage|null = null
    let closed = false
    if(game instanceof MecardGame){
        platform.storage.open().then(opened => {
            if(closed || !opened){
                if(opened) void opened.close()
                else game.report("Une autre instance du jeu tient les sauvegardes : rien ne sera sauvegardé.")
                return
            }
            storage = opened
            game.keep(new SaveSlot(opened, RUN_SLOT_KEY, RUN_SAVE_FORMAT))
            game.keepHistory(new SaveSlot(opened, HISTORY_SLOT_KEY, HISTORY_FORMAT))
            const soundSlot = new SaveSlot(opened, SOUND_SLOT_KEY, SOUND_SETTINGS_FORMAT)
            keepSoundSettings(soundSettings, soundSlot, text => game.report(text))
        }, (error: unknown) => game.report(`Les sauvegardes ne sont pas disponibles : ${String(error)}`))
    }

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
        // The world covers the screen but for its bands, the only part cleared.
        clearBands(painter, screen.width, screen.height, offsetX, offsetY, LOW_RES_WIDTH * scale, LOW_RES_HEIGHT * scale)
        painter.push()
        // The depth of the screen is undefined after a present and a resize, and it has no use: no test.
        painter.setDepthTest("always")
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
            closed = true
            if(storage) void storage.close()
            if(game instanceof MecardViewer || game instanceof MecardGame) game.dispose()
            ui.dispose()
            lowRes.dispose()
            gpu.dispose()
        },
    }
}

/**
 * Clear the bands of the screen around the world, drawn at `(x, y)` over `width × height` pixels: nothing
 * when the world covers the whole screen. The painter draws in the screen.
 */
function clearBands(
    painter: Painter, screenWidth: number, screenHeight: number,
    x: number, y: number, width: number, height: number,
): void {
    const bands = [
        [0, 0, screenWidth, y],
        [0, y + height, screenWidth, screenHeight - y - height],
        [0, y, x, height],
        [x + width, y, screenWidth - x - width, height],
    ]
    for(const [bandX, bandY, bandWidth, bandHeight] of bands){
        if(bandWidth <= 0 || bandHeight <= 0) continue
        painter.push()
        painter.clip(bandX, bandY, bandWidth, bandHeight)
        painter.clear(BACKGROUND)
        painter.pop()
    }
}

/** How the game reaches the others, none on a platform missing a part of it. */
function networkOf({ net, timer, signaling, connect }: Platform): MecardNetwork|null {
    if(!net || !timer || signaling === undefined || !connect) return null
    const signalingConnector = signalingAt(net, timer, signaling)
    return {
        open: () => NetSync.host(net, signalingConnector, ROOM_NAME, timer),
        connect,
        join: code => NetSync.view(net, signalingConnector, code, timer, true),
        directory: () => HostDirectory.open(net, signalingConnector, timer),
        timer,
    }
}

/** Read the sound settings kept, and keep them from then on each time they change. */
function keepSoundSettings(
    settings: SoundSettings, slot: SaveSlot<SoundSettingsSave>, report: (text: string) => void,
): void {
    slot.load().then(
        save => {
            if(save) settings.restore(save)
            settings.onChanged = changed => {
                slot.save(changed.save()).catch((error: unknown) => report(`Les r�glages du son n'ont pas pu �tre sauvegard�s : ${String(error)}`))
            }
        },
        (error: unknown) => report(`Les r�glages du son n'ont pas pu �tre lus : ${String(error)}`),
    )
}
