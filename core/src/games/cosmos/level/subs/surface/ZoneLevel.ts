import { staticMotion } from "../../../space/Motion"
import type { Element } from "../../Element"
import { drawsOf, inDisk } from "../../draws"
import type { ElementData, ChildKind } from "../../Level"
import { SurfaceLevel } from "../../SurfaceLevel"

/** A zone of a biome, a few kilometers of ground, which holds the spots a person stands on. */
export class ZoneLevel extends SurfaceLevel {

    public readonly name = "zone"

    public readonly label = "Zone"

    public readonly childKinds: readonly ChildKind[] = [{ kind: "human", weight: 1 }]

    protected readonly lastOctave = 11

    public childCount(): number {
        return 6
    }

    public describe(element: Element): ElementData {
        const draw = drawsOf(element)
        return {
            motion: staticMotion(inDisk(draw, 0.8), 0.1),
            color: [0.4, 0.4, 0.4],
            glow: 0,
            palette: [],
            extra: {},
        }
    }
}
