/**
 * The WebGL 1 surface the game draws on, and its size in physical pixels.
 */
export interface GfxPort {
    readonly gl: WebGLRenderingContext
    readonly width: number
    readonly height: number
    readonly pixelRatio: number

    onResize(callback: (width: number, height: number) => void): void

    /** Shows the frame just drawn: nothing on the web, a buffer swap on desktop. */
    present(): void
}
