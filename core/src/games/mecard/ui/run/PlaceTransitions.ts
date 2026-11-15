import type { Assets } from "../../../../engine/assets"
import { Color } from "../../../../engine/math"
import { Fade, Transition } from "../../../../engine/ui"
import type { Stack, Theme, TransitionPlay, UiRoot } from "../../../../engine/ui"

import type { Visual } from "../../sim/base/Visual"
import { allPlaceTypes } from "../../sim/catalog/places"
import { BACK_VISUAL } from "../../sim/run/PlaceType"
import { distinctPictures, transitionPath, transitionTintOf } from "../look/visualPath"

/** How long the transition entering a place takes, in seconds. */
const ENTER_DURATION = 1.5

/** What plays a transition: its painting, or a fade to the color of its visual where it has none. */
type Playable = Transition|Fade

/** The transitions into the places, each loaded once, played over the screens. */
export class PlaceTransitions {


    constructor(
        ui: UiRoot,

        /** The look of the text of a fade. */
        public readonly theme: Theme,

        /** Where their paintings come from. */
        public readonly assets: Assets,

        /** Tell the players something went wrong. */
        public readonly report: (text: string) => void,
    ){
        this.#ui = ui
        this.#layer = ui.addLayer("transition").content
        // Loaded now, so the first place entered does not wait for its transition.
        for(const visual of distinctPictures([...allPlaceTypes().map(type => type.transition), BACK_VISUAL])) void this.#of(visual)
    }


    /** Wait for the transition a visual names to be loaded, so playing it does not wait. */
    public async ready(visual: Visual): Promise<void> {
        await this.#of(visual)
    }

    /** Play the transition back to the map, done at its middle, where what it hides may change. */
    public leave(): Promise<void> {
        return this.enter(BACK_VISUAL)
    }

    /** Play the transition a visual names, done at its middle, where what it hides may change. */
    public async enter(visual: Visual): Promise<void> {
        const transition = await this.#of(visual)
        const tint = transitionTintOf(visual)
        await new Promise<void>(middle => transition.play({ duration: ENTER_DURATION, tint, onMiddle: middle }))
    }

    /** Play the transition a visual names as it is asked to, its coloration tinting it unless the play says. */
    public async play(visual: Visual, play: TransitionPlay): Promise<void> {
        const transition = await this.#of(visual)
        transition.play({ tint: transitionTintOf(visual), ...play })
    }


    readonly #ui: UiRoot

    /** What they are shown in, over the screens. */
    readonly #layer: Stack

    /** The transitions, by the key of their visual, as they load. */
    readonly #byKey = new Map<string, Promise<Playable>>()

    /** A transition, loaded the first time it is asked for and laid in its layer. */
    #of(visual: Visual): Promise<Playable> {
        let loading = this.#byKey.get(visual.visual)
        if(!loading){
            loading = this.#load(visual)
            this.#byKey.set(visual.visual, loading)
        }
        return loading
    }

    /** Its painting, or when it cannot be read, a fade to its color writing its description. */
    async #load(visual: Visual): Promise<Playable> {
        const path = transitionPath(visual)
        let playable: Playable
        try {
            playable = Transition.fromImage(this.#ui.gpu, await this.assets.layeredImage(path), path)
        } catch(error){
            if(!(error instanceof Error)) throw error
            this.report(`La transition ${path} n'a pas pu être chargée : ${error.message}`)
            playable = new Fade(this.theme, new Color(...visual.color), visual.description)
        }
        this.#layer.add(playable, { x: "stretch", y: "stretch" })
        return playable
    }
}
