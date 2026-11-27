import { AssetError } from "../../../engine/assets"
import type { Assets } from "../../../engine/assets"
import type { SoundPlayer } from "../../../engine/audio"
import type { Painter } from "../../../engine/gpu"
import type { InputFrame } from "../../../engine/input"
import { Label } from "../../../engine/ui"
import type { Theme, UiRoot } from "../../../engine/ui"
import { Run } from "../sim/run/Run"
import { RunGuest } from "../sync/run/RunGuest"
import { RunReceiver } from "../sync/run/RunReceiver"
import type { SyncLink, SyncSource } from "../sync/SyncChannel"

import { lendPictures } from "./look/pictureShelf"
import { UnitSprites } from "./look/UnitSprites"
import { DIM_TEXT, WARNING_TEXT } from "./look/theme"
import { ALL_RUN_LOCKS, RunScreen } from "./run/RunScreen"
import { seatRun, viewRun } from "./run/runWiring"
import { Forwarded } from "./forward/Forwarded"
import { RunParticleLink } from "./particles/RunParticleLink"
import { Ambient } from "./travel/ambient/Ambient"
import { seededRandom } from "../../../engine/particles"
import { UiSoundLink } from "./sound/UiSoundLink"

/** What the viewer says before the first battle comes. */
const WAITING = "En attente d'une partie à regarder..."

/**
 * Dungeon of the Mecard, watched: the run played on another client, as it comes. A {@link RunReceiver} keeps
 * a {@link Run} of its own where the other client's stands, and a {@link RunScreen} with everything locked
 * shows it, each thing played to its end before the next.
 *
 * @remarks
 * Given a way to the host, it came to play: a {@link RunGuest} hears what it plays, and that alone is opened
 * on the screen. The rest stays the host's, and the rounds come as they do to anyone watching.
 */
export class MecardViewer {


    /** The run watched, an empty one before the first comes. */
    public readonly run = new Run(0)

    constructor(
        theme: Theme,

        /** The interface the viewer lays its panels in. */
        public readonly ui: UiRoot,

        /** Where the battles and the journey come from. */
        source: SyncSource,

        /** Where the pictures of the units and of the journey come from. */
        assets: Assets,

        /** Where a point of the interface, in virtual pixels, lies in the world, in its pixels. */
        toWorld: (x: number, y: number) => readonly [number, number],

        /** Where a point of the world, in its pixels, lies in the interface, in virtual pixels. */
        toUi: (x: number, y: number) => readonly [number, number],

        /** The way to the host, none for a viewer that only watches. */
        link: SyncLink|null = null,

        /** What plays the sounds of the run watched, none when it is watched silent. */
        sounds: SoundPlayer|null = null,
    ){
        const forwarded = new Forwarded(error => this.#warn(String(error)))
        this.#uiSound = sounds ? new UiSoundLink(ui, sounds) : null
        const sprites = new UnitSprites()
        lendPictures(theme, sprites.picture)
        this.#particles = new RunParticleLink(this.run, forwarded, () => sprites.gold)
        this.#ambient = new Ambient(seededRandom(this.run.rng.state), error => this.#warn(String(error)))
        void sprites.load(ui.gpu, assets).catch((error: unknown) => {
            if(!(error instanceof AssetError)) throw error
            this.#warn(`Les sprites des unités n'ont pas pu être chargés : ${error.message}`)
        })
        this.#screen = new RunScreen(ui, this.run, {
            theme, assets, sprites, toWorld, toUi, sounds: this.#uiSound, forwarded,
            particles: this.#particles,
            ambient: this.#ambient,
            locks: ALL_RUN_LOCKS,
            restart: () => {},
            ready: () => this.#guest?.ready(),
            report: text => this.#warn(text),
        })
        this.#view = viewRun(this.run, this.#screen, sounds, forwarded)
        this.#screen.visible = false
        // Laid after the screens, so what goes wrong is told over them.
        this.#waiting = new Label(theme, WAITING, { color: DIM_TEXT })
        ui.addLayer("waiting").content.add(this.#waiting, { x: "center", y: "center" })
        const started = (): void => this.#show()
        this.run.loaded.add(started)
        this.run.battleStarted.add(started)
        this.#receiver = new RunReceiver(this.run, source)
        this.#receiver.faulted.add(fault => this.#warn(fault.describe()))
        this.#receiver.battle.desynced.add(({ round }) => this.#warn(`Désynchronisé au round ${round} : rattrapé.`))
        this.#receiver.travel.desynced.add(() => this.#warn("Désynchronisé sur la carte : rattrapé."))
        if(link){
            this.#guest = new RunGuest(this.run, link, units => seatRun(this.#screen, this.run, units))
            this.#guest.faulted.add(fault => this.#warn(fault.describe()))
        }
    }


    /** Read the input, then let the screen shown play and draw, once something came. */
    public frame(input: InputFrame, world: Painter, dt: number): void {
        this.ui.handle(input)
        this.#screen.frame(input, world, dt)
    }

    /** Stop listening for the run. */
    public dispose(): void {
        this.#view.dispose()
        this.#particles.dispose()
        this.#uiSound?.dispose()
        this.#guest?.dispose()
        this.#receiver.dispose()
        this.#screen.dispose()
    }


    readonly #view: { dispose(): void }
    readonly #particles: RunParticleLink
    readonly #ambient: Ambient
    readonly #uiSound: UiSoundLink|null
    readonly #receiver: RunReceiver
    readonly #screen: RunScreen
    readonly #waiting: Label

    /** What plays the units the host gives, none for a viewer that only watches. */
    #guest: RunGuest|null = null

    /** Show what came, the waiting line going away. */
    #show(): void {
        if(this.#screen.visible) return
        this.#waiting.visible = false
        this.#screen.visible = true
    }

    /** Say what went wrong where the waiting line is, over the journey. */
    #warn(text: string): void {
        console.error(text)
        this.#waiting.text = text
        this.#waiting.color = WARNING_TEXT
        this.#waiting.visible = true
    }
}
