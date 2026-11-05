import { AssetError } from "../../../../engine/assets"
import type { Assets } from "../../../../engine/assets"
import { Color } from "../../../../engine/math"
import { Box, Button, Label, NineSlice, Panel, Slider } from "../../../../engine/ui"
import type { Layer, Theme, UiRoot } from "../../../../engine/ui"

import { DIM_TEXT } from "../look/theme"
import { PointingArm } from "./PointingArm"
import type { ArmSettings } from "./PointingArm"

/** The color behind the forearm. */
const BACKDROP = new Color(0.12, 0.11, 0.17)

/** The width of the panel of the controls, in virtual pixels, and the space around and between things. */
const SIDE_WIDTH = 150
const MARGIN = 4

/** What the bench hears from the game. */
export interface ArmHost {
    /** Tell the players something went wrong. */
    report(text: string): void

    /** Leave the bench, back to the journey. */
    leave(): void
}

/** A setting of the forearm, as a slider shows it: its range and its step. */
interface ArmSlider {
    readonly label: string
    readonly key: keyof ArmSettings
    readonly max: number
    readonly step: number
}

/** The settings the sliders move. */
const ARM_SLIDERS: readonly ArmSlider[] = [
    { label: "Ancre", key: "baseShare", max: 1, step: 0.01 },
    { label: "Portée", key: "reachShare", max: 1, step: 0.01 },
    { label: "Rotation max (°)", key: "maxTilt", max: 60, step: 1 },
    { label: "Taille", key: "scale", max: 1.5, step: 0.05 },
    { label: "Lissage (s)", key: "smoothing", max: 0.5, step: 0.01 },
    { label: "Apparition (s)", key: "duration", max: 1, step: 0.05 },
]

/**
 * The bench of the forearm of the halts: it points at the pointer over a plain backdrop, and the panel in
 * the top left corner makes it appear and go, sets how it follows the pointer, and tells where it stands.
 *
 * @remarks
 * The picture is loaded when the bench is first shown, and kept: it is a tool, opened by the console, not
 * a screen of the run.
 */
export class ArmScreen {


    constructor(
        public readonly theme: Theme,

        /** The interface the bench lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: ArmHost,

        /** Where the picture of the forearm comes from. */
        public readonly assets: Assets,
    ){
        this.#layer = ui.addLayer("arm")
        this.#layer.content.visible = false
        this.#arm = new PointingArm(ui)
        this.#told = new Label(theme, "", { color: DIM_TEXT })
        this.#arm.onMove = arm => this.#tell(arm)
    }


    /** Is the bench shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        this.#layer.content.visible = visible
        if(visible && !this.#loading) this.#loading = this.#load()
        if(visible) this.#arm.appear()
    }

    /** Lay the panels out again when the interface changed size. */
    public frame(): void {
        const size = `${this.ui.width}×${this.ui.height}`
        if(size === this.#size) return
        this.#size = size
        this.#build()
    }


    readonly #layer: Layer
    readonly #arm: PointingArm

    /** Where the tip is, how far it reaches and how far it turns. */
    readonly #told: Label

    #loading: Promise<void>|null = null
    #size = ""

    async #load(): Promise<void> {
        try {
            this.#arm.sprite = await PointingArm.loadSprite(this.ui.gpu, this.assets)
        } catch(error){
            if(!(error instanceof AssetError)) throw error
            this.host.report(`Le banc du bras n'a pas pu être chargé : ${error.message}`)
        }
    }

    /** Build the panels again: the backdrop, the controls, then the forearm over them. */
    #build(): void {
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        for(const kept of [this.#arm, this.#told]) kept.parent?.remove(kept)
        const backdrop = new Panel(this.theme, {
            background: NineSlice.flat(this.theme.white, BACKDROP), padding: 0, interactive: false,
        })
        content.add(backdrop, { x: "stretch", y: "stretch" })
        const side = new Panel(this.theme)
        side.content = this.#controls()
        content.add(side, { x: "start", y: "start", offsetX: MARGIN, offsetY: MARGIN })
        content.add(this.#arm, { x: "stretch", y: "stretch" })
    }

    #controls(): Box {
        const column = new Box("column", { gap: MARGIN, align: "stretch" })
        const leave = new Button(this.theme, "Retour au voyage")
        leave.onActivate = () => this.host.leave()
        column.add(leave)
        const row = new Box("row", { gap: MARGIN / 2, align: "stretch" })
        const shows: [string, () => void][] = [
            ["Apparaître", () => this.#arm.appear()], ["Disparaître", () => this.#arm.disappear()],
        ]
        for(const [text, action] of shows){
            const button = new Button(this.theme, text)
            button.onActivate = action
            row.add(button, { grow: 1 })
        }
        column.add(row)
        const settings = this.#arm.settings
        for(const { label: name, key, max, step } of ARM_SLIDERS){
            const label = new Label(this.theme, "", { color: DIM_TEXT })
            const steps = Math.round(max / step)
            const slider = new Slider(this.theme, { min: 0, max: steps })
            const say = (value: number) => {
                label.text = `${name} : ${step < 1 ? value.toFixed(2) : value}`
            }
            slider.onChange = value => {
                settings[key] = value * step
                say(settings[key])
            }
            slider.value = Math.round(settings[key] / step)
            say(settings[key])
            column.add(label)
            column.add(slider)
        }
        column.add(this.#told)
        this.#tell(this.#arm)
        column.fixedSize = { width: SIDE_WIDTH, height: column.measure(SIDE_WIDTH).preferredHeight }
        return column
    }

    #tell(arm: PointingArm): void {
        const pose = arm.pose
        if(!pose){
            this.#told.text = ""
            return
        }
        const angle = Math.round(pose.tilt * 180 / Math.PI)
        this.#told.text = `Doigt ${Math.round(pose.x)}, ${Math.round(pose.y)} · ${angle}°`
    }
}
