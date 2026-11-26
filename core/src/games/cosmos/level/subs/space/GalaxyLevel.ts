import { Quat, Vec3 } from "../../../../../engine/math"
import { Frame } from "../../../space/Frame"
import type { Motion } from "../../../space/Motion"
import { frameAt } from "../../../space/Motion"
import type { Element } from "../../Element"
import { drawsOf, hsv, inBall } from "../../draws"
import type { ElementData, ChildKind, Info, Stage } from "../../Level"
import { ElementLevel } from "../../ElementLevel"
import { galaxyDensity } from "./UniverseLevel"

/**
 * A galaxy: a disk of star systems that turn around its center, faster near it. Its brightness at a point
 * is the density of its stars, thicker along its arms.
 */
export class GalaxyLevel extends ElementLevel {

    public readonly name = "galaxy"

    public readonly label = "Galaxie"

    public readonly childKinds: readonly ChildKind[] = [{ kind: "system", weight: 1 }]

    /** A dot from afar, then its fog of stars, then its systems, each placed. */
    public override readonly stages: readonly Stage[] = [
        { name: "point", minRadius: 0 },
        { name: "fog", minRadius: 3 },
        { name: "children", minRadius: 40 },
    ]

    public childCount(): number {
        return 360
    }

    /** The galaxy turns on itself around the axis of its disk, so its fog moves. */
    public override elementFrame(element: Element, time: number): Frame {
        const base = frameAt({ ...element.data.motion, spinPeriod: 0 }, time)
        const turn = new Quat().setAxisAngle(0, 1, 0, Math.PI * 2 * time / element.data.extra.spin)
        return new Frame(base.origin, base.rotation.clone().multiply(turn), base.scale)
    }

    public describe(element: Element): ElementData {
        const draw = drawsOf(element)
        const motion: Motion = {
            rest: this.placed(element, draw),
            orbitRadius: 0.02,
            orbitTilt: draw() * Math.PI,
            period: 3000 + draw() * 6000,
            phase: draw() * Math.PI * 2,
            spinPeriod: 0,
            spinTilt: 0,
            orientation: new Quat().setAxisAngle(draw() - 0.5, draw() + 0.2, draw() - 0.5, draw() * Math.PI),
            scale: 0.02 + draw() * 0.03,
        }
        const hue = draw()
        return {
            motion,
            color: hsv(hue, 0.5, 0.9),
            glow: 0.4 + draw() * 0.6,
            palette: [hsv(hue, 0.7, 1), hsv(hue + 0.12, 0.4, 0.8)],
            extra: { arms: 2 + Math.floor(draw() * 4), twist: 2 + draw() * 4, spin: 300 + draw() * 600 },
        }
    }

    /** A place drawn by the density of galaxies there: often in a cluster, rarely in a void. */
    private placed(element: Element, draw: () => number): Vec3 {
        const universe = element.parent!
        let place = inBall(draw, 0.9)
        for(let tries = 0; tries < 200; tries++){
            place = inBall(draw, 0.9)
            if(draw() < galaxyDensity(universe.id, place.x, place.y, place.z)) break
        }
        return place
    }

    public sampleAt(element: Element, local: Vec3): Info {
        const radius = Math.hypot(local.x, local.z)
        const { arms, twist } = element.data.extra
        const angle = Math.atan2(local.z, local.x)
        const arm = 0.5 + 0.5 * Math.cos(arms * (angle - radius * twist))
        const disk = Math.exp(-radius * radius * 2.5) * Math.exp(-(local.y * local.y) / 0.004)
        const density = Math.min(1, disk * (0.35 + 0.65 * arm))
        return { color: element.data.color, density, height: 0, liquid: false }
    }
}
