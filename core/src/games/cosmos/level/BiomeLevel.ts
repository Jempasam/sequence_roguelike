import { Vec3 } from "../../../engine/math"
import { staticMotion } from "../space/Motion"
import type { Element } from "./Element"
import { drawsOf, upTo } from "./draws"
import type { ElementData } from "./Level"
import type { Tint } from "./SurfaceLevel"
import { SurfaceLevel } from "./SurfaceLevel"

/**
 * A region of a planet's surface, a flat patch whose up is the outside of the planet. The concept of a
 * biome: its kinds, in `subs/biome`, differ by the tint of their land, the roughness of their ground and
 * what they hold.
 */
export abstract class BiomeLevel extends SurfaceLevel {

    protected readonly lastOctave = 7

    /** The tint of the land of this kind of biome. */
    protected abstract readonly tint: Tint

    /** The strength of the fine ground of this kind of biome. */
    protected abstract readonly ground: number

    public override ownTint(): Tint {
        return this.tint
    }

    public override ownRoughness(): number {
        return this.ground
    }

    public childCount(): number {
        return 16
    }

    public describe(element: Element): ElementData {
        const draw = drawsOf(element)
        const count = element.parent!.level.childCount(element.parent!)
        const golden = Math.PI * (3 - Math.sqrt(5))
        const y = 1 - (element.index + 0.5) * 2 / count
        const ring = Math.sqrt(1 - y * y)
        const angle = element.index * golden
        const direction = new Vec3(Math.cos(angle) * ring, y, Math.sin(angle) * ring)
        return {
            motion: staticMotion(direction, 0.28, upTo(direction)),
            color: [(this.tint.low[0] + this.tint.high[0]) / 2, (this.tint.low[1] + this.tint.high[1]) / 2,
                (this.tint.low[2] + this.tint.high[2]) / 2],
            glow: 0,
            palette: [],
            extra: { variant: draw() },
        }
    }
}
