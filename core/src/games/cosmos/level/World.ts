import { hash32, hashText } from "../../../engine/math"
import { Element } from "./Element"
import type { LevelRegistry } from "./LevelRegistry"
import type { Address } from "./Pose"

/**
 * One universe: a seed, the levels that exist, and the element that holds the largest scale. The levels of
 * a registry belong to the world they are given to.
 */
export class World {

    /** The element that holds all the others. */
    public readonly root: Element

    private readonly known = new Map<string, Element>()


    constructor(
        public readonly seed: number,
        public readonly registry: LevelRegistry,
        rootKind = "universe",
    ){
        registry.bind(this)
        this.root = new Element(this, registry.get(rootKind), null, 0, hash32(seed, hashText(rootKind)))
        this.known.set("", this.root)
    }


    /** The element at an address. */
    public element(at: Address): Element {
        const key = at.join(".")
        const known = this.known.get(key)
        if(known) return known
        const parent = this.element(at.slice(0, -1))
        const element = parent.children[at[at.length - 1]]
        if(!element) throw new Error(`No element is at the address ${key}.`)
        this.known.set(key, element)
        return element
    }
}
