/** Where a particle is and how fast it moves. */
export interface Motion {
    x: number
    y: number
    vx: number
    vy: number
}

/**
 * The motion of a particle after `t` seconds, by the closed form of a constant force and a drag, which the
 * shader of a {@link ParticleBurst} computes the same way.
 *
 * @remarks
 * With a drag `k`, the speed is `(v0 - a/k) e^(-kt) + a/k` and the position follows from it. Without one,
 * it is the plain `v0 + a t` and `p0 + v0 t + a t² / 2`. The {@link ParticleSystem} integrates step by
 * step instead, so the two agree only as the steps get short.
 *
 * @param out - Receives the motion, so a call allocates nothing.
 */
export function motionAt(
    x0: number, y0: number, vx0: number, vy0: number, ax: number, ay: number, drag: number, t: number,
    out: Motion,
): void {
    if(drag > DRAG_EPSILON){
        const restX = ax / drag
        const restY = ay / drag
        const decay = Math.exp(-drag * t)
        const slide = (1 - decay) / drag
        out.vx = (vx0 - restX) * decay + restX
        out.vy = (vy0 - restY) * decay + restY
        out.x = x0 + restX * t + (vx0 - restX) * slide
        out.y = y0 + restY * t + (vy0 - restY) * slide
    }
    else {
        out.vx = vx0 + ax * t
        out.vy = vy0 + ay * t
        out.x = x0 + vx0 * t + 0.5 * ax * t * t
        out.y = y0 + vy0 * t + 0.5 * ay * t * t
    }
}

/**
 * The farthest a particle gets from its start during its life: a bound, not the exact distance. A drag only
 * slows the particle down, so the distance without it is never exceeded.
 */
export function reachOf(vx0: number, vy0: number, ax: number, ay: number, life: number): number {
    return Math.hypot(vx0, vy0) * life + 0.5 * Math.hypot(ax, ay) * life * life
}

/** Below this, a drag is taken for none, in the shader as here: dividing by it would blow up. */
export const DRAG_EPSILON = 0.0001
