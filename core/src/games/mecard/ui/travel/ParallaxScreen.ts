import { AssetError } from "../../../../engine/assets"
import type { Assets } from "../../../../engine/assets"
import { Sprite, Texture } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Box, Button, Label, NineSlice, Panel, Parallax, RangeSlider, Slider, Stack, Tabs } from "../../../../engine/ui"
import type { Component, Layer, ParallaxAxes, ParallaxPlace, Theme, UiRoot } from "../../../../engine/ui"
import type { ClipboardPort } from "../../../../platform"
import type { Visual } from "../../sim/base/Visual"

import { DIM_TEXT } from "../look/theme"
import { parallaxSource } from "../look/visualPath"
import { layerName, loadParallaxPictures, rangesName } from "./parallaxPictures"
import { rangedOf, SCENE_DEPTHS, SCENE_WARPS, tintOf } from "./TravelScenes"
import type { LayerRange, SceneRanges } from "./TravelScenes"

/** The width of the panel of the controls, in virtual pixels, and the space around and between things. */
const SIDE_WIDTH = 150
const MARGIN = 4

/** How far a distance goes, in virtual pixels, and how strong a bend, either way. */
const MAX_DEPTH = 120
const MAX_WARP = 3

/** The smallest change of a bend. */
const WARP_STEP = 0.05

/** What the bench hears from the game. */
export interface ParallaxHost {
    /** Tell the players something went wrong. */
    report(text: string): void

    /** Write a line in the console. */
    print(text: string): void

    /** The clipboard of the system, none when it has none. */
    readonly clipboard: ClipboardPort|null

    /** Leave the bench, back to the journey. */
    leave(): void
}

/** A layer loaded, its texture made, with what its painting set for it. */
interface Loaded {
    readonly name: string
    readonly texture: Texture
    readonly place: ParallaxPlace|null
    readonly depth: ParallaxAxes|null
    readonly warp: ParallaxAxes|null
}

/** What the bench sets for a layer, by its name, over what its painting sets. */
interface Override {
    depth: ParallaxAxes|null
    warp: ParallaxAxes|null
}

/** Where a value of a layer comes from: the bench, its painting, or the ranges. */
type Origin = "banc"|"ora"|"interpolée"

/** A value of a layer, and where it comes from. */
interface Effective {
    readonly value: ParallaxAxes
    readonly origin: Origin
}

/** The page of the panel shown first: the ranges. */
const GLOBAL_PAGE = 0

/**
 * The bench of the parallaxes: one shown over the whole screen, following the pointer as in the journey.
 * The panel in the top left corner sets the ranges of distance and bend from the farthest layer to the
 * nearest, or a layer on its own, tints them all, loads the files again, copies the settings found, and
 * hides itself.
 *
 * @remarks
 * A tool, opened by the console. What it sets for a layer is kept by its name when the files are loaded
 * again, lost with the layer; it is never written: Copier gives the names to paste in the painting.
 */
export class ParallaxScreen {


    constructor(
        public readonly theme: Theme,

        /** The interface the bench lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: ParallaxHost,

        /** Where the pictures come from. */
        public readonly assets: Assets,
    ){
        this.#layer = ui.addLayer("parallax")
        this.#layer.content.visible = false
    }


    /** Is the bench shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        this.#layer.content.visible = visible
    }

    /** Show a parallax, by the visual naming it: its coloration starts as the tint tried, nothing set by layer. */
    public show(parallax: Visual): void {
        this.#visual = parallax
        this.#tint = tintOf(parallax)
        this.#overrides.clear()
        this.#selected = 0
        void this.#load()
    }

