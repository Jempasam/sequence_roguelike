import { staticMotion } from "../../../space/Motion"
import type { Element } from "../../Element"
import { drawsOf, inDisk } from "../../draws"
import type { ElementData, ChildKind } from "../../Level"
import { SurfaceLevel } from "../../SurfaceLevel"

/** A spot at the height of a person: the finest ground, with nothing smaller in it yet. */
export class HumanLevel extends SurfaceLevel {

    public readonly name = "human"

    public readonly label = "Humain"

    public readonly childKinds: readonly ChildKind[] = []

    protected readonly lastOctave = 15

    public childCount(): number {
        return 0
    }

    public describe(element: Element): ElementData {
        const draw = drawsOf(element)
        const scale = element.parent!.level.name === "city" ? 0.012 : 0.006
        return {
            motion: staticMotion(inDisk(draw, 0.8), scale),
            color: [0.4, 0.4, 0.4],
            glow: 0,
            palette: [],
            extra: {},
        }
    }
}
