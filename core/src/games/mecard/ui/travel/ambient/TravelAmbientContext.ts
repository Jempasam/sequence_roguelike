import type { Sprite } from "../../../../../engine/gpu"
import type { Area, Point } from "../../../../../engine/math"
import type { ParticleSystem, Random } from "../../../../../engine/particles"
import type { Visual } from "../../../sim/base/Visual"
import type { FloorType } from "../../../sim/floor/Floor"
import type { Travel } from "../../../sim/travel/Travel"
import type { TravelAnchors } from "../../particles/ParticleContext"
import type { TravelScreen } from "../TravelScreen"
import type { AmbientContext, AmbientUnit } from "./AmbientContext"
import { isIndoors } from "./themes"

/** The width of a map whose ambient is drawn at its own size, in virtual pixels. */
export const MAP_REFERENCE_WIDTH = 400

/** What the ambient of a map asks of the screen that shows it. */
export type ShownMap = Pick<TravelScreen, "shownMap"|"mapSettled"|"shownUnits"> & {
    readonly anchors: Pick<TravelAnchors, "placePosition"|"mapArea">
}

/** The map as the ambient effects see it: the travel of the run, placed by the screen that shows it. */
export class TravelAmbientContext implements AmbientContext {

    constructor(
        public readonly alpha: ParticleSystem,
        public readonly additive: ParticleSystem,
        public readonly random: Random,
        public readonly travel: () => Travel,
        public readonly screen: ShownMap,

        /** The size of the interface. */
        public readonly size: () => { readonly width: number, readonly height: number },

        public readonly sprite: (visual: Visual|null) => Sprite|null,
        public readonly coin: () => Sprite|null,
    ){}

    /** A wider map shows a larger ambient. */
    public get scale(): number {
        return this.area().width / MAP_REFERENCE_WIDTH
    }

    /** Is the map of the travel shown: not the one of a floor left, still on the screen? */
    public enabled(): boolean {
        return this.screen.shownMap === this.travel().journey
    }

    public settled(): boolean {
        return this.screen.mapSettled
    }

    public scene(): object|null {
        return this.screen.shownMap
    }

    public outdoors(): boolean {
        return !isIndoors(this.floor())
    }

    /** Travelers come into any map, indoors too, by its galleries or its doors. */
    public openEdges(): boolean {
        return true
    }

    public units(): readonly AmbientUnit[] {
        return this.screen.shownUnits
    }

    public places(): ReturnType<AmbientContext["places"]> {
        const { trail, journey } = this.travel()
        const places: ReturnType<AmbientContext["places"]>[number][] = []
        for(const place of journey.places){
            const position = this.screen.anchors.placePosition(place)
            if(position) places.push({ place, position, visited: trail.includes(place) })
        }
        return places
    }

    public area(): Area {
        return this.screen.anchors.mapArea() ?? { x: 0, y: 0, ...this.size() }
    }

    public heroPosition(): Point|null {
        const { place } = this.travel()
        return place ? this.screen.anchors.placePosition(place) : null
    }

    public floor(): FloorType {
        return this.travel().floor.type
    }
}
