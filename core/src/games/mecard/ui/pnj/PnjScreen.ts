import { AssetError } from "../../../../engine/assets"
import type { Assets, LayeredImagePath } from "../../../../engine/assets"
import { Sprite, Texture } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Box, Button, Label, Panel, Scroll, Slider } from "../../../../engine/ui"
import type { Component, Layer, Theme, UiRoot } from "../../../../engine/ui"

import { PNJ_HATS } from "../../sim/halt/PnjHats"
import type { PnjHatLook } from "../../sim/halt/PnjHats"

import { DIM_TEXT } from "../look/theme"
import { Pnj } from "./Pnj"
import { PnjActor } from "./PnjActor"
import { PNJ_ANIMATIONS } from "./PnjAnimation"
import { PNJ_SHRINK, PnjRig } from "./PnjRig"
import { PnjView } from "./PnjView"
import type { PnjHat } from "./PnjView"

/** The character shown on the bench. */
const PNJ_PATH: LayeredImagePath = "mecard/pnj/merchant.ora"

/** The hats tried on, by their name on the buttons, and how large each is worn. */
const HATS: readonly PnjHatLook[] = Object.values(PNJ_HATS)

/** The colors of clothes and of hats tried on, by their name on the buttons, none for those painted. */
const CLOTHES: readonly { readonly label: string, readonly color: Color|null }[] = [
    { label: "Peints", color: null },
    { label: "Bleu", color: new Color(0.25, 0.45, 1) },
    { label: "Vert", color: new Color(0.35, 0.9, 0.35) },
    { label: "Violet", color: new Color(0.75, 0.35, 1) },
    { label: "Or", color: new Color(1, 0.8, 0.3) },
    { label: "Gris", color: new Color(0.8, 0.8, 0.8) },
]

/** How many buttons a row of the side holds. */
const ROW_BUTTONS = 2

/** The width of the side of the controls, in virtual pixels, and the space around and between things. */
const SIDE_WIDTH = 150
const MARGIN = 4

/** How many steps a slider of the pose has on each side of 0. */
const SLIDER_STEPS = 100

/** What the bench hears from the game. */
export interface PnjHost {
    /** Tell the players something went wrong. */
    report(text: string): void

    /** Leave the bench, back to the journey. */
    leave(): void
}

/** A setting of the pose, as a slider shows it. */
interface PoseSetting {
    readonly label: string
    readonly min: number

    /** The highest value, 1 when none. */
    readonly max?: number

    read(pnj: Pnj): number
    write(pnj: Pnj, value: number): void
}

/** The settings of the pose the sliders move by hand. */
const POSE_SETTINGS: readonly PoseSetting[] = [
    { label: "Orientation", min: -1, read: pnj => pnj.orientation, write: (pnj, value) => { pnj.orientation = value } },
    {
        label: "Rotation tête", min: -1,
        read: pnj => pnj.headTurn, write: (pnj, value) => { pnj.headTurn = value },
    },
    { label: "Tête", min: -1, read: pnj => pnj.head, write: (pnj, value) => { pnj.head = value } },
    { label: "Penchage", min: -1, read: pnj => pnj.lean, write: (pnj, value) => { pnj.lean = value } },
    { label: "Écrasement", min: 0, read: pnj => pnj.squash, write: (pnj, value) => { pnj.squash = value } },
]

/**
 * The bench of the characters: one stands on the left, looking at the pointer, and the side on the right
 * plays its animations, tries hats, colors of hats and colors of clothes on, and sets its pose by hand,
 * the gaze paused. It tells where the hat sits, as a game following it would hear it.
 *
 * @remarks
 * The character and the hats are loaded when the bench is first shown, and kept: it is a tool, opened by
 * the console, not a screen of the run.
 */
export class PnjScreen {


    constructor(
        public readonly theme: Theme,

        /** The interface the bench lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: PnjHost,

        /** Where the character and the hats come from. */
        public readonly assets: Assets,
    ){
        this.#layer = ui.addLayer("pnj")
        this.#layer.content.visible = false
        this.#hatLabel = new Label(theme, "", { color: DIM_TEXT })
        this.#modeButton = new Button(theme, "")
    }


    /** Is the bench shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        this.#layer.content.visible = visible
        if(visible && !this.#loading) this.#loading = this.#load()
    }

    /** Lay the panels out again when the interface changed size. */
    public frame(): void {
        const size = `${this.ui.width}×${this.ui.height}`
        if(size === this.#size) return
        this.#size = size
        this.#build()
    }


    readonly #layer: Layer
    readonly #hatLabel: Label
    readonly #modeButton: Button
    #loading: Promise<void>|null = null
    #view: PnjView|null = null
    #hats: PnjHat[] = []
    #sliders: Slider[] = []
    #size = ""

    async #load(): Promise<void> {
        let rig: PnjRig
        let hats: Texture[]
        try {
            rig = await PnjRig.load(this.ui.gpu, this.assets, PNJ_PATH, PNJ_SHRINK)
            const pictures = await Promise.all(HATS.map(hat => this.assets.image(hat.path)))
            hats = pictures.map(picture => Texture.fromPixels(this.ui.gpu, picture))
        } catch(error){
            if(!(error instanceof AssetError)) throw error
            this.host.report(`Le banc des PNJ n'a pas pu être chargé : ${error.message}`)
            return
        }
        this.#hats = hats.map((texture, index) => ({ sprite: Sprite.whole(texture), size: HATS[index].size }))
        const pnj = new Pnj(rig)
        pnj.onHatMove(hat => {
            const angle = Math.round(hat.angle * 180 / Math.PI)
            this.#hatLabel.text = `Chapeau : ${Math.round(hat.x)}, ${Math.round(hat.y)}, ${angle}°`
        })
        this.#view = new PnjView(new PnjActor(pnj))
        this.#view.hat = this.#hats[0]
        this.#build()
    }

