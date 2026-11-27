import { Color } from "../../../../engine/math"

/** How far apart the highest and lowest channels of a color are, under which it is grey and has no hue. */
const MIN_CHROMA = 0.02

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
