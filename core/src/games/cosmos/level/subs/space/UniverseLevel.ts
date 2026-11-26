import { fractalNoise3, Vec3 } from "../../../../../engine/math"
import { staticMotion } from "../../../space/Motion"
import type { Element } from "../../Element"
import type { ElementData, ChildKind, Info } from "../../Level"
import { ElementLevel } from "../../ElementLevel"

/** How many galaxies the universe holds. */
export const GALAXY_COUNT = 90

/**
 * The density of galaxies at a point of the universe, from 0 to 1: a 3D noise of a coarse grain, squeezed so
 * that it is high in clusters and filaments and zero in the voids between them.
 */
export function galaxyDensity(seed: number, x: number, y: number, z: number): number {
    const noise = fractalNoise3(seed, x * 2.2, y * 2.2, z * 2.2, 0, 3)
    const raw = Math.min(1, Math.max(0, (noise + 0.15) / 1.1))
    return raw * raw
}

/**
 * The whole: the density of galaxies in space. Its galaxies are drawn where that density is high, so they
 * gather in clusters and leave voids.
 */
export class UniverseLevel extends ElementLevel {

    public readonly name = "universe"

    public readonly label = "Univers"

    public readonly childKinds: readonly ChildKind[] = [{ kind: "galaxy", weight: 1 }]

    public childCount(): number {
        return GALAXY_COUNT
    }

    public describe(): ElementData {
        const color = [0.3, 0.35, 0.8] as const
        return { motion: staticMotion(new Vec3(), 1), color, glow: 0, palette: [], extra: {} }
    }

    public sampleAt(element: Element, local: Vec3): Info {
        const density = galaxyDensity(element.id, local.x, local.y, local.z)
        return { color: [0.3, 0.35, 0.8], density: density * 0.5, height: 0, liquid: false }
    }
}
