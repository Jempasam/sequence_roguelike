import type { Painter } from "../gpu"
import { Color } from "../math"

import { internals } from "./Component"
import type { Component } from "./Component"
import { Container } from "./Container"
import type { DirtyRegion } from "./DirtyRegion"
import type { Layer } from "./Layer"
import { applyPose } from "./Pose"
import { Rect } from "./Rect"

/** What a zone with nothing opaque below is cleared to before it is drawn again. */
const TRANSPARENT = new Color(0, 0, 0, 0)

/** What, in debug, a zone drawn again from an opaque component is cleared to, so a hole shows at once. */
const MAGENTA = new Color(1, 0, 1, 1)

/**
 * Where drawing a zone again starts, as the search finds it: from a component, from the root, or not at
 * all since it is hidden.
 */
type Start =
    | { readonly kind: "component", readonly layer: number, readonly component: Component }
    | { readonly kind: "root" }
    | { readonly kind: "hidden" }

const ROOT: Start = { kind: "root" }
const HIDDEN: Start = { kind: "hidden" }

/**
 * Draws the zones of the interface texture that changed, each from its starting point, as `paintImmediately`
 * does in Swing.
 *
 * @remarks
 * Drawing from the root is always right, but often useless: what lies under an opaque component is
 * hidden. Each zone looks for its start. It goes down from the root into the child holding the zone, the
 * last one in a container whose children overlap, until no child holds it whole. Then it climbs back to
 * the first component whose opaque zone covers it, checking on the way, in each container whose children
 * overlap, the siblings drawn after: one that is opaque over the whole zone hides it.
 *
 * The zone is then cut to a scissor, cleared to transparent when nothing opaque lies below, and drawn from
 * the root, skipping what comes before the start in the drawing order: the `paint` of its containers and
 * the siblings drawn before each of them. Everything after the start that crosses the zone is drawn again,
 * not only the component that changed: a sibling over it, a menu open above, the debug layer.
 *
 * The walk is written once, here: a component only draws itself, and this class draws its children, skips
 * those outside the zone, and gives each the part of the zone over it. Under a container posing its
 * children, nothing is skipped: the bounds of a child no longer say where it is drawn.
 */
export class Repaint {


    /**
     * @param debug - Are the checks of debug on: a zone drawn again from an opaque component cleared to
     * magenta first, and a component drawing out of its bounds refused?
     */
    constructor(
        public readonly painter: Painter,
        public readonly debug: boolean,
    ){}


    /** Is a zone of a component, in coordinates of the texture, hidden by an opaque one drawn after it? */
    public isHidden(component: Component, area: Readonly<Rect>, layers: readonly Layer[]): boolean {
        let child = component
        for(let parent = child.parent; parent; child = parent, parent = parent.parent){
            if(parent.childrenMayOverlap && this.#coveredAfter(parent, child, area)) return true
        }
        const index = layers.findIndex(layer => layer.content === child)
        for(let above = index + 1; above > 0 && above < layers.length; above++){
            const content = layers[above].content
            if(!content.visible) continue
            for(const sibling of content.children) if(this.#covers(sibling, area)) return true
        }
        return false
    }

    /** Draw again every zone of a region. */
    public draw(layers: readonly Layer[], region: DirtyRegion): void {
        const painter = this.painter
        painter.push()
        painter.setBlend("alpha")
        for(const rect of region.rects) this.#drawZone(layers, rect)
        painter.pop()
    }


    /** A rectangle per depth of the walk, so drawing allocates nothing. */
    readonly #clips: Rect[] = []
    readonly #scratch = new Rect()
    readonly #opaque = new Rect()

    #clipAt(depth: number): Rect {
        while(this.#clips.length <= depth) this.#clips.push(new Rect())
        return this.#clips[depth]
    }

    #drawZone(layers: readonly Layer[], rect: Readonly<Rect>): void {
        const start = this.#startOf(layers, rect)
        if(start.kind === "hidden") return
        const painter = this.painter
        painter.push()
        painter.clip(rect.x, rect.y, rect.width, rect.height)
        if(start.kind === "root") painter.clear(TRANSPARENT)
        else if(this.debug) painter.clear(MAGENTA)
        const path = start.kind === "component" ? ancestorsOf(start.component) : null
        const first = start.kind === "component" ? start.layer : 0
        for(let index = first; index < layers.length; index++){
            const onPath = path !== null && index === first
            this.#walk(layers[index].content, rect, 0, 0, 0, onPath ? path : null, 0, false)
        }
        painter.pop()
    }


    //// The start ////

    #startOf(layers: readonly Layer[], rect: Readonly<Rect>): Start {
        let top = -1
        for(let index = layers.length - 1; index >= 0 && top < 0; index--){
            if(this.#touches(layers[index], rect)) top = index
        }
        if(top < 0) return ROOT
        let from: Component = this.#deepestHolding(layers[top].content, rect)
        for(;;){
            if(this.#covers(from, rect)) return { kind: "component", layer: top, component: from }
            const parent = from.parent
            if(!parent) return ROOT
            if(parent.childrenMayOverlap && this.#coveredAfter(parent, from, rect)) return HIDDEN
            from = parent
        }
    }

    /** Does a layer show something over a zone? Its content draws nothing itself, so its children say. */
    #touches(layer: Layer, rect: Readonly<Rect>): boolean {
        if(!layer.content.visible) return false
        const area = this.#scratch
        for(const child of layer.content.children){
            if(internals.absoluteArea(child, area) && area.intersects(rect)) return true
        }
        return false
    }

    /** The deepest component holding a whole zone, going down into the last such child of each container. */
    #deepestHolding(component: Component, rect: Readonly<Rect>): Component {
        const area = this.#scratch
        let current = component
        for(;;){
            if(!(current instanceof Container)) return current
            const children = current.children
            let next: Component|null = null
            for(let index = children.length - 1; index >= 0 && !next; index--){
                const child = children[index]
                if(internals.absoluteArea(child, area) && area.contains(rect)) next = child
            }
            if(!next) return current
            current = next
        }
    }

    /** Is a zone covered by a sibling drawn after a child in a container? */
    #coveredAfter(parent: Container<unknown>, child: Component, rect: Readonly<Rect>): boolean {
        const siblings = parent.children
        for(let index = siblings.indexOf(child) + 1; index < siblings.length; index++){
            if(this.#covers(siblings[index], rect)) return true
        }
        return false
    }

    /**
     * Does a component cover a whole zone, in coordinates of the texture, with opaque pixels? Never under a
     * pose, which may turn it off what it would cover.
     */
    #covers(component: Component, rect: Readonly<Rect>): boolean {
        if(!component.visible || internals.isPosed(component)) return false
        const opaque = internals.opaqueArea(component)
        if(!opaque) return false
        const area = this.#opaque.copyFrom(opaque)
        return internals.toAbsolute(component, area) && area.contains(rect)
    }


