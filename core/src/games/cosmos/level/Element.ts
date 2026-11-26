import { hash32, hashText } from "../../../engine/math"
import { Frame } from "../space/Frame"
import type { ElementLevel } from "./ElementLevel"
import type { ElementData } from "./Level"
import type { Address } from "./Pose"
import type { World } from "./World"

/**
 * One thing a level holds: a galaxy, a planet, a zone. It is its place in its parent, the data its level
 * generated for that place, and its children, generated when first asked for. The same world always gives the
 * same elements. Only the levels see elements: the engine only sees poses.
 */
export class Element {

    /** What the level generated for this element. */
    public readonly data: ElementData

    /** How many parents are above this element. */
    public readonly depth: number

    /** Where this element is in the tree of elements: the indices from the root. */
    public readonly address: Address

    private made: Element[] | null = null


    constructor(
        public readonly world: World,
        public readonly level: ElementLevel,
        public readonly parent: Element | null,
        public readonly index: number,
        public readonly id: number,
    ){
        this.depth = parent ? parent.depth + 1 : 0
        this.address = parent ? [...parent.address, index] : []
        this.data = level.describe(this)
    }


    /** The child of an element at an index, of the kind its level draws for that index. */
    public static child(parent: Element, index: number): Element {
        const kind = parent.level.kindOf(parent, index)
        const level = parent.world.registry.get(kind)
        return new Element(parent.world, level, parent, index, hash32(parent.id, index, hashText(kind)))
    }

    /** The elements this one holds, generated once. */
    public get children(): readonly Element[] {
        if(!this.made){
            const count = this.level.childCount(this)
            this.made = Array.from({ length: count }, (_, index) => Element.child(this, index))
        }
        return this.made
    }

    /** Where this element lies in its parent at a time in seconds. */
    public frame(time: number): Frame {
        return this.level.elementFrame(this, time)
    }

    /** The frame that takes a point of this element to the space of one of its ancestors, at a time. */
    public frameTo(ancestor: Element, time: number): Frame {
        if(this === ancestor) return Frame.identity()
        if(!this.parent) throw new Error("The element is not under that ancestor.")
        return this.parent.frameTo(ancestor, time).after(this.frame(time))
    }

    /** The nearest element above this one, itself included, of a level. Null when there is none. */
    public ancestor(levelName: string): Element | null {
        if(this.level.name === levelName) return this
        return this.parent ? this.parent.ancestor(levelName) : null
    }
}
