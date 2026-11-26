import type { AmbientEffect } from "../AmbientEffect"
import { follow } from "../plays"

/** A wide shadow of a cloud slides over the map. */
export const CLOUD_SHADOW: AmbientEffect = {
    id: "cloud-shadow",
    weight: () => 1,
    start(map, { alpha, random }){
        const { width, height } = map.size()
        const y = height * (0.2 + random() * 0.6)
        const drift = (random() * 2 - 1) * 30
        return follow({
            system: alpha, size: Math.max(120, width / 3), color: 0x000000, opacity: 0.16, duration: 16,
            path: progress => ({ x: -60 + (width + 120) * progress, y: y + drift * progress }),
        })
    },
}
