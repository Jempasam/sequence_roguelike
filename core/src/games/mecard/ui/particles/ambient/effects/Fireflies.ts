import type { AmbientEffect } from "../AmbientEffect"
import { follow, pick, together } from "../plays"

/** Fireflies drift around a fight and go out. */
export const FIREFLIES: AmbientEffect = {
    id: "fireflies",
    weight: map => map.fights().length > 0 ? 2 : 0,
    start(map, { additive, random }){
        const around = pick(random, map.fights()).position
        const flies = 4 + Math.floor(random() * 3)
        const plays = Array.from({ length: flies }, () => {
            const phase = random() * Math.PI * 2
            const reach = 10 + random() * 16
            return follow({
                system: additive, size: 3, color: 0xe8ff7a, duration: 6 + random() * 2,
                path: (_progress, age) => ({
                    x: around.x + Math.cos(age * 0.9 + phase) * reach,
                    y: around.y - 8 + Math.sin(age * 1.3 + phase) * reach * 0.6 - age * 2,
                }),
            })
        })
        return together(plays)
    },
}
