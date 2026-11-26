import { hash32, Quat, Vec3 } from "../../../../../engine/math"
import type { Motion } from "../../../space/Motion"
import type { Element } from "../../Element"
import { drawsOf, hsv } from "../../draws"
import type { ChildKind, ElementData, Look } from "../../Level"
import { SurfaceLevel } from "../../SurfaceLevel"

/**
 * A planet, a sphere of radius 1 in its own units. It circles its sun, turns on itself, and holds a land
 * and a sea cut by a coarse noise. Its children are the biomes spread on its surface.
 */
export class PlanetLevel extends SurfaceLevel {

    public readonly name = "planet"

    public readonly label = "Planète"

    public readonly childKinds: readonly ChildKind[] = [
        { kind: "forest", weight: 1 },
        { kind: "desert", weight: 1 },
    ]

    public override readonly look: Look = "sphere"

    public override readonly shown: boolean = true

    protected readonly lastOctave = 3

    public childCount(): number {
        return 40
    }

    public describe(element: Element): ElementData {
        const draw = drawsOf(element)
        const siblings = element.parent!.level.childCount(element.parent!)
        const orbitRadius = 0.08 + 0.85 * (element.index + draw() * 0.6) / siblings
        const motion: Motion = {
            rest: new Vec3(),
            orbitRadius,
            orbitTilt: (draw() - 0.5) * 0.2,
            period: 60 * (orbitRadius * 10) ** 1.5,
            phase: draw() * Math.PI * 2,
            spinPeriod: 40 + draw() * 160,
            spinTilt: draw() * 0.6,
            orientation: new Quat(),
            scale: 3e-3 + draw() * 5e-3,
        }
        const land = hsv(0.05 + draw() * 0.3, 0.3 + draw() * 0.4, 0.5 + draw() * 0.4)
        const sea = hsv(0.5 + draw() * 0.2, 0.5 + draw() * 0.4, 0.4 + draw() * 0.5)
        return {
            motion,
            color: [(land[0] + sea[0]) / 2, (land[1] + sea[1]) / 2, (land[2] + sea[2]) / 2],
            glow: 0,
            palette: [land, sea],
            extra: { noiseSeed: hash32(element.id, 0x6e6f6973), seaLevel: (draw() - 0.3) * 0.8 },
        }
    }
}
