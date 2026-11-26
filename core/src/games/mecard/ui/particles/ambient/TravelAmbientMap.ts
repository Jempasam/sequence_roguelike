import type { Sprite } from "../../../../../engine/gpu"
import type { Visual } from "../../../sim/base/Visual"
import type { FloorType } from "../../../sim/floor/Floor"
import type { Travel } from "../../../sim/travel/Travel"
import type { ParticleContext, ParticlePoint } from "../ParticleContext"
import type { AmbientFight, AmbientHalt, AmbientMap } from "./AmbientEffect"

/** What the ambient effects see of the map: the travel of the run, placed by what shows it. */
export class TravelAmbientMap implements AmbientMap {

    constructor(
        public readonly travel: () => Travel,
        public readonly context: () => ParticleContext|null,
        public readonly sprites: (visual: Visual|null) => Sprite|null,
        public readonly gold: () => Sprite|null,
    ){}

    public fights(): readonly AmbientFight[] {
        const { travel } = this
        const context = this.context()
        if(!context) return []
        const { trail, journey } = travel()
        const fights: AmbientFight[] = []
        for(const place of journey.places){
            if(!place.fight) continue
            const position = context.placePosition(place)
            if(position) fights.push({ place, type: place.fight, position, visited: trail.includes(place) })
        }
        return fights
    }

    public halts(): readonly AmbientHalt[] {
        const context = this.context()
        if(!context) return []
        const halts: AmbientHalt[] = []
        for(const place of this.travel().journey.places){
            if(!place.halt) continue
            const position = context.placePosition(place)
            if(position) halts.push({ place, type: place.halt, position })
        }
        return halts
    }

    public size(): { readonly width: number, readonly height: number } {
        return this.context()?.size() ?? { width: 0, height: 0 }
    }

    public heroPosition(): ParticlePoint|null {
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
