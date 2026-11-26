import type { AmbientEffect, AmbientFight, AmbientMap } from "../AmbientEffect"
import { radial, SPARK } from "../../recipes"
import { BLAST_FLOORS } from "../themes"
import { once, pick } from "../plays"

const SMOKE = { from: 0x4a4650, to: 0x2a2830, size: 4, end: 16, life: 1.8, lifeSpread: 0.25 }

/** Whether a fight can blow up: its floor is one for it, and the party did not go through it yet. */
function blowable(map: AmbientMap): readonly AmbientFight[] {
    return BLAST_FLOORS.includes(map.floor()) ? map.fights().filter(fight => !fight.visited) : []
}

/** A fight not yet won blows up: a fireball, flying debris, smoke. */
export const EXPLOSION: AmbientEffect = {
    id: "explosion",

    weight: map => blowable(map).length > 0 ? 2 : 0,

    start(map, { alpha, additive, random }){
        const at = pick(random, blowable(map)).position
        return once(() => {
            radial(additive, random, at, 1, { from: 0xffffff, to: 0xff7a2a, size: 6, end: 30, life: 0.35 }, {
                speed: 0,
            })
            radial(additive, random, at, 16, { ...SPARK, size: 3, life: 0.7 }, {
                speed: 150, speedSpread: 0.5, gravity: 260,
            })
            radial(additive, random, at, 8, { from: 0xffd34d, to: 0xff3a1a, size: 5, end: 1, life: 0.5 }, {
                speed: 70, drag: 2,
            })
            radial(alpha, random, at, 10, SMOKE, { speed: 40, drag: 1.5, angle: [-Math.PI, 0] })
            radial(alpha, random, at, 6, { from: 0x3a2a2a, size: 2, life: 0.9, fades: false }, {
                speed: 120, gravity: 350, speedSpread: 0.5,
            })
        })
    },
}
