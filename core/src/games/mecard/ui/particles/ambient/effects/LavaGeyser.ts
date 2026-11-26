import type { AmbientEffect } from "../AmbientEffect"
import { radial } from "../../recipes"
import { LAVA_FLOORS } from "../themes"
import { once, pick, queue, together } from "../plays"

const LAVA = { from: 0xffd34d, to: 0xff3a1a, size: 3, end: 2, life: 1.3, lifeSpread: 0.2 }

/** Lava jets out of the ground by a fight, three times, and falls back. */
export const LAVA_GEYSER: AmbientEffect = {
    id: "lava-geyser",

    weight: map => map.fights().length > 0 && LAVA_FLOORS.includes(map.floor()) ? 4 : 0,

    start(map, { alpha, additive, random }){
        const fight = pick(random, map.fights())
        const at = { x: fight.position.x + (random() < 0.5 ? -14 : 14), y: fight.position.y + 6 }
        return queue(3, 0.7, () => together([
            once(() => {
                radial(additive, random, at, 14, LAVA, {
                    speed: 110, speedSpread: 0.35, angle: [-1.9, -1.24], gravity: 260,
                })
                radial(additive, random, at, 1, { from: 0xff7a2a, size: 14, end: 0, life: 0.5 }, { speed: 0 })
                radial(alpha, random, at, 4, { from: 0x3a2a2a, size: 3, end: 6, life: 0.9 }, { speed: 25 })
            }),
        ]))
    },
}
