import type { AmbientEffect } from "../AmbientEffect"
import { BAT_FLOORS } from "../themes"
import { follow, pick, together } from "../plays"

/** A few bats flutter around a fight. */
export const BATS: AmbientEffect = {
    id: "bats",
    weight: map => map.fights().length > 0 && BAT_FLOORS.includes(map.floor()) ? 3 : 0,
    start(map, { alpha, random }){
        const around = pick(random, map.fights()).position
        const bats = 2 + Math.floor(random() * 2)
        const plays = Array.from({ length: bats }, () => {
            const phase = random() * Math.PI * 2
            const reach = 14 + random() * 14
            const speed = 2.5 + random() * 1.5
            return follow({
                system: alpha, size: 3, color: 0x2a2433, duration: 5, opacity: 0.9,
                path: (_progress, age) => ({
                    x: around.x + Math.cos(age * speed + phase) * reach + Math.sin(age * 9 + phase) * 2,
                    y: around.y - 10 + Math.sin(age * speed * 1.7 + phase) * reach * 0.5,
                }),
            })
        })
        return together(plays)
    },
}
