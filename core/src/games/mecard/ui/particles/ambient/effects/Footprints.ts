import type { AmbientEffect, AmbientFight } from "../AmbientEffect"
import { burst } from "../../../../../../engine/particles"
import { pick, timed } from "../plays"

/** How many prints are left, and how long between two. */
const PRINTS = 7
const GAP = 0.4

/** The pairs of fights a path leads from one to the other. */
function linked(fights: readonly AmbientFight[]): [AmbientFight, AmbientFight][] {
    const pairs: [AmbientFight, AmbientFight][] = []
    for(const from of fights){
        for(const to of fights) if(from.place.next.includes(to.place)) pairs.push([from, to])
    }
    return pairs
}

/** Footprints appear one by one along the path between two fights, then fade. */
export const FOOTPRINTS: AmbientEffect = {
    id: "footprints",
    weight: map => linked(map.fights()).length > 0 ? 2 : 0,
    start(map, { alpha, random }){
        const [from, to] = pick(random, linked(map.fights()))
        let left = 0
        let laid = 0
        return timed(PRINTS * GAP, dt => {
            left -= dt
            while(left <= 0 && laid < PRINTS){
                left += GAP
                const share = (laid + 1) / (PRINTS + 1)
                const side = laid % 2 === 0 ? 1 : -1
                const dx = to.position.x - from.position.x
                const dy = to.position.y - from.position.y
                const length = Math.hypot(dx, dy) || 1
                burst(
                    alpha, random,
                    from.position.x + dx * share - dy / length * 2 * side,
                    from.position.y + dy * share + dx / length * 2 * side,
                    1,
                    spec => {
                        spec.life = 3
                        spec.sizeStart = 2
                        spec.sizeEnd = 2
                        spec.colorStart.set(0.25, 0.18, 0.1, 0.6)
                        spec.colorEnd.set(0.25, 0.18, 0.1, 0)
                    },
                )
                laid++
            }
        })
    },
}
