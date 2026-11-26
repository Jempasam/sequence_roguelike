import type { FightType } from "../../../../sim/fight/FightType"
import type { HaltType } from "../../../../sim/halt/HaltType"
import type { AmbientContext } from "../AmbientContext"
import type { Stop } from "./Stop"

/** The places of the map where a trip may start or end. */
export type Places = (context: AmbientContext) => readonly Stop[]

/** Every place of the map. */
export const everywhere: Places = context => context.places()

/** The places that hold a halt of one of the sorts, with or without a fight beside it. */
export function haltsAmong(types: readonly HaltType[]): Places {
    return context => {
        return context.places().filter(({ place }) => place.halt !== null && types.includes(place.halt))
    }
}

/** The places that hold a fight the test accepts, with or without a halt beside it. */
export function fightsWhere(test: (fight: FightType) => boolean = () => true): Places {
    return context => context.places().filter(({ place }) => place.fight !== null && test(place.fight))
}

/** The places that hold a halt of any sort. */
export const allHaltPlaces: Places = context => context.places().filter(({ place }) => place.halt !== null)

/** The places among these ones the party did not go through yet. */
export function unwonWhere(places: Places): Places {
    return context => {
        const visited = new Set(context.places().filter(each => each.visited).map(each => each.place))
        return places(context).filter(stop => stop.place === null || !visited.has(stop.place))
    }
}

/** The places of any of the parts, each once. */
export function either(...parts: readonly Places[]): Places {
    return context => {
        const seen = new Set<Stop["place"]>()
        const stops: Stop[] = []
        for(const part of parts){
            for(const stop of part(context)){
                if(seen.has(stop.place)) continue
                seen.add(stop.place)
                stops.push(stop)
            }
        }
        return stops
    }
}
