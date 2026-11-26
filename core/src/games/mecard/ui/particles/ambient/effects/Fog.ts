import type { AmbientEffect } from "../AmbientEffect"
import { FOG_FLOORS } from "../themes"
import { after, follow, together } from "../plays"

/** Banks of fog glide along the bottom of the map. */
export const FOG: AmbientEffect = {
    id: "fog",
    weight: map => FOG_FLOORS.includes(map.floor()) ? 4 : 0,
    start(map, { alpha, random }){
        const { width, height } = map.size()
        const banks = Array.from({ length: 3 }, (_, bank) => {
            const y = height * (0.72 + random() * 0.2)
            const size = 90 + random() * 50
            return after(bank * 2.5, () => follow({
                system: alpha, size, color: 0xa8b8a8, opacity: 0.13, duration: 14,
                path: progress => ({ x: -50 + (width + 100) * progress, y: y + Math.sin(progress * 5) * 6 }),
            }))
        })
        return together(banks)
    },
}