    /** Lay the panels out again when the interface changed size. */
    public frame(): void {
        const size = `${this.ui.width}×${this.ui.height}`
        if(size === this.#size) return
        this.#size = size
        this.#build()
    }

    /** Let the textures go. A parallax still loading is dropped when it arrives: none is shown any more. */
    public dispose(): void {
        this.#visual = null
        for(const layer of this.#layers) layer.texture.dispose()
        this.#layers = []
    }


    readonly #layer: Layer

    /** What holds the parallax shown, so it is changed without laying the panel out again. */
    readonly #holder = new Stack()

    #visual: Visual|null = null
    #source = ""
    #layers: Loaded[] = []
    #depths: SceneRanges = SCENE_DEPTHS
    #warps: SceneRanges = SCENE_WARPS

    /** Where the ranges came from when loaded: the painting, or the journey. */
    #rangesOrigin = ""
    readonly #overrides = new Map<string, Override>()
    #tint: Color|null = null
    #selected = 0
    #page = GLOBAL_PAGE
    #hidden = false
    #size = ""

    /** What the page of a layer says of it, told again as its values change. */
    #told: Label|null = null

    /** Load the parallax shown, letting the textures of the last one go, keeping what was set by layer name. */
    async #load(): Promise<void> {
        const visual = this.#visual
        if(!visual) return
        let pictures
        let source
        try {
            source = parallaxSource(visual)
            pictures = await loadParallaxPictures(this.assets, source)
        } catch(error){
            if(!(error instanceof AssetError)) throw error
            this.host.report(`La parallaxe ${visual.visual} n'a pas pu être chargée : ${error.message}`)
            return
        }
        if(visual !== this.#visual) return
        for(const warning of pictures.warnings) this.host.report(warning)
        for(const layer of this.#layers) layer.texture.dispose()
        this.#source = "painting" in source ? source.painting : `${source.images.length} png de mecard/${visual.visual}/`
        // The ranges start as the painting sets them, else as the journey does: read again with the files.
        this.#depths = pictures.ranges.depth ?? SCENE_DEPTHS
        this.#warps = pictures.ranges.warp ?? SCENE_WARPS
        this.#rangesOrigin = pictures.ranges.depth || pictures.ranges.warp ? "plages de l'ora" : "plages du jeu"
        this.#layers = pictures.layers.map(layer => ({
            name: layer.name,
            texture: Texture.fromPixels(this.ui.gpu, layer.pixels),
            place: layer.place,
            depth: layer.depth,
            warp: layer.warp,
        }))
        const names = new Set(this.#layers.map(layer => layer.name))
        for(const name of [...this.#overrides.keys()]) if(!names.has(name)) this.#overrides.delete(name)
        this.#selected = Math.min(this.#selected, Math.max(0, this.#layers.length - 1))
        this.#build()
    }


    //// What each layer takes ////

    #depthOf(index: number): Effective {
        const layer = this.#layers[index]
        return this.#effective(this.#overrides.get(layer.name)?.depth ?? null, layer.depth,
            () => rangedOf(index, this.#layers.length, this.#depths))
    }

    #warpOf(index: number): Effective {
        const layer = this.#layers[index]
        return this.#effective(this.#overrides.get(layer.name)?.warp ?? null, layer.warp,
            () => rangedOf(index, this.#layers.length, this.#warps))
    }

    /** What the bench sets, else what the painting sets, else the share of the ranges. */
    #effective(bench: ParallaxAxes|null, painting: ParallaxAxes|null, ranged: () => ParallaxAxes): Effective {
        if(bench) return { value: bench, origin: "banc" }
        if(painting) return { value: painting, origin: "ora" }
        return { value: ranged(), origin: "interpolée" }
    }

    /** What the bench sets for a layer, made when first asked. */
    #overrideOf(index: number): Override {
        const name = this.#layers[index].name
        let override = this.#overrides.get(name)
        if(!override){
            override = { depth: null, warp: null }
            this.#overrides.set(name, override)
        }
        return override
    }


    //// Building ////

    /** Build everything again: the color behind, the parallax, then the panel over them. */
    #build(): void {
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        const [r, g, b] = this.#visual?.color ?? [0, 0, 0]
        const backdrop = new Panel(this.theme, {
            background: NineSlice.flat(this.theme.white, new Color(r, g, b)), padding: 0, interactive: false,
        })
        content.add(backdrop, { x: "stretch", y: "stretch" })
        content.add(this.#holder, { x: "stretch", y: "stretch" })
        this.#rebuild()
        const side = new Panel(this.theme)
        side.content = this.#hidden ? this.#shownButton() : this.#controls()
        content.add(side, { x: "start", y: "start", offsetX: MARGIN, offsetY: MARGIN })
    }

    /** Put a new parallax in place of the one shown, the panel kept, so a slider being dragged stays held. */
    #rebuild(): void {
        const holder = this.#holder
        for(const child of [...holder.children]) holder.remove(child)
        const parallax = new Parallax(this.#layers.map((layer, index) => ({
            sprite: Sprite.whole(layer.texture),
            depth: this.#depthOf(index).value,
            warp: this.#warpOf(index).value,
            ...layer.place && { place: layer.place },
        })), { tint: this.#tint })
        holder.add(parallax, { x: "stretch", y: "stretch" })
        this.#tell()
    }

    #shownButton(): Component {
        const shown = new Button(this.theme, "Afficher")
        shown.onActivate = () => {
            this.#hidden = false
            this.#build()
        }
        return shown
    }

    #controls(): Box {
        const column = new Box("column", { gap: MARGIN / 2, align: "stretch" })
        const row = new Box("row", { gap: MARGIN / 2, align: "stretch" })
        const buttons: [string, () => void][] = [
            ["Retour", () => this.host.leave()],
            ["Recharger", () => void this.#load()],
            ["Copier", () => this.#copy()],
            ["Masquer", () => {
                this.#hidden = true
                this.#build()
            }],
        ]
        for(const [text, action] of buttons){
            const button = new Button(this.theme, text)
            button.onActivate = action
            row.add(button, { grow: 1 })
        }
        column.add(row)
        const tabs = new Tabs(this.theme, [
            { title: "Global", build: () => this.#globalPage() },
            { title: "Calque", build: () => this.#layerPage() },
        ], { selected: this.#page })
        tabs.onSelect = index => {
            this.#page = index
            // The pages differ in height: the panel is laid out again.
            this.#build()
        }
        column.add(tabs)
        column.fixedSize = { width: SIDE_WIDTH, height: column.measure(SIDE_WIDTH).preferredHeight }
        return column
    }

    #globalPage(): Box {
        const page = new Box("column", { gap: MARGIN / 2, align: "stretch" })
        page.add(new Label(this.theme, `${this.#source} · ${this.#layers.length} couches · ${this.#rangesOrigin}`, { color: DIM_TEXT }))
        const ranges: [string, () => SceneRanges, (ranges: SceneRanges) => void, number, number][] = [
            ["Distance", () => this.#depths, ranges => { this.#depths = ranges }, 0, 1],
            ["Déformation", () => this.#warps, ranges => { this.#warps = ranges }, -MAX_WARP, WARP_STEP],
        ]
        for(const [name, read, write, min, step] of ranges){
            for(const axis of ["x", "y"] as const){
                this.#range(page, `${name} ${axis.toUpperCase()}`, min, min < 0 ? MAX_WARP : MAX_DEPTH, step,
                    () => read()[axis], range => write({ ...read(), [axis]: range }))
            }
        }
        const tint = new Button(this.theme, this.#tint ? "Teinte : oui" : "Teinte : non")
        tint.onActivate = () => {
            this.#tint = this.#tint ? null : new Color(1, 1, 1)
            this.#build()
        }
        page.add(tint)
        if(this.#tint){
            const shown = this.#tint
            for(const [name, channel] of [["Rouge", "r"], ["Vert", "g"], ["Bleu", "b"]] as const){
                this.#slider(page, name, 0, 1, 0.01, () => shown[channel], value => {
                    shown[channel] = value
                })
            }
        }
        return page
    }

    #layerPage(): Box {
        const page = new Box("column", { gap: MARGIN / 2, align: "stretch" })
        const count = this.#layers.length
        if(count === 0){
            page.add(new Label(this.theme, "Aucun calque.", { color: DIM_TEXT }))
            return page
        }
        const index = this.#selected
        const row = new Box("row", { gap: MARGIN / 2, align: "center" })
        const pick = (step: number) => () => {
            this.#selected = (this.#selected + step + count) % count
            this.#build()
        }
        const previous = new Button(this.theme, "◀")
        previous.onActivate = pick(-1)
        const next = new Button(this.theme, "▶")
        next.onActivate = pick(1)
        row.add(previous)
        row.add(new Label(this.theme, `${index + 1}/${count} ${this.#layers[index].name}`), { grow: 1 })
        row.add(next)
        page.add(row)
        const values: [string, "depth"|"warp", "x"|"y", number, number, number][] = [
            ["Distance X", "depth", "x", 0, MAX_DEPTH, 1],
            ["Distance Y", "depth", "y", 0, MAX_DEPTH, 1],
            ["Déformation X", "warp", "x", -MAX_WARP, MAX_WARP, WARP_STEP],
            ["Déformation Y", "warp", "y", -MAX_WARP, MAX_WARP, WARP_STEP],
        ]
        for(const [name, kind, axis, min, max, step] of values){
            const read = () => (kind === "depth" ? this.#depthOf(index) : this.#warpOf(index)).value[axis]
            this.#slider(page, name, min, max, step, read, value => {
                const override = this.#overrideOf(index)
                const current = (kind === "depth" ? this.#depthOf(index) : this.#warpOf(index)).value
                override[kind] = { ...current, [axis]: value }
            })
        }
        const ranged = new Button(this.theme, "Interpolé")
        ranged.onActivate = () => {
            this.#overrides.delete(this.#layers[index].name)
            this.#build()
        }
        page.add(ranged)
        this.#told = new Label(this.theme, "", { color: DIM_TEXT })
        page.add(this.#told)
        this.#tell()
        return page
    }

    /** A slider with its label, setting a value then drawing the parallax again. */
    #slider(
        column: Box, name: string, min: number, max: number, step: number,
        read: () => number, write: (value: number) => void,
    ): void {
        const label = new Label(this.theme, "", { color: DIM_TEXT })
        const slider = new Slider(this.theme, { min, max, step, value: read() })
        const say = () => {
            label.text = `${name} : ${format(read(), step)}`
        }
        say()
        slider.onChange = value => {
            write(value)
            say()
            this.#rebuild()
        }
        column.add(label)
        column.add(slider)
    }

    /** A range slider with its label, setting a range from far to near then drawing the parallax again. */
    #range(
        column: Box, name: string, min: number, max: number, step: number,
        read: () => LayerRange, write: (range: LayerRange) => void,
    ): void {
        const label = new Label(this.theme, "", { color: DIM_TEXT })
        const { far, near } = read()
        // The low thumb is the lower value, whichever layer takes it.
        const slider = new RangeSlider(this.theme, {
            min,
            max,
            step,
            low: Math.min(far, near),
            high: Math.max(far, near),
        })
        const say = () => {
            const range = read()
            label.text = `${name} : ${format(range.far, step)} → ${format(range.near, step)}`
        }
        say()
        slider.onChange = (low, high) => {
            write({ far: low, near: high })
            say()
            this.#rebuild()
        }
        column.add(label)
        column.add(slider)
    }

    /** Tell where each value of the layer chosen comes from. */
    #tell(): void {
        const told = this.#told
        if(!told || this.#layers.length === 0) return
        const depth = this.#depthOf(this.#selected)
        const warp = this.#warpOf(this.#selected)
        told.text = `Distance ${depth.origin}, déformation ${warp.origin}.`
    }

    /**
     * Write the name of the layer of settings giving the ranges, then those of the layers with what they
     * take on their own, from the top, to paste in the painting; then the ranges for the whole journey.
     */
    #copy(): void {
        const lines = [rangesName(rounded(this.#depths), rounded(this.#warps))]
        lines.push(...this.#layers.map((layer, index) => {
            const depth = this.#depthOf(index)
            const warp = this.#warpOf(index)
            return layerName(layer.name,
                depth.origin === "interpolée" ? null : rounded(depth.value),
                warp.origin === "interpolée" ? null : rounded(warp.value))
        }).reverse())
        const range = ({ x, y }: SceneRanges) => `{ x: { far: ${x.far}, near: ${x.near} }, y: { far: ${y.far}, near: ${y.near} } }`
        lines.push(`Pour tout le jeu : SCENE_DEPTHS = ${range(this.#depths)}`)
        lines.push(`Pour tout le jeu : SCENE_WARPS = ${range(this.#warps)}`)
        const text = lines.join("\n")
        for(const line of lines) this.host.print(line)
        const { clipboard } = this.host
        if(!clipboard) return
        clipboard.write(text).then(
            () => this.host.print("Noms des calques copiés dans le presse-papier, du haut vers le bas."),
            (error: unknown) => this.host.print(`Le presse-papier a refusé la copie : ${String(error)}`),
        )
    }
}

/** A value as a label shows it, as precise as its step. */
function format(value: number, step: number): string {
    return step < 1 ? value.toFixed(2) : String(Math.round(value))
}

/** A value kept to the hundredth, as a layer name writes it. */
function hundredth(value: number): number {
    return Math.round(value * 100) / 100
}

/** Values, or ranges, kept to the hundredth. */
function rounded(values: ParallaxAxes): ParallaxAxes
function rounded(ranges: SceneRanges): SceneRanges
function rounded(values: ParallaxAxes|SceneRanges): ParallaxAxes|SceneRanges {
    if(typeof values.x === "number") return { x: hundredth(values.x), y: hundredth(values.y as number) }
    const range = ({ far, near }: LayerRange) => ({ far: hundredth(far), near: hundredth(near) })
    const { x, y } = values as SceneRanges
    return { x: range(x), y: range(y) }
}
