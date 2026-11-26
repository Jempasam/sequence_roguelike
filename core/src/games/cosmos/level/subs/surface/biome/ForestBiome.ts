import { BiomeLevel } from "../../../BiomeLevel"
import type { ChildKind } from "../../../Level"
import type { Tint } from "../../../SurfaceLevel"

/** A green, gentle region, which holds some towns. */
export class ForestBiome extends BiomeLevel {

    public readonly name = "forest"

    public readonly label = "Forêt"

    public readonly childKinds: readonly ChildKind[] = [
        { kind: "zone", weight: 1 },
        { kind: "city", weight: 0.2 },
    ]

    protected readonly tint: Tint = { low: [0.12, 0.35, 0.14], high: [0.3, 0.5, 0.2] }

    protected readonly ground = 0.6
}
