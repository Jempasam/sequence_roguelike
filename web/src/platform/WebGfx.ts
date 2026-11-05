import type { GfxPort } from "@game/core"

/**
 * Draws on a canvas, kept at the exact physical pixel size of its box.
 */
export class WebGfx implements GfxPort {


    readonly gl: WebGLRenderingContext
    readonly #canvas: HTMLCanvasElement
    readonly #resizeCallbacks: ((width: number, height: number) => void)[] = []
    readonly #observer: ResizeObserver

    constructor(canvas: HTMLCanvasElement){
        const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: true, alpha: false })
        if(!gl) throw new Error("WebGL 1 is not available in this browser.")
        this.gl = gl
        this.#canvas = canvas
        this.#observer = new ResizeObserver(entries => this.#resize(entries[0]))
        this.#observer.observe(canvas)
    }


    get width(): number { return this.#canvas.width }

    get height(): number { return this.#canvas.height }

    get pixelRatio(): number { return window.devicePixelRatio }

    onResize(callback: (width: number, height: number) => void): void {
        this.#resizeCallbacks.push(callback)
    }

    present(): void {}

    dispose(): void {
        this.#observer.disconnect()
    }


    #resize(entry: ResizeObserverEntry): void {
        // devicePixelContentBoxSize is exact, where rounding contentRect * devicePixelRatio can be off by one
        // pixel and blur pixel art. Safari does not report it.
        const exact = entry.devicePixelContentBoxSize?.[0]
        const width = exact?.inlineSize ?? Math.round(entry.contentRect.width * window.devicePixelRatio)
        const height = exact?.blockSize ?? Math.round(entry.contentRect.height * window.devicePixelRatio)
        if(width === this.#canvas.width && height === this.#canvas.height) return
        this.#canvas.width = width
        this.#canvas.height = height
        for(const callback of this.#resizeCallbacks) callback(width, height)
    }
}
