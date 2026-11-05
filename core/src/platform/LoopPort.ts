/**
 * Calls the frame callback once per displayed frame. The adapter owns the loop, since
 * `requestAnimationFrame` and an SDL vsync loop have nothing in common.
 */
export interface LoopPort {
    start(frame: (dtMs: number) => void): void
    stop(): void
}
