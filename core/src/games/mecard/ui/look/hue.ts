import { Color } from "../../../../engine/math"
import type { PixelData } from "../../../../engine/image/PixelData"

/** How far apart the highest and lowest channels of a color are, under which it is grey and has no hue. */
const MIN_CHROMA = 0.02

/** The mean color of the pixels of an image, each weighted by its opacity, white for an image with none. */
export function averageColor({ data }: PixelData): Color {
    let red = 0
    let green = 0
    let blue = 0
    let weight = 0
    for(let index = 0; index < data.length; index += 4){
        const alpha = data[index + 3]
        red += data[index] * alpha
        green += data[index + 1] * alpha
        blue += data[index + 2] * alpha
        weight += alpha
    }
    if(weight === 0) return new Color(1, 1, 1)
    return new Color(red / weight / 255, green / weight / 255, blue / weight / 255)
}

/** The hue of a color, an angle in radians from 0 to 2π, none for a grey. */
export function hueOf({ r, g, b }: Color): number|null {
    const high = Math.max(r, g, b)
    const chroma = high - Math.min(r, g, b)
    if(chroma < MIN_CHROMA) return null
    const sector = high === r ? (g - b) / chroma : high === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4
    return (sector + 6) % 6 / 6 * 2 * Math.PI
}

/** The color of a hue, as saturated and as bright as it can be. */
export function colorOfHue(hue: number): Color {
    const channel = (offset: number): number => {
        const sector = (offset + hue / (Math.PI / 3)) % 6
        return 1 - Math.max(0, Math.min(sector, 4 - sector, 1))
    }
    return new Color(channel(5), channel(3), channel(1))
}

/**
 * The color whose hue lies halfway, the shorter way round, between the hues of two colors: the first one
 * when either is grey, or when they face each other.
 */
export function mixHues(base: Color, other: Color): Color {
    const first = hueOf(base)
    const second = hueOf(other)
    if(first === null || second === null) return base
    const across = Math.sin(first) + Math.sin(second)
    const along = Math.cos(first) + Math.cos(second)
    if(Math.hypot(across, along) < 1e-6) return base
    return colorOfHue((Math.atan2(across, along) + 2 * Math.PI) % (2 * Math.PI))
}
