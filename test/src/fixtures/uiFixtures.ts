import { Gpu } from "@game/core-src/engine/gpu/Gpu"
import { ScreenSurface } from "@game/core-src/engine/gpu/ScreenSurface"
import { Sprite } from "@game/core-src/engine/gpu/Sprite"
import { Texture } from "@game/core-src/engine/gpu/Texture"
import { InputSystem } from "@game/core-src/engine/input/InputSystem"
import { Color } from "@game/core-src/engine/math/Color"
import { BitmapFont } from "@game/core-src/engine/text/BitmapFont"
import { Component } from "@game/core-src/engine/ui/Component"
import { Stack } from "@game/core-src/engine/ui/layout/Stack"
import { NineSlice } from "@game/core-src/engine/ui/NineSlice"
import { Rect } from "@game/core-src/engine/ui/Rect"
import { sizeHint } from "@game/core-src/engine/ui/SizeHint"
import { UiRoot } from "@game/core-src/engine/ui/UiRoot"
import type { Painter } from "@game/core-src/engine/gpu/Painter"
import type { InputFrame } from "@game/core-src/engine/input/InputFrame"
import type { UiEvent } from "@game/core-src/engine/ui/input/UiEvent"
import type { Layer } from "@game/core-src/engine/ui/Layer"
import type { SizeHint } from "@game/core-src/engine/ui/SizeHint"
import type { StateLooks, Theme } from "@game/core-src/engine/ui/Theme"
import type { UiRootOptions } from "@game/core-src/engine/ui/UiRoot"

import { fakeGfx, fakeGl } from "./fakeGl"
import type { FakeGl } from "./fakeGl"
import { FakeInput } from "./fakeInput"

/** The characters of the test font, each 4 pixels wide and 6 high. */
const CHARACTERS = " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,-?…"

/** The width of a character of the test font, in pixels. */
export const ADVANCE = 4

/** The height of a line of the test font, in pixels. */
export const LINE = 6

/** An interface on a fake GPU, at scale 1, with a `main` and a `popup` layer. */
export interface UiSetup {
    readonly fake: FakeGl
    readonly gpu: Gpu
    readonly ui: UiRoot
    readonly main: Layer
    readonly popup: Layer
    readonly theme: Theme
    readonly port: FakeInput
    readonly input: InputSystem

    /** Read the port into a frame, and give it to the interface. */
    frame(): InputFrame
}

/** An interface on a fake GPU with no layer, for a game that makes its own, and its theme. */
export function bareUiSetup(width = 320, height = 180): { readonly ui: UiRoot, readonly theme: Theme } {
    painted.length = 0
    const gpu = new Gpu(fakeGfx(fakeGl().gl, width, height))
    return { ui: new UiRoot(gpu, new ScreenSurface(gpu), { scale: 1 }), theme: testTheme(gpu) }
}

export function uiSetup(options: UiRootOptions = {}, width = 320, height = 180): UiSetup {
    painted.length = 0
    const fake = fakeGl()
    const gpu = new Gpu(fakeGfx(fake.gl, width, height))
    const ui = new UiRoot(gpu, new ScreenSurface(gpu), { scale: 1, ...options })
    const main = ui.addLayer("main")
    const popup = ui.addLayer("popup")
    const port = new FakeInput()
    const input = new InputSystem(port)
    const frame = () => {
        const read = input.beginFrame(1 / 60)
        ui.handle(read)
        return read
    }
    return { fake, gpu, ui, main, popup, theme: testTheme(gpu), port, input, frame }
}

