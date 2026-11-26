import { hashUnit, Quat, Vec3 } from "../../../../../engine/math"
import { Frame } from "../../../space/Frame"
import type { Motion } from "../../../space/Motion"
import { drawsOf, hsv } from "../../draws"
import type { Element } from "../../Element"
import { ElementLevel } from "../../ElementLevel"
import type { Landmark } from "../../Landmark"
import type { ChildKind, ElementData, Info, Rgb } from "../../Level"
import type { Pose } from "../../Pose"

/** The size of a sun drawn as a landmark, in the units of its system. */
const SUN_SIZE = 0.002

/** One sun of a system: where it circles, what color and how bright. */
export interface Sun {
    readonly color: Rgb
    readonly luminosity: number
    readonly orbitRadius: number
    readonly period: number
    readonly phase: number
}

/**
 * A star system: one to three suns and the planets around them. In the galaxy it sits on a spiral arm and
 * circles the center, faster when nearer to it.
 */
export class SystemLevel extends ElementLevel {

    public readonly name = "system"

    public readonly label = "Système"

    public readonly childKinds: readonly ChildKind[] = [{ kind: "planet", weight: 1 }]

    public childCount(element: Element): number {
        return 2 + Math.floor(hashUnit(element.id, 0x706c616e) * 8)
    }

    public describe(element: Element): ElementData {
        const draw = drawsOf(element)
        const { arms, twist } = element.parent!.data.extra
        const radius = Math.sqrt(draw()) * 0.95
        const arm = Math.floor(draw() * arms)
        const angle = arm * Math.PI * 2 / arms + radius * twist + (draw() - 0.5) * 0.5
        const motion: Motion = {
            rest: new Vec3(0, (draw() - 0.5) * 0.06 * (1 - radius), 0),
            orbitRadius: radius,
            orbitTilt: 0,
            period: 400 * (0.15 + radius) ** 1.5,
            phase: angle,
            spinPeriod: 0,
            spinTilt: 0,
            orientation: new Quat(),
            scale: 2e-5,
        }
        const suns = this.suns(element)
        const main = suns[0]
        const palette = suns.map(sun => sun.color)
        return { motion, color: main.color, glow: main.luminosity, palette, extra: {} }
    }

    /** The suns of a system, the main one first. */
    public suns(element: Element): Sun[] {
        const draw = drawsOf(element)
        for(let skip = 0; skip < 16; skip++) draw()
        const count = draw() < 0.6 ? 1 : draw() < 0.8 ? 2 : 3
        return Array.from({ length: count }, (_, i): Sun => {
            const heat = draw()
            return {
                color: hsv(0.02 + heat * 0.6 * (heat > 0.5 ? 1 : 0.2), 0.15 + (1 - heat) * 0.6, 1),
                luminosity: (i === 0 ? 1 : 0.5) * (0.4 + heat * 0.6),
                orbitRadius: i === 0 ? 0 : 0.02 + draw() * 0.04,
                period: 5 + draw() * 20,
                phase: draw() * Math.PI * 2,
            }
        })
    }

    /** The planets, and the suns that circle at the middle of the system. */
    public override landmarks(local: Pose, time: number): Landmark[] {
        const marks = super.landmarks(local, time)
        for(const sun of this.suns(this.world.element(local.at))){
            const angle = sun.phase + Math.PI * 2 * time / sun.period
            const place = new Vec3(Math.cos(angle) * sun.orbitRadius, 0, Math.sin(angle) * sun.orbitRadius)
            marks.push({
                level: this, at: local.at, frame: new Frame(place, new Quat(), SUN_SIZE), color: sun.color,
                glow: sun.luminosity,
            })
        }
        return marks
    }

    public sampleAt(element: Element, local: Vec3, time: number): Info {
        let light = 0
        for(const sun of this.suns(element)){
            const angle = sun.phase + Math.PI * 2 * time / sun.period
            const dx = local.x - Math.cos(angle) * sun.orbitRadius
            const dz = local.z - Math.sin(angle) * sun.orbitRadius
            const distance = Math.hypot(dx, local.y, dz)
            light += sun.luminosity / (1 + distance * distance * 4000)
        }
        return { color: element.data.color, density: Math.min(1, light), height: 0, liquid: false }
    }
}
