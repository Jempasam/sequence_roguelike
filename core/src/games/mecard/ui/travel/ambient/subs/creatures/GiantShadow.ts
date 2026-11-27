import { follow, pick } from "../../../../../../../engine/particles"
import type { Monster } from "../../../../../sim/catalog/monsters"
import { monstersOf } from "../../../../../sim/fight/monstersOf"
import type { AmbientContext } from "../../AmbientContext"
import { fightsOf } from "../../placed"
import { throwJets } from "../../scene/Jet"
import type { Jet } from "../../scene/Jet"
import type { Scene } from "../../scene/Scene"
import { sceneEffect } from "../../scene/sceneEffect"
import { wayAcross } from "../../scene/Way"

/** The least size of a monster that is a giant. */
const GIANT = 2

/** The most of the width and of the height of the area the shadow covers. */
const WIDTH_SHARE = 0.45
const HEIGHT_SHARE = 0.6

/** How far a step goes, in widths of the shadow, and the least steps across the area. */
const STRIDE = 0.5
const LEAST_STEPS = 3

/** The seconds it stands, then the seconds it takes to go up and down again, moving on. */
const PAUSE = 0.7
const MOVE = 1.4
const STEP = PAUSE + MOVE

/** How high it goes in a step, as a share of its height. */
const LIFT = 0.18

/** The share of its height under the bottom of the area when it stands. */
const OVERHANG = 0.3

/** How far above the ground it is no longer on it, in pixels. */
const AIRBORNE = 0.5

const OPACITY = 0.35

/** Where the dust of a landing comes in, from the middle of the shadow, in widths of it. */
const FEET = [-0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4]

/** How far from straight up the dust may be thrown, in radians. */
const LEAN = 0.35

/** The dust of what lands out of the area, thrown up into it. */
const DUST: Jet = {
    count: 4, look: { from: 0xb8a88a, to: 0x6a604e, size: 4, end: 12, life: 0.9, lifeSpread: 0.3 },
    spread: { speed: 90, speedSpread: 0.6, angle: [-Math.PI / 2 - LEAN, -Math.PI / 2 + LEAN], drag: 2 },
}

/** The giant monsters of the fights of the map. */
function giantsOf(context: AmbientContext): Monster[] {
    return fightsOf(context)
        .flatMap(({ place, type }) => monstersOf(type, place.layer))
        .filter(monster => (monster.size ?? 1) >= GIANT)
}

/**
 * The shadow of a giant of one of the fights walks along the bottom of the area, partly under it, one way or
 * the other: it stands, rises slowly and comes down again further on, and dust is thrown up into the area
 * from its bottom edge where it lands.
 */
const SCENE: Scene = {
    playable: context => giantsOf(context).length > 0,
    create(context){
        const { alpha, random } = context
        const giants = giantsOf(context)
        if(giants.length === 0) return null
        const sprite = context.sprite(pick(random, giants).sprite)
        if(!sprite) return null
        const area = context.area()
        const ratio = sprite.height / sprite.width
        const size = Math.min(area.width * WIDTH_SHARE, area.height * HEIGHT_SHARE / ratio)
        const tall = size * ratio
        const bottom = area.y + area.height
        const standing = bottom + tall * (OVERHANG - 0.5)
        const steps = Math.max(LEAST_STEPS, Math.round(area.width / (size * STRIDE)))
        const duration = steps * STEP
        const way = wayAcross(random, area.x, area.width)
        let lifted = false
        return follow({
            system: alpha, sprite, size, mirrored: way.reversed, color: 0x000000, opacity: OPACITY, duration,
            path: (_progress, age) => {
                const time = Math.min(age, duration)
                const step = Math.min(steps - 1, Math.floor(time / STEP))
                const moving = Math.min(1, Math.max(0, (time - step * STEP - PAUSE) / MOVE))
                const walked = moving * moving * (3 - 2 * moving)
                return {
                    x: way.x((step + walked) * area.width / steps),
                    y: standing - Math.sin(moving * Math.PI) * tall * LIFT,
                }
            },
            step: at => {
                const up = at.y < standing - AIRBORNE
                if(lifted && !up){
                    for(const foot of FEET){
                        const x = at.x + foot * size
                        if(x < area.x || x > area.x + area.width) continue
                        throwJets(context, { x, y: bottom }, [DUST])
                    }
                }
                lifted = up
            },
        })
    },
}

/** The shadow of a giant walks by. */
export const GIANT_MONSTER_SHADOW = sceneEffect({
    id: "giant-monster-shadow", category: "surprise", weight: 1, spacing: 40, scene: SCENE,
})
