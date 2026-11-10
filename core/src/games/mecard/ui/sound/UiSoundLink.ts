import type { SoundPath, SoundPlayer } from "../../../../engine/audio"
import { Button, ChoiceOption } from "../../../../engine/ui"
import type { Component, UiRoot } from "../../../../engine/ui"
import { AbsItemIcon } from "../hud/AbsItemIcon"
import { CardView } from "../hud/CardView"
import { HoverPanel } from "../hud/HoverPanel"

/** The channel the sounds of the interface are played on. */
export const UI_CHANNEL = "ui"

/** One sound of the interface: the file, and how loud it is played to sit with the others. */
interface Cue {
    /** The file of the sound. */
    readonly path: SoundPath

    /** The factor its volume is multiplied by, since the files are not recorded at the same level. */
    readonly volume: number
}

/** The pointer comes over something: the last part of the sound of a card, a faint tick. */
const HOVER: Cue = { path: "mecard/sounds/card_hover.wav", volume: 0.8 }

/** Something clickable is pressed. */
const PRESS: Cue = { path: "mecard/sounds/click.wav", volume: 1 }

/** Something clickable is released. */
const RELEASE: Cue = { path: "mecard/sounds/declick.wav", volume: 0.6 }

/** Every sound the link plays, loaded as it starts. */
const CUES: readonly Cue[] = [HOVER, PRESS, RELEASE]

/** The button of the pointer that clicks. */
const MAIN_BUTTON = 0

/**
 * Does a component sound under the pointer, and does it do something when clicked? None for one that
 * stays silent.
 */
function clickableOf(component: Component): boolean|null {
    if(component instanceof Button) return component.enabled ? true : null
    if(component instanceof ChoiceOption || component instanceof CardView
        || component instanceof AbsItemIcon || component instanceof HoverPanel) return component.onPick !== null
    return null
}

/**
 * Tells the speakers what the pointer does to the buttons, the options of a choice, the cards, the icons of
 * the usables and the panels of the units: a sound when it comes over one, none when it leaves, and, for
 * what a click does something on, one when it is pressed and one when it is released, played by a
 * {@link SoundPlayer}.
 *
 * @remarks
 * Made like a broadcaster, it reads the interface and changes nothing of it. A disabled button, and every
 * other interactive component, stay silent. What is no component, the places of the map and the units of
 * the arena, tells it with {@link UiSoundLink.hover} and {@link UiSoundLink.press}.
 */
export class UiSoundLink {


    constructor(
        ui: UiRoot,

        /** What plays the sounds. */
        public readonly player: SoundPlayer,
    ){
        player.preload(CUES.map(cue => cue.path))
        this.#listening = ui.onInteraction((kind, component, button) => {
            const clickable = clickableOf(component)
            if(clickable === null) return
            if(kind === "hover-enter") this.hover(true)
            else if(kind === "hover-leave") this.hover(false)
            else if(button !== MAIN_BUTTON || !clickable) return
            else if(kind === "press") this.press()
            else if(kind === "release") this.release()
        })
    }


    /**
     * The pointer comes over something that is no component, a place of the map or a unit of the arena, or
     * leaves it. Only coming over is heard.
     */
    public hover(over: boolean): void {
        if(over) this.#play(HOVER)
    }

    /** Something that is no component is clicked: the pointer presses it. */
    public press(): void {
        this.#play(PRESS)
    }

    /** What was pressed is released. */
    public release(): void {
        this.#play(RELEASE)
    }

    /** Stop playing the sounds of the interface. */
    public dispose(): void {
        this.#listening.dispose()
    }


    readonly #listening: { dispose(): void }

    #play({ path, volume }: Cue): void {
        this.player.play(UI_CHANNEL, path, { volume })
    }
}
