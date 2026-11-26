import type { AmbientEffect } from "../AmbientEffect"
import { follow, together } from "../plays"

/** A whirl of dust and leaves turns around a middle that crosses the map in a zigzag. */
export const WHIRL: AmbientEffect = {
    id: "whirl",
    weight: () => 2,
    start(map, { alpha, random }){
        const { width, height } = map.size()
        const leftToRight = random() < 0.5
        const y = height * (0.3 + random() * 0.5)
        const bits = Array.from({ length: 10 }, (_, index) => {
            const leaf = index % 3 === 0
            const lift = index / 10
            const turn = (random() * 0.6 + 0.7) * 6
            const phase = index * 0.63
            return follow({
                system: alpha, size: leaf ? 3 : 2, duration: 8, opacity: leaf ? 0.9 : 0.6,
                color: leaf ? 0x9ab04a : 0xb8a88a,
                path: (progress, age) => {
                    const share = leftToRight ? progress : 1 - progress
                    const radius = 4 + lift * 12
                    const around = age * turn + phase
                    return {
                        x: -20 + (width + 40) * share + Math.cos(around) * radius,
                        y: y + Math.sin(progress * 9) * 16 - lift * 22 + Math.sin(around) * radius * 0.35,
                    }
                },
            })
        })
        return together(bits)
    },
}
