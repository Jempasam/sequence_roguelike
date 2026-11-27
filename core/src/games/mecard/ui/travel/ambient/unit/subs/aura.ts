import type { Scene } from "../../scene/Scene"
import { pictureOf } from "../../scene/Grain"
import { following } from "../following"
import { anchorOf, emitPuff } from "../Puff"
import type { Anchor, Puff } from "../Puff"
import { drawAmong } from "../selection"
import type { Choice } from "../selection"
import { Tracked } from "../Tracked"

/** A puff a unit gives off again and again. */
export interface Emission extends Puff {
    readonly anchor: Anchor

    /** The seconds between two puffs of a unit. */
    readonly interval: number
}

/** What makes an aura. */
export interface AuraSpec {
    readonly among: Choice
    readonly emissions: readonly Emission[]

    /** The seconds puffs are born for. */
    readonly duration: number

    /** The most units it takes, drawn at random: all of them by default. */
    readonly most?: number

    /** Does each unit start at its own time? All start at once by default. */
    readonly staggered?: boolean

    /** The seconds a unit must have been still for to give off a puff, any by default. */
    readonly still?: number
}

/** What units give off while they are shown: a breath, drops, notes. It follows them. */
export function aura(spec: AuraSpec): Scene {
    const { among, emissions, duration, most, staggered = false, still } = spec
    return {
        playable: context => among(context).length > 0,
        create(context){
            const pictures = emissions.map(emission => pictureOf(context, emission.grain))
            if(pictures.includes(undefined)) return null
            const { random } = context
            const units = drawAmong(random, among(context), most).map(each => new Tracked(each))
            if(units.length === 0) return null
            const waits = units.map(() => emissions.map(each => staggered ? random() * each.interval : 0))
            return following(context, units, duration, dt => {
                units.forEach((unit, index) => {
                    if(unit.gone || still !== undefined && unit.stillFor < still) return
                    emissions.forEach((emission, rank) => {
                        waits[index][rank] -= dt
                        if(waits[index][rank] > 0) return
                        waits[index][rank] += emission.interval
                        const at = anchorOf(unit.shown, emission.anchor)
                        emitPuff(context, emission, pictures[rank] ?? null, at, unit.shown.facing)
                    })
                })
                return units.some(unit => !unit.gone)
            })
        },
    }
}