/** A theme of flat frames and a monospaced font, on one texture. */
export function testTheme(gpu: Gpu): Theme {
    const texture = new Texture(gpu, 512, 64)
    const sheet = new Sprite(texture, 0, 0, 512, 12)
    const font = BitmapFont.grid(sheet, { characters: CHARACTERS, cellWidth: ADVANCE, cellHeight: LINE, fallback: "?" })
    const white = new Sprite(texture, 0, 32, 4, 4)
    const flat = (r: number, g: number, b: number, a = 1) => NineSlice.flat(white, new Color(r, g, b, a))
    const looks = (): StateLooks => ({
        normal: flat(0.2, 0.2, 0.2), hovered: flat(0.3, 0.3, 0.3), pressed: flat(0.1, 0.1, 0.1),
        focused: flat(0.3, 0.3, 0.5), disabled: flat(0.2, 0.2, 0.2, 0.5),
    })
    return {
        font, textScale: 1, white,
        textColor: new Color(1, 1, 1), disabledTextColor: new Color(0.5, 0.5, 0.5),
        focusRing: flat(1, 1, 0, 0.5),
        panel: { background: flat(0.1, 0.1, 0.1), padding: 2 },
        button: { ...looks(), padding: 2 },
        slider: {
            track: flat(0.2, 0.2, 0.2), thumb: flat(0.8, 0.8, 0.8), thumbWidth: 4, width: 44, height: 8,
        },
        scrollbar: { track: flat(0.2, 0.2, 0.2), thumb: flat(0.8, 0.8, 0.8), thumbHover: flat(1, 1, 1), width: 4, minThumb: 4 },
        textInput: {
            background: flat(0, 0, 0), padding: 2, width: 40,
            cursorColor: new Color(), selectionColor: new Color(0, 0, 1),
        },
        menu: { background: flat(0.1, 0.1, 0.1), padding: 1, entry: { ...looks(), padding: 1 } },
        tooltip: { background: flat(0, 0, 0), padding: 1 },
    }
}

/** What the probes painted, by name, in order. */
export const painted: string[] = []

/** How a probe is set up. */
export interface ProbeOptions {
    readonly min?: [number, number]
    readonly opaque?: boolean
    readonly interactive?: boolean
    readonly focusable?: boolean

    /** What it draws beyond its bounds, in pixels, to test the check of debug. */
    readonly overflow?: number
}

/** A component of a size, which notes in {@link painted} each time it paints, and keeps its events. */
export class Probe extends Component {


    public readonly events: string[] = []

    constructor(
        public readonly name: string,
        public readonly size: [number, number],
        public readonly options: ProbeOptions = {},
    ){
        super()
    }


    public get isFocusable(): boolean { return this.focusable }

    protected override get interactive(): boolean {
        return this.options.interactive ?? this.options.focusable ?? false
    }

    protected override get focusable(): boolean { return this.options.focusable ?? false }

    protected computeHint(): SizeHint {
        const [width, height] = this.size
        const [minWidth, minHeight] = this.options.min ?? this.size
        return sizeHint(minWidth, minHeight, width, height)
    }

    protected paint(painter: Painter): void {
        painted.push(this.name)
        const overflow = this.options.overflow ?? 0
        painter.rect(-overflow, 0, this.bounds.width + overflow, this.bounds.height)
    }

    protected override opaqueRect(): Readonly<Rect>|null {
        return this.options.opaque ? new Rect(0, 0, this.bounds.width, this.bounds.height) : null
    }

    protected override handle(event: UiEvent): void {
        this.events.push(event.type === "action" ? `action ${event.action}` : `${event.type} ${event.x},${event.y}`)
        if(this.options.focusable && event.type === "action" && event.action === "accept") event.consume()
    }
}

/** A stack that notes in {@link painted} each time it paints, opaque over its bounds when asked. */
export class ProbeStack extends Stack {


    constructor(
        public readonly name: string,
        public readonly opaque: boolean,
    ){
        super()
    }


    protected override paint(): void {
        painted.push(this.name)
    }

    protected override opaqueRect(): Readonly<Rect>|null {
        return this.opaque ? new Rect(0, 0, this.bounds.width, this.bounds.height) : null
    }
}

/** Render, then forget what was painted, so a test sees only what its change draws again. */
export function settle(ui: UiRoot): void {
    ui.render()
    painted.length = 0
}
