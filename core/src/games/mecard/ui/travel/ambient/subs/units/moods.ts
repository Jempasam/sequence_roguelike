import { visual } from "../../../../../sim/base/Visual"
import type { AmbientEffect } from "../../AmbientEffect"
import { sceneEffect } from "../../scene/sceneEffect"
import { bodies, freshHeroes, lastHeart, weary } from "../../unit/selection"
import { aura } from "../../unit/subs/aura"
import { doze } from "../../unit/subs/doze"
import { struggle } from "../../unit/subs/struggle"

/** How far the soul leans when it is out of its body: 20 degrees. */
const SOUL_TILT = Math.PI / 9

/** A unit worn out sweats and pants. */
const WEARY_SWEAT = sceneEffect({
    id: "weary-sweat", category: "unit", weight: 2,
    scene: aura({
        among: weary, duration: 5, staggered: true,
        emissions: [
            {
                anchor: "head", interval: 0.6, count: [1, 1], life: 0.6,
                grain: { colors: [0xbfd8ff], size: [2, 2], opacity: 0.7 },
                vy: [0, 6], ay: [50, 60], scatter: { x: 6, y: 2 },
            },
            {
                anchor: "mouth", interval: 0.5, count: [1, 2], life: 0.5,
                grain: { colors: [0xffffff], size: [1, 2], opacity: 0.45 },
                forward: [8, 14], vy: [-4, 0], drag: 2, grows: 3,
            },
        ],
    }),
})

/** The soul of a unit on its last heart struggles to get out of it, and is pulled back at once. */
const LAST_HEART_SOUL = sceneEffect({
    id: "last-heart-soul", category: "unit", weight: 2, spacing: 15,
    scene: struggle({
        among: lastHeart, color: 0xbfd8ff, opacity: 0.55, eye: visual("ambient/dead_eye"),
        tilt: SOUL_TILT, aside: 3, recall: 0.15,
        poses: [
            { seconds: 0.3, climb: null },
            { seconds: 0.25, climb: [3, 6] },
            { seconds: 0.25, climb: null },
            { seconds: 0.35, climb: [4, 10] },
            { seconds: 0.2, climb: null },
            { seconds: 0.6, climb: [6, 15] },
        ],
    }),
})

/** A unit left at rest dozes off, and starts up at its first move. */
const DOZING = sceneEffect({
    id: "dozing", category: "unit", weight: 2,
    scene: doze({
        among: bodies, still: 1, longest: 30,
        snore: {
            anchor: "head", interval: 0.6, count: [1, 1], life: 1.4,
            grain: { sprite: visual("ambient/z"), colors: [0xffffff], size: [5, 6] },
            vx: [6, 9], vy: [-14, -10], grows: 8,
        },
        alarm: { sprite: visual("ambient/exclaim"), colors: [0xffffff], size: [5, 5] },
    }),
})

/** A hero in full health whistles a few notes. */
const WHISTLING_HERO = sceneEffect({
    id: "whistling-hero", category: "unit", weight: 2,
    scene: aura({
        among: freshHeroes, most: 1, duration: 1.4,
        emissions: [{
            anchor: "head", interval: 0.5, count: [1, 1], life: 1.3,
            grain: { sprite: visual("ambient/note"), colors: [0xffe27a, 0x9ae8ff, 0xffa8d0], size: [6, 7] },
            vx: [4, 14], vy: [-18, -12], drag: 0.5,
        }],
    }),
})

/** What the units give away of their state. */
export const UNIT_MOOD_EFFECTS: readonly AmbientEffect[] = [
    WEARY_SWEAT, LAST_HEART_SOUL, DOZING, WHISTLING_HERO,
]
