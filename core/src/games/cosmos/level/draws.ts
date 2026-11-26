import type { Random } from "../../../engine/particles/random"
import { seededRandom } from "../../../engine/particles/random"
import { hash32 } from "../../../engine/math"
import { Quat, Vec3 } from "../../../engine/math"
import type { Element } from "./Element"
import type { Rgb } from "./Level"

/** The numbers a level draws to describe a element: always the same sequence for the same element. */
export function drawsOf(element: Element): Random {
    return seededRandom(hash32(element.id, 0x64726177))
}

/** A color from a hue in turns, a saturation and a value, all from 0 to 1. */
export function hsv(hue: number, saturation: number, value: number): Rgb {
    const h = (((hue % 1) + 1) % 1) * 6
    const sector = Math.floor(h)
    const f = h - sector
    const p = value * (1 - saturation)
    const q = value * (1 - saturation * f)
    const t = value * (1 - saturation * (1 - f))
    switch(sector){
        case 0: return [value, t, p]
        case 1: return [q, value, p]
        case 2: return [p, value, t]
        case 3: return [p, q, value]
        case 4: return [t, p, value]
        default: return [value, p, q]
    }
}

/** A color between two others. */
export function mix(a: Rgb, b: Rgb, t: number): Rgb {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/** A random point inside the unit ball. */
export function inBall(draw: Random, radius = 1): Vec3 {
    for(;;){
        const x = draw() * 2 - 1
        const y = draw() * 2 - 1
        const z = draw() * 2 - 1
        if(x * x + y * y + z * z <= 1) return new Vec3(x * radius, y * radius, z * radius)
    }
}

/** A random point inside the unit disk lying flat, on the plane of the ground. */
export function inDisk(draw: Random, radius = 1): Vec3 {
    const angle = draw() * Math.PI * 2
    const distance = Math.sqrt(draw()) * radius
    return new Vec3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance)
}

/** The turn that takes the up direction (0, 1, 0) to a unit direction. */
export function upTo(direction: Vec3): Quat {
    const { x, y, z } = direction
    if(y < -0.9999999) return new Quat(1, 0, 0, 0)
    return new Quat(z, 0, -x, 1 + y).normalize()
}
