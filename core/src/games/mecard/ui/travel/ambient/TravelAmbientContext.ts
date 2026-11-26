import type { Sprite } from "../../../../../engine/gpu"
import type { Area, Point } from "../../../../../engine/math"
import type { ParticleSystem, Random } from "../../../../../engine/particles"
import type { Visual } from "../../../sim/base/Visual"
import type { FloorType } from "../../../sim/floor/Floor"
import type { Travel } from "../../../sim/travel/Travel"
import type { ParticleContext } from "../../particles/ParticleContext"
import type { AmbientContext } from "./AmbientContext"

/** What the ambient effects see of the map: the travel of the run, placed by what shows it. */
export class TravelAmbientContext implements AmbientContext {

    constructor(
        public readonly alpha: ParticleSystem,
        public readonly additive: ParticleSystem,
        public readonly random: Random,
        public readonly travel: () => Travel,
        public readonly context: () => ParticleContext|null,
        public readonly sprites: (visual: Visual|null) => Sprite|null,
        public readonly gold: () => Sprite|null,
    ){}

    public places(): ReturnType<AmbientContext["places"]> {
        const context = this.context()
        if(!context) return []
        const { trail, journey } = this.travel()
        const places: ReturnType<AmbientContext["places"]>[number][] = []
        for(const place of journey.places){
            const position = context.placePosition(place)
            if(position) places.push({ place, position, visited: trail.includes(place) })
        }
        return places
    }

    public size(): { readonly width: number, readonly height: number } {
        return this.context()?.size() ?? { width: 0, height: 0 }
    }

    public area(): Area {
        const { width, height } = this.size()
        return this.context()?.mapArea() ?? { x: 0, y: 0, width, height }
    }

    public heroPosition(): Point|null {
        const place = this.travel().place
        return place ? this.context()?.placePosition(place) ?? null : null
    }

    public floor(): FloorType {
        return this.travel().floor.type
    }

    public sprite(visual: Visual|null): Sprite|null {
        return this.sprites(visual)
    }

    public coin(): Sprite|null {
        return this.gold()
    }
}