    //// The walk ////

    /**
     * Draw a component and its children within a zone, or only the part of them after the start when the
     * component lies on the path to it.
     *
     * @param clip - The zone, in coordinates of the texture.
     * @param originX - The origin of the content of its parent, in coordinates of the texture.
     * @param path - The containers from the content of the layer down to the start, none when everything
     *   is drawn.
     * @param posed - Is it under a container posing its children? Its bounds then do not say where it is
     *   drawn: it is drawn whole, and no scissor is set, which would turn with the pose.
     */
    #walk(
        component: Component, clip: Readonly<Rect>, originX: number, originY: number, depth: number,
        path: readonly Component[]|null, step: number, posed: boolean,
    ): void {
        if(!component.visible) return
        const bounds = component.bounds
        const x = originX + bounds.x
        const y = originY + bounds.y
        const area = this.#clipAt(depth).set(x, y, bounds.width, bounds.height)
        if(!posed){
            if(!area.intersects(clip)) return
            area.intersect(clip)
        }
        const isBeforeStart = path !== null && step < path.length - 1
        const painter = this.painter
        const squeezed = internals.isSqueezed(component)
        if(squeezed && posed){
            throw new Error(`A ${component.constructor.name} under a pose got less than its minimum size: it`
                + " cannot be cut under a pose. Give it the room it asks for.")
        }
        if(squeezed){
            painter.push()
            painter.clip(area.x, area.y, area.width, area.height)
        }
        if(!isBeforeStart) this.#paint(component, area, x, y, squeezed || posed)
        if(component instanceof Container){
            this.#walkChildren(component, area, x, y, depth, isBeforeStart ? path : null, step, posed)
        }
        if(squeezed) painter.pop()
    }

    #walkChildren(
        container: Container<unknown>, clip: Rect, x: number, y: number, depth: number,
        path: readonly Component[]|null, step: number, posed: boolean,
    ): void {
        const painter = this.painter
        const viewport = internals.viewportOf(container)
        const pose = internals.poseOf(container)
        if(viewport && (posed || pose)){
            throw new Error(`A ${container.constructor.name} with a viewport is under a pose: its scissor would`
                + " turn with it. Keep scrolling out of posed containers.")
        }
        if(viewport){
            clip.intersect(this.#scratch.copyFrom(viewport).translate(x, y))
            if(clip.isEmpty) return
            painter.push()
            painter.clip(clip.x, clip.y, clip.width, clip.height)
        }
        if(pose){
            painter.push()
            applyPose(painter, pose, x, y)
        }
        const contentX = x - internals.scrollXOf(container)
        const contentY = y - internals.scrollYOf(container)
        const next = path ? path[step + 1] : null
        let reached = next === null
        for(const child of container.children){
            if(!reached && child !== next) continue
            const followsPath = !reached
            reached = true
            const under = followsPath ? path : null
            this.#walk(child, clip, contentX, contentY, depth + 1, under, step + 1, posed || pose !== null)
        }
        if(pose) painter.pop()
        if(viewport) painter.pop()
    }

    /**
     * Draw what a component draws itself, at its origin, and check in debug that it stays in its bounds,
     * unless it is cut to them, or posed and checked by the container posing it.
     */
    #paint(component: Component, area: Readonly<Rect>, x: number, y: number, unchecked: boolean): void {
        const painter = this.painter
        painter.push()
        painter.translate(x, y)
        const local = this.#scratch.copyFrom(area).translate(-x, -y)
        if(this.debug) painter.startReach()
        internals.paint(component, painter, local)
        const reach = this.debug ? painter.endReach() : null
        painter.pop()
        if(!reach || unchecked) return
        const { width, height } = component.bounds
        const isInside = reach.left >= x && reach.top >= y
            && reach.right <= x + width && reach.bottom <= y + height
        if(!isInside){
            throw new Error(`A ${component.constructor.name} of ${width}×${height} at (${x}, ${y}) drew from`
                + ` (${reach.left}, ${reach.top}) to (${reach.right}, ${reach.bottom}), out of its bounds. It`
                + " would leave traces where nothing erases them: a border or a shadow is part of the bounds.")
        }
    }
}

/** The components from the top of the tree down to a component, itself included. */
function ancestorsOf(component: Component): Component[] {
    const path: Component[] = []
    for(let c: Component|null = component; c; c = c.parent) path.push(c)
    return path.reverse()
}
