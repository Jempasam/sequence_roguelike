import type { Painter, Sprite } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Box, Button, Component, EMPTY_HINT, Label, NineSlice, Panel, Slider } from "../../../../engine/ui"
import type { Layer, SizeHint, Theme, UiRoot } from "../../../../engine/ui"
import type { ClipboardPort } from "../../../../platform"
import { visual } from "../../sim/base/Visual"
import type { Visual } from "../../sim/base/Visual"
import { Vector2 } from "../../sim/base/Vector2"
import * as Areas from "../../sim/battle/area/Areas"
import { Box as BoxHitbox } from "../../sim/battle/hitbox/Box"
import { Disk } from "../../sim/battle/hitbox/Disk"
import type { Hitbox } from "../../sim/battle/hitbox/Hitbox"

import { hitboxMetrics } from "./hitboxMetrics"
import { SPRITE_MODE_HELP, SPRITE_MODES, writtenSpriteLook } from "./spriteLook"
import type { SpriteMode } from "./spriteLook"
import { drawSprite, modeOf } from "./spriteModes"
import type { SpriteView } from "./spriteModes"
import { DIM_TEXT } from "./theme"
import type { UnitSprites } from "./UnitSprites"
import { shippedPictures } from "./visualPath"

/** The color behind the bench. */
const BACKDROP = new Color(0.16, 0.15, 0.2)

/** The width of the panel of the controls, in virtual pixels, and the space around and between things. */
const SIDE_WIDTH = 150
const MARGIN = 4

/** How many pixels a meter takes, at least and at most, and at first. */
const MIN_METER = 8
const MAX_METER = 64
const FIRST_METER = 28

/** How far a picture may float, in meters. */
const MAX_LIFT = 1.5

/** The ink of what is drawn over the picture: the hitbox, its bounding box, the discs around and inside it, its middle. */
const HITBOX_INK = new Color(1, 1, 1, 0.8)
const BOX_INK = new Color(0.3, 0.9, 1, 0.8)
const OUTER_INK = new Color(1, 0.85, 0.3, 0.8)
const INNER_INK = new Color(0.4, 1, 0.5, 0.8)
const MIDDLE_INK = new Color(1, 0.3, 0.3, 1)
const AXES_INK = new Color(1, 1, 1, 0.12)

/** The shapes a picture is tried with: a round body of several sizes, walls, hedges and the like. */
const SHAPES: readonly { readonly name: string, readonly hitbox: Hitbox }[] = [
    { name: "Disque 0,35 (unité)", hitbox: new Disk(0.35) },
    { name: "Disque 0,2 (petit)", hitbox: new Disk(0.2) },
    { name: "Disque 0,7 (grand)", hitbox: new Disk(0.7) },
    { name: "Disque 1,2 (géant)", hitbox: new Disk(1.2) },
    { name: "Boîte 1×1", hitbox: new BoxHitbox(1, 1) },
    { name: "Boîte 1,5×0,6 (mur)", hitbox: new BoxHitbox(1.5, 0.6) },
    { name: "Boîte 3×0,5 (mur long)", hitbox: new BoxHitbox(3, 0.5) },
    { name: "Boîte 4×0,7 (haie)", hitbox: new BoxHitbox(4, 0.7) },
    { name: "Boîte 0,5×2,5 (poteaux)", hitbox: new BoxHitbox(0.5, 2.5) },
    { name: "Boîte 2×2 (place)", hitbox: new BoxHitbox(2, 2) },
]

/** The modes the bench cycles through, the one the hitbox says first. */
const MODES: readonly (SpriteMode|null)[] = [null, ...SPRITE_MODES]

/** What the bench hears from the game. */
export interface SpriteBenchHost {
    /** Tell the players something went wrong. */
    report(text: string): void

    /** Write a line in the console. */
    print(text: string): void

    /** The clipboard of the system, none when it has none. */
    readonly clipboard: ClipboardPort|null

    /** Leave the bench, back to where it was opened from. */
    leave(): void
}

/**
 * The bench of the sprites of the units: one picture drawn over one hitbox, the way the board draws it, with
 * the measures it is drawn from laid over it. The panel in the top left corner chooses the picture, the
 * hitbox, the mode, the turn and the lift, and copies the JSON to write beside the picture.
 *
 * @remarks
 * A tool, opened by the console. It draws with the code of the board, so what it shows is what a battle
 * shows. Nothing it sets is written: Copier gives the JSON to paste in the file of the picture.
 */
