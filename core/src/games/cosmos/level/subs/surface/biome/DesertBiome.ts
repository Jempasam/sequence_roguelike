import { BiomeLevel } from "../../../BiomeLevel"
import type { ChildKind } from "../../../Level"
import type { Tint } from "../../../SurfaceLevel"

/** A dry, rough region of sand and rock, with few towns. */
export class DesertBiome extends BiomeLevel {

    public readonly name = "desert"

    public readonly label = "Désert"

    public readonly childKinds: readonly ChildKind[] = [
        { kind: "zone", weight: 1 },
        { kind: "city", weight: 0.05 },
    ]

    protected readonly tint: Tint = { low: [0.7, 0.55, 0.3], high: [0.85, 0.72, 0.45] }

    protected readonly ground = 1.3
}
