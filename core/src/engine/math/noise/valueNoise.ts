import { hashCell } from "./hash"

/** Smooth value noise in three dimensions, from -1 to 1, repeatable for a given seed. */
export function valueNoise3(seed: number, x: number, y: number, z: number): number {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const iz = Math.floor(z)
    const fx = smooth(x - ix)
    const fy = smooth(y - iy)
    const fz = smooth(z - iz)
    const corner = (dx: number, dy: number, dz: number) => hashCell(seed, ix + dx, iy + dy, iz + dz)
    const near = lerp(
        lerp(corner(0, 0, 0), corner(1, 0, 0), fx),
        lerp(corner(0, 1, 0), corner(1, 1, 0), fx),
        fy,
    )
    const far = lerp(
        lerp(corner(0, 0, 1), corner(1, 0, 1), fx),
        lerp(corner(0, 1, 1), corner(1, 1, 1), fx),
        fy,
    )
    return lerp(near, far, fz) * 2 - 1
}

/**
 * One band of detail of a point: the noise of the octave, whose cells are `2 ** (octave + 1)` to a unit
 * and whose strength is `0.5 ** octave`. A higher octave is finer and weaker.
 */
export function octaveNoise3(seed: number, x: number, y: number, z: number, octave: number): number {
    const frequency = 2 ** (octave + 1)
    return valueNoise3(seed + octave * 7919, x * frequency, y * frequency, z * frequency) * 0.5 ** octave
}

/**
 * The sum of the octaves from `first` to `last` included. A sum to a deeper octave holds the sum to a
 * shallower one unchanged, so a coarse view and a finer one of a point never disagree on the coarse part.
 */
export function fractalNoise3(
    seed: number, x: number, y: number, z: number, first: number, last: number,
): number {
    let sum = 0
    for(let octave = first; octave <= last; octave++) sum += octaveNoise3(seed, x, y, z, octave)
    return sum
}

function smooth(t: number): number {
    return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
}
