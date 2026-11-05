import type { Painter } from "@game/core"

/** A painter keeping the vertices of each draw, for what draws through `Painter.draw` alone. */
export function recordingPainter(): { painter: Painter, quads: number[][] } {
    const quads: number[][] = []
    const painter = {
        draw(vertices: ArrayLike<number>): void {
            quads.push(Array.from(vertices))
        },
    } as unknown as Painter
    return { painter, quads }
}
