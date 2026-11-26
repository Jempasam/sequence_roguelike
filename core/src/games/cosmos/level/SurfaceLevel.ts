import { fractalNoise3 } from "../../../engine/math"
import type { Vec3 } from "../../../engine/math"
import type { Frame } from "../space/Frame"
import type { Element } from "./Element"
import { ElementLevel } from "./ElementLevel"
import { mix } from "./draws"
import type { Info, Look, Rgb } from "./Level"

/** The palette that tints the land of a kind of place. */
export interface Tint {
    readonly low: Rgb
    readonly high: Rgb
}

/**
 * A level whose elements are pieces of the surface of a planet: the planet itself, its biomes, the zones in
 * them, the spots a person stands on. They all read the same noise of the planet, each from a deeper octave
 * than the level above, so a place seen from afar and from close agree on everything the far view knew.
 */
export abstract class SurfaceLevel extends ElementLevel {

    public override readonly look: Look = "ground"

    public override readonly shown: boolean = false

    /** The finest octave of noise this level adds. It holds the octaves of all the levels above. */
    protected abstract readonly lastOctave: number

    private readonly toPlanet = new Map<Element, { time: number, frame: Frame }>()

    /** The tint this level gives to the land of its elements. Null when it leaves it to the level above. */
    public ownTint(): Tint | null {
        return null
    }

    /** How strong the octaves of a place are, from 0. Null when it leaves it to the level above. */
    public ownRoughness(): number | null {
        return null
    }

    public sampleAt(element: Element, local: Vec3, time: number): Info {
        const planet = element.ancestor("planet")
        if(!planet) throw new Error("A surface level lies on a planet.")
        const onPlanet = this.planetFrame(element, planet, time).apply(local)
        const length = Math.hypot(onPlanet.x, onPlanet.y, onPlanet.z)
        const x = onPlanet.x / length
        const y = onPlanet.y / length
        const z = onPlanet.z / length
        const seed = planet.data.extra.noiseSeed
        const height = this.height(seed, x, y, z, roughnessOf(element))
        const liquid = height < planet.data.extra.seaLevel
        const [landColor, liquidColor] = planet.data.palette
        let color: Rgb
        if(liquid){
            const depth = Math.min(1, (planet.data.extra.seaLevel - height) / 1.2)
            const deep: Rgb = [liquidColor[0] * 0.4, liquidColor[1] * 0.4, liquidColor[2] * 0.6]
            color = mix(liquidColor, deep, depth)
        } else {
            const tint = tintOf(element)
            const up = Math.min(1, Math.max(0, (height - planet.data.extra.seaLevel) / 1.5))
            const base = tint ? mix(tint.low, tint.high, up) : mix(landColor, [1, 1, 1], up * 0.4)
            color = tint ? mix(base, landColor, 0.35) : base
        }
        return { color, density: 1, height, liquid }
    }

    /** The height at a direction of a planet, from its coarse octaves down to the finest of this level. */
    protected height(seed: number, x: number, y: number, z: number, roughness: number): number {
        const coarse = fractalNoise3(seed, x, y, z, 0, 3)
        if(this.lastOctave <= 3) return coarse
        return coarse + fractalNoise3(seed, x, y, z, 4, this.lastOctave) * roughness
    }

    /** The frame from an element to its planet at a time, kept for the next samples at the same time. */
    private planetFrame(element: Element, planet: Element, time: number): Frame {
        const known = this.toPlanet.get(element)
        if(known && known.time === time) return known.frame
        const frame = element.frameTo(planet, time)
        this.toPlanet.set(element, { time, frame })
        return frame
    }
}

function tintOf(element: Element): Tint | null {
    for(let current: Element | null = element; current; current = current.parent){
        if(current.level instanceof SurfaceLevel){
            const tint = current.level.ownTint()
            if(tint) return tint
        }
    }
    return null
}

function roughnessOf(element: Element): number {
    for(let current: Element | null = element; current; current = current.parent){
        if(current.level instanceof SurfaceLevel){
            const roughness = current.level.ownRoughness()
            if(roughness !== null) return roughness
        }
    }
    return 1
}