    /** Build the panels again: the character on the left, the controls on the right. */
    #build(): void {
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        // Kept from one build to the next, so taken out of the panels of the last one first.
        for(const kept of [this.#view, this.#hatLabel, this.#modeButton]) kept?.parent?.remove(kept)
        const row = new Box("row", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        row.fixedSize = { width: this.ui.width, height: this.ui.height }
        const view = this.#view
        if(view) row.add(view, { grow: 1 })
        else row.add(new Label(this.theme, "Chargement du PNJ…", { align: "center" }), { grow: 1 })
        const scroll = new Scroll(this.theme, { width: SIDE_WIDTH, height: MARGIN })
        scroll.content = view ? this.#controls(view) : this.#leaveButton()
        const side = new Panel(this.theme)
        side.content = scroll
        row.add(side)
        content.add(row, { x: "start", y: "start" })
    }


    //// Controls ////

    #controls(view: PnjView): Component {
        const column = new Box("column", { gap: MARGIN, align: "stretch" })
        column.add(this.#leaveButton())
        column.add(this.#title("Animations"))
        column.add(this.#buttons(PNJ_ANIMATIONS.map(animation => ({
            label: animation.label,
            action: () => {
                this.#setManual(view, false)
                view.actor.play(animation)
            },
        }))))
        column.add(this.#title("Chapeau"))
        column.add(this.#buttons([
            { label: "Aucun", action: () => { view.hat = null } },
            ...HATS.map((hat, index) => ({
                label: hat.label,
                action: () => { view.hat = this.#hats[index] },
            })),
        ]))
        column.add(this.#hatLabel)
        column.add(this.#buttons(CLOTHES.map(clothes => ({
            label: clothes.label,
            action: () => { view.hatColor = clothes.color },
        }))))
        column.add(this.#title("Vêtements"))
        column.add(this.#buttons(CLOTHES.map(clothes => ({
            label: clothes.label,
            action: () => { view.actor.pnj.clothes = clothes.color },
        }))))
        column.add(this.#title("Pose"))
        this.#modeButton.onActivate = () => this.#setManual(view, view.animated)
        column.add(this.#modeButton)
        this.#sliders = POSE_SETTINGS.map(setting => {
            const label = new Label(this.theme, "", { color: DIM_TEXT })
            const slider = new Slider(this.theme, {
                min: setting.min * SLIDER_STEPS, max: (setting.max ?? 1) * SLIDER_STEPS,
            })
            slider.onChange = value => {
                label.text = `${setting.label} : ${(value / SLIDER_STEPS).toFixed(2)}`
                if(!view.animated) setting.write(view.actor.pnj, value / SLIDER_STEPS)
            }
            slider.value = Math.round(setting.read(view.actor.pnj) * SLIDER_STEPS)
            label.text = `${setting.label} : ${(slider.value / SLIDER_STEPS).toFixed(2)}`
            column.add(label)
            column.add(slider)
            return slider
        })
        this.#setManual(view, !view.animated)
        return column
    }

    /**
     * Pose the character by hand, its gaze and its animations paused, the sliders starting from its pose; or
     * give it back to its actor, looking at the pointer.
     */
    #setManual(view: PnjView, manual: boolean): void {
        view.animated = !manual
        view.followsPointer = !manual
        this.#modeButton.content = new Label(this.theme, manual ? "Pose à la main" : "Suit la souris", { align: "center" })
        if(!manual) return
        view.actor.stop()
        POSE_SETTINGS.forEach((setting, index) => {
            const slider = this.#sliders[index]
            if(slider) slider.value = Math.round(setting.read(view.actor.pnj) * SLIDER_STEPS)
        })
    }

    #leaveButton(): Button {
        const button = new Button(this.theme, "Retour au voyage")
        button.onActivate = () => this.host.leave()
        return button
    }

    #title(text: string): Label {
        return new Label(this.theme, text)
    }

    /** Buttons in rows of {@link ROW_BUTTONS}, sharing the width. */
    #buttons(entries: readonly { readonly label: string, readonly action: () => void }[]): Box {
        const column = new Box("column", { gap: MARGIN / 2, align: "stretch" })
        for(let start = 0; start < entries.length; start += ROW_BUTTONS){
            const row = new Box("row", { gap: MARGIN / 2, align: "stretch" })
            for(const { label, action } of entries.slice(start, start + ROW_BUTTONS)){
                const button = new Button(this.theme, label)
                button.onActivate = action
                row.add(button, { grow: 1 })
            }
            column.add(row)
        }
        return column
    }
}
