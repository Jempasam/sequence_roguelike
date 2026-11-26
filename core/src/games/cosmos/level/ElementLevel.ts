import type { Vec3 } from "../../../engine/math"
import { hashUnit } from "../../../engine/math"
import { conjugate } from "../space/Frame"
import type { Frame } from "../space/Frame"
import { frameAt } from "../space/Motion"
import type { Element } from "./Element"
import type { Choice, Landmark } from "./Landmark"
import type { ChildKind, ElementData, Info } from "./Level"
import { Level } from "./Level"
import { Pose } from "./Pose"
import type { Address } from "./Pose"
import type { World } from "./World"

/**
 * A level made of generated elements: each place of a parent holds elements drawn from its seed, which move
 * in it by a formula of the time. It implements the conversions between levels from the frames of its
 * elements, so a kind of level only describes what its elements are. The tree of elements stays in here.
 */
export abstract class ElementLevel extends Level {

    /** The world the level lives in, given by the registry. */
    public world!: World

    /** The kinds of element this level holds, with their shares. A level of the leaves holds none. */
    public abstract readonly childKinds: readonly ChildKind[]

    /** How many elements an element of this level holds. */
    public abstract childCount(element: Element): number

    /** Generate what is particular to an element, from its place in its parent and its name. */
    public abstract describe(element: Element): ElementData

    /** What an element of this level knows of a point of its space, at a time in seconds. */
    public abstract sampleAt(element: Element, local: Vec3, time: number): Info

    private lastAt: Address | null = null

    private lastElement: Element | null = null


    /** Where an element of this level lies in its parent at a time in seconds. */
    public elementFrame(element: Element, time: number): Frame {
        return frameAt(element.data.motion, time)
    }

    /** The kind of the child of an element at an index, drawn from the shares and the name of the child. */
    public kindOf(element: Element, index: number): string {
        const total = this.childKinds.reduce((sum, kind) => sum + kind.weight, 0)
        let draw = hashUnit(element.id, index, 0x6b696e64) * total
        for(const { kind, weight } of this.childKinds){
            if(draw < weight) return kind
            draw -= weight
        }
        return this.childKinds[this.childKinds.length - 1].kind
    }

    public pick(parent: Pose, time: number): Choice | null {
        const element = this.elementOf(parent.at)
        let best: Element | null = null
        let bestDistance = Infinity
        for(const child of element.children){
            const { origin } = child.frame(time)
            const distance = Math.hypot(
                parent.position.x - origin.x, parent.position.y - origin.y, parent.position.z - origin.z,
            )
            if(distance < bestDistance){
                best = child
                bestDistance = distance
            }
        }
        return best ? { level: best.level, at: best.address } : null
    }

    public enter(parent: Pose, at: Address, time: number, snap = false): Pose {
        const frame = this.world.element(at).frame(time)
        const position = frame.unapply(parent.position)
        if(snap){
            const reach = Math.hypot(position.x, position.y, position.z)
            if(reach > 1) position.set(position.x / reach, position.y / reach, position.z / reach)
        }
        const orientation = conjugate(frame.rotation).multiply(parent.orientation).normalize()
        return new Pose(position, orientation, frame.scale, at)
    }

    public leave(local: Pose, time: number): Pose {
        const element = this.elementOf(local.at)
        const parent = element.parent
        if(!parent) throw new Error("The whole has no level above it.")
        const frame = element.frame(time)
        const orientation = frame.rotation.clone().multiply(local.orientation).normalize()
        const scale = parent.parent ? parent.frame(time).scale : 1
        return new Pose(frame.apply(local.position), orientation, scale, parent.address)
    }

    public frame(local: Pose, time: number): Frame {
        return this.elementOf(local.at).frame(time)
    }

    public sample(local: Pose, time: number): Info {
        return this.sampleAt(this.elementOf(local.at), local.position, time)
    }

    public landmarks(local: Pose, time: number): Landmark[] {
        const marks: Landmark[] = []
        for(const child of this.elementOf(local.at).children){
            if(!child.level.shown) continue
            marks.push({
                level: child.level, at: child.address, frame: child.frame(time),
                color: child.data.color, glow: child.data.glow,
            })
        }
        return marks
    }

    /** The element at an address, kept for the next call: a view asks for it thousands of times. */
    protected elementOf(at: Address): Element {
        if(at === this.lastAt && this.lastElement) return this.lastElement
        const element = this.world.element(at)
        this.lastAt = at
        this.lastElement = element
        return element
    }
}
