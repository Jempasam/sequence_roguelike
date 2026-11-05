import type { Assets, LayeredImagePath } from "../../../../engine/assets"
import { Transition } from "../../../../engine/ui"
import type { Stack, TransitionPlay, UiRoot } from "../../../../engine/ui"

import { PLACE_LOOKS } from "../travel/placeLooks"

/** How long the transition entering a place takes, in seconds. */
const ENTER_DURATION = 1.5

/** The transitions into the places, each loaded once, played over the screens. */
export class PlaceTransitions {


    constructor(
        ui: UiRoot,

        /** Where their paintings come from. */
        public readonly assets: Assets,

        /** Tell the players something went wrong. */
        public readonly report: (text: string) => void,
    ){
        this.#ui = ui
        this.#layer = ui.addLayer("transition").content
        // Loaded now, so the first place entered does not wait for its transition.
        const paths = new Set(Object.values(PLACE_LOOKS).map(look => look.transition))
        for(const path of paths) void this.#of(path)
    }


    /** Play a transition, done at its middle, where what it hides may change: at once when it has none. */
    public async enter(path: LayeredImagePath): Promise<void> {
        const transition = await this.#of(path)
        if(!transition) return
        await new Promise<void>(middle => transition.play({ duration: ENTER_DURATION, onMiddle: middle }))
    }

    /** Play a transition as it is asked to, nothing when it cannot be. */
    public async play(path: LayeredImagePath, play: TransitionPlay): Promise<void> {
        const transition = await this.#of(path)
        transition?.play(play)
    }


    readonly #ui: UiRoot

    /** What they are shown in, over the screens. */
    readonly #layer: Stack

    /** The transitions, by their painting, as they load: none for one that could not. */
    readonly #byPath = new Map<LayeredImagePath, Promise<Transition|null>>()

    /** A transition, loaded the first time it is asked for and laid in its layer, none when it cannot be. */
    #of(path: LayeredImagePath): Promise<Transition|null> {
        let loading = this.#byPath.get(path)
        if(!loading){
            loading = this.#load(path)
            this.#byPath.set(path, loading)
        }
        return loading
    }

    async #load(path: LayeredImagePath): Promise<Transition|null> {
        try {
            const transition = Transition.fromImage(this.#ui.gpu, await this.assets.layeredImage(path), path)
            this.#layer.add(transition, { x: "stretch", y: "stretch" })
            return transition
        } catch(error){
            if(!(error instanceof Error)) throw error
            this.report(`La transition ${path} n'a pas pu être chargée : ${error.message}`)
            return null
        }
    }
}