export class SpriteBenchScreen {


    constructor(
        public readonly theme: Theme,

        /** The interface the bench lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: SpriteBenchHost,

        /** The pictures, and what their files of data say. */
        public readonly sprites: UnitSprites,
    ){
        this.#layer = ui.addLayer("sprites")
        this.#layer.content.visible = false
        this.#keys = shippedPictures("units")
        this.#view = new BenchView()
        this.#build()
    }


    /** Is the bench shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        this.#layer.content.visible = visible
    }

    /** Show a picture, the first when none is named: its mode and lift start as its file of data says. */
    public show(sprite: Visual|null): void {
        const index = sprite ? this.#keys.indexOf(sprite.visual) : 0
        this.#pick(Math.max(0, index))
        // The pictures may still be loading: draw them again once they are.
        this.sprites.whenLoaded(() => this.#refresh())
    }


    readonly #layer: Layer
    readonly #keys: readonly string[]
    readonly #view: BenchView
    #sprite = 0
    #shape = 0
    #mode = 0
    #spriteLabel!: Label
    #shapeLabel!: Label
    #modeLabel!: Label
    #lift!: Slider

    #build(): void {
        const content = this.#layer.content
        const backdrop = new Panel(this.theme, {
            background: NineSlice.flat(this.theme.white, BACKDROP), padding: 0, interactive: false,
        })
        content.add(backdrop, { x: "stretch", y: "stretch" })
        content.add(this.#view, { x: "stretch", y: "stretch" })
        const side = new Panel(this.theme)
        side.content = this.#controls()
        content.add(side, { x: "start", y: "start", offsetX: MARGIN, offsetY: MARGIN })
    }

    #controls(): Box {
        const column = new Box("column", { gap: MARGIN / 2, align: "stretch" })
        const row = new Box("row", { gap: MARGIN / 2, align: "stretch" })
        for(const [text, action] of [["Retour", () => this.host.leave()], ["Copier", () => this.#copy()]] as const){
            const button = new Button(this.theme, text)
            button.onActivate = action
            row.add(button, { grow: 1 })
        }
        column.add(row)
        this.#spriteLabel = this.#cycle(column, this.#keys.length, () => this.#sprite, index => this.#pick(index))
        this.#shapeLabel = this.#cycle(column, SHAPES.length, () => this.#shape, index => {
            this.#shape = index
            this.#refresh()
        })
        this.#modeLabel = this.#cycle(column, MODES.length, () => this.#mode, index => {
            this.#mode = index
            this.#refresh()
            const mode = MODES[index]
            if(mode) this.host.print(`${mode} : ${SPRITE_MODE_HELP[mode]}`)
        })
        this.#slider(column, "Tour", 0, 360, 5, 0, value => this.#view.setAngle(value))
        this.#lift = this.#slider(column, "Hauteur", 0, MAX_LIFT, 0.05, 0, () => this.#refresh())
        this.#slider(column, "Zoom", MIN_METER, MAX_METER, 1, FIRST_METER, value => this.#view.setMeter(value))
        column.fixedSize = { width: SIDE_WIDTH, height: column.measure(SIDE_WIDTH).preferredHeight }
        return column
    }

    /** A line with a button each side to go through some choices, its label saying which is chosen. */
    #cycle(column: Box, count: number, read: () => number, write: (index: number) => void): Label {
        const row = new Box("row", { gap: MARGIN / 2, align: "center" })
        const label = new Label(this.theme, "")
        const step = (by: number) => () => write((read() + by + count) % count)
        const previous = new Button(this.theme, "◀")
        previous.onActivate = step(-1)
        const next = new Button(this.theme, "▶")
        next.onActivate = step(1)
        row.add(previous)
        row.add(label, { grow: 1 })
        row.add(next)
        column.add(row)
        return label
    }

    /** A slider with its label above it. */
    #slider(
        column: Box, name: string, min: number, max: number, step: number, value: number, onChange: (value: number) => void,
    ): Slider {
        const label = new Label(this.theme, "", { color: DIM_TEXT })
        const slider = new Slider(this.theme, { min, max, step, value })
        const say = () => {
            label.text = `${name} : ${slider.value}`
        }
        say()
        slider.onChange = value => {
            say()
            onChange(value)
        }
        column.add(label)
        column.add(slider)
        return slider
    }

    /** Choose a picture: its file of data sets the mode and the lift to start from. */
    #pick(index: number): void {
        this.#sprite = index
        const look = this.sprites.look(visual(this.#keys[index]))
        this.#mode = MODES.indexOf(look.mode)
        this.#lift.value = look.lift
        this.#refresh()
    }

    /** Say what is chosen and draw it again. */
    #refresh(): void {
        const key = this.#keys[this.#sprite] ?? ""
        const shape = SHAPES[this.#shape]
        const mode = MODES[this.#mode]
        const sprite = this.sprites.of(visual(key))
        this.#spriteLabel.text = sprite ? key.replace("units/", "") : `${key.replace("units/", "")} (non chargé)`
        this.#shapeLabel.text = shape.name
        this.#modeLabel.text = mode ?? `défaut (${modeOf({ mode: null, lift: 0 }, shape.hitbox)})`
        this.#view.set(sprite, shape.hitbox, mode, this.#lift.value)
    }

    /** Write the JSON of what is tried, to paste in the file of the picture. */
    #copy(): void {
        const key = this.#keys[this.#sprite]
        const text = writtenSpriteLook({ mode: MODES[this.#mode], lift: this.#lift.value })
        this.host.print(`mecard/${key}.json : ${text}`)
        const { clipboard } = this.host
        if(!clipboard) return
        clipboard.write(text).then(
            () => this.host.print("JSON copié dans le presse-papier."),
            (error: unknown) => this.host.print(`Le presse-papier a refusé la copie : ${String(error)}`),
        )
    }
}

/** The picture over its hitbox, and the measures it is drawn from, in the room the panel leaves. */
class BenchView extends Component {


    /** Tell it what to draw. */
    public set(sprite: Sprite|null, hitbox: Hitbox, mode: SpriteMode|null, lift: number): void {
        this.#sprite = sprite
        this.#hitbox = hitbox
        this.#mode = mode
        this.#lift = lift
        this.invalidate()
    }

    /** Turn the unit, in degrees. */
    public setAngle(degrees: number): void {
        this.#angle = degrees * Math.PI / 180
        this.invalidate()
    }

    /** Draw larger or smaller, in pixels a meter. */
    public setMeter(meter: number): void {
        this.#meter = meter
        this.invalidate()
    }


    protected computeHint(): SizeHint {
        return EMPTY_HINT
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        const cx = Math.round(SIDE_WIDTH + MARGIN + (width - SIDE_WIDTH - MARGIN) / 2)
        const cy = Math.round(height / 2)
        const meter = this.#meter
        const view: SpriteView = { meter, pixels: point => [cx + point.x * meter, cy + point.y * meter] }
        const pose = { position: Vector2.ZERO, direction: new Vector2(Math.cos(this.#angle), Math.sin(this.#angle)) }
        const metrics = hitboxMetrics(this.#hitbox, pose)
        const line = (ink: Color, points: readonly Vector2[]) => {
            painter.setTint(ink)
            painter.multiLine(points.map(point => {
                const [x, y] = view.pixels(point)
                return { x, y }
            }), 1, true)
        }
        painter.setBlend("alpha")
        painter.setTint(AXES_INK)
        painter.rect(0, cy, width, 1)
        painter.rect(cx, 0, 1, height)
        if(this.#sprite){
            painter.setTint(WHITE)
            const look = { mode: this.#mode, lift: this.#lift }
            drawSprite(painter, this.#sprite, modeOf(look, this.#hitbox), look, metrics, view)
        }
        const along = pose.direction.times(metrics.length / 2)
        const across = pose.direction.right.times(metrics.width / 2)
        line(BOX_INK, [along.plus(across), along.minus(across), along.times(-1).minus(across), along.times(-1).plus(across)])
        line(OUTER_INK, Areas.circle(Vector2.ZERO, metrics.outer / 2))
        line(INNER_INK, Areas.circle(Vector2.ZERO, metrics.inner / 2))
        line(HITBOX_INK, this.#hitbox.outline(pose))
        painter.setTint(MIDDLE_INK)
        painter.rect(cx - 1, cy - 1, 3, 3)
        painter.setBlend("cutout")
    }


    #sprite: Sprite|null = null
    #hitbox: Hitbox = SHAPES[0].hitbox
    #mode: SpriteMode|null = null
    #lift = 0
    #angle = 0
    #meter = FIRST_METER
}

const WHITE = new Color(1, 1, 1)
