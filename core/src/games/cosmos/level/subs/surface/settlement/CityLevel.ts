import { Vec3 } from "../../../../../../engine/math"
import { fractalNoise3, hashUnit } from "../../../../../../engine/math"
import { staticMotion } from "../../../../space/Motion"
import type { Element } from "../../../Element"
import { drawsOf, inDisk } from "../../../draws"
import type { ElementData, ChildKind, Info } from "../../../Level"
import { SurfaceLevel } from "../../../SurfaceLevel"

/** A city in a biome: built-up ground, grey streets and roofs over the land, and people's spots in it. */
export class CityLevel extends SurfaceLevel {

    public readonly name = "city"

    public readonly label = "Ville"

    public readonly childKinds: readonly ChildKind[] = [{ kind: "human", weight: 1 }]

    protected readonly lastOctave = 9

    public childCount(): number {
        return 10
    }

    public describe(element: Element): ElementData {
        const draw = drawsOf(element)
        return {
            motion: staticMotion(inDisk(draw, 0.8), 0.08),
            color: [0.55, 0.55, 0.6],
            glow: 0,
            palette: [],
            extra: { grid: 12 + Math.floor(draw() * 20) },
        }
    }

    public override sampleAt(element: Element, local: Vec3, time: number): Info {
        const ground = super.sampleAt(element, local, time)
        const inside = Math.max(0, 1 - Math.hypot(local.x, local.z))
        const grid = element.data.extra.grid
        const block = hashUnit(element.id, Math.floor(local.x * grid), Math.floor(local.z * grid))
        const street = edge(local.x * grid) || edge(local.z * grid)
        const shade = street ? 0.3 : 0.45 + block * 0.4
        const noise = 0.05 * fractalNoise3(element.id, local.x * 40, 0, local.z * 40, 0, 2)
        const built = Math.min(1, inside * 2)
        return {
            color: [
                ground.color[0] + (shade + noise - ground.color[0]) * built,
                ground.color[1] + (shade + noise - ground.color[1]) * built,
                ground.color[2] + (shade + noise + 0.03 - ground.color[2]) * built,
            ],
            density: ground.density,
            height: ground.height + (street ? 0 : block * 0.4 * built),
            liquid: ground.liquid,
        }
    }
}

/** Is a coordinate in cell units near the border of its cell, where the streets are? */
function edge(cell: number): boolean {
    return Math.abs(((cell % 1) + 1) % 1 - 0.5) > 0.42
}
