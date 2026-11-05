import createContext from "@kmamal/gl"
import type { Sdl } from "@kmamal/sdl"
import type { GfxPort } from "@game/core"

/**
 * Draws in an SDL window, through the WebGL 1 context `@kmamal/gl` binds to it.
 */
export class SdlGfx implements GfxPort {


    readonly gl: WebGLRenderingContext
    readonly #window: Sdl.Video.Window
    readonly #resizeCallbacks: ((width: number, height: number) => void)[] = []
    readonly #swap: () => void

    constructor(window: Sdl.Video.Window){
        const gl = createContext(window.pixelWidth, window.pixelHeight, { window: window.native })
        if(!gl) throw new Error("@kmamal/gl could not create a WebGL context for the window.")
        const resizer = gl.getExtension("STACKGL_resize_drawingbuffer")
        if(!resizer) throw new Error("@kmamal/gl lacks STACKGL_resize_drawingbuffer.")
        // @kmamal/gl ships its own copy of the WebGL 1 types. The context implements the DOM interface
        // core draws through, but the two declarations are not assignable to each other.
        this.gl = gl as unknown as WebGLRenderingContext
        this.#window = window
        this.#swap = () => gl.swap()
        window.on("resize", ({ pixelWidth, pixelHeight }) => {
            resizer.resize(pixelWidth, pixelHeight)
            for(const callback of this.#resizeCallbacks) callback(pixelWidth, pixelHeight)
        })
    }


    get width(): number { return this.#window.pixelWidth }

    get height(): number { return this.#window.pixelHeight }

    get pixelRatio(): number { return this.#window.pixelWidth / this.#window.width }

    onResize(callback: (width: number, height: number) => void): void {
        this.#resizeCallbacks.push(callback)
    }

    present(): void {
        this.#swap()
    }
}
