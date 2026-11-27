import { visual } from "../../../../../sim/base/Visual"
import type { FloorType } from "../../../../../sim/floor/Floor"
import type { AmbientEffect } from "../../AmbientEffect"
import { sceneEffect } from "../../scene/sceneEffect"
import { FIREFLY_FLOORS, HARBOR_FLOORS, LAVA_FLOORS, MARSH_FLOORS, SNOW_FLOORS } from "../../themes"
import { anchorOf } from "../../unit/Puff"
import type { Puff } from "../../unit/Puff"
import { bodies, carriers, heroes, pairsWithin, petsByAFriend } from "../../unit/selection"
import { companion } from "../../unit/subs/companion"
import { hop } from "../../unit/subs/hop"
import { juggle } from "../../unit/subs/juggle"
import { pair } from "../../unit/subs/pair"
import { trail } from "../../unit/subs/trail"

/** How near two units must stand to talk, in pixels. */
const TALKING_REACH = 60

/** How high over a head a word is said, and how far it rises while it is, in pixels. */
const WORD_HEIGHT = 5
const WORD_RISE = 2

/** How high a coin tossed goes, in pixels. */
const TOSS_HEIGHT = 22

/** How near a friend must stand to pat a pet, in pixels. */
const PATTING_REACH = 30

/** How many times the hand pats, how far over the head it touches it, and how high it lifts, in pixels. */
const PATS = 3
const PAT_HEIGHT = 2
const PAT_LIFT = 5

const SNOW: Puff = {
    grain: { colors: [0xffffff, 0xdfefff], size: [2, 3] }, count: [3, 4], life: 0.5,
    vx: [-14, 14], vy: [-16, -6], ay: [40, 40], scatter: { x: 3, y: 1 },
}

const WATER: Puff = {
    grain: { colors: [0x9ac8ff, 0xc8e0ff], size: [1, 2] }, count: [3, 5], life: 0.35,
    vx: [-18, 18], vy: [-32, -14], ay: [120, 120], scatter: { x: 3, y: 1 },
}

const ASH: Puff = {
    grain: { colors: [0x6a6260, 0x9a8a80], size: [2, 3], opacity: 0.7 }, count: [3, 4], life: 0.7,
    vx: [-10, 10], vy: [-10, -4], drag: 2, grows: 5, scatter: { x: 3, y: 1 },
}

const DUST: Puff = {
    grain: { colors: [0xc8b090, 0x9a8668], size: [2, 3], opacity: 0.75 }, count: [2, 3], life: 0.45,
    vx: [-12, 12], vy: [-10, -3], drag: 2, grows: 4, scatter: { x: 3, y: 1 },
}

/** What a step raises on a floor. */
function raisedOn(floor: FloorType): Puff {
    if(SNOW_FLOORS.includes(floor)) return SNOW
    if(HARBOR_FLOORS.includes(floor) || MARSH_FLOORS.includes(floor)) return WATER
    return LAVA_FLOORS.includes(floor) ? ASH : DUST
}

/** The steps of the units raise dust, snow, water or ash. */
const FOOTFALL_PUFFS = sceneEffect({
    id: "footfall-puffs", category: "unit", weight: 2, spacing: 1,
    scene: trail({ among: bodies, raised: raisedOn, stride: 6, duration: 8 }),
})

/** Two neighbors of a same side exchange a few words. */
const PARTY_CHATTER = sceneEffect({
    id: "party-chatter", category: "unit", weight: 2,
    scene: pair({
        pairs: context => pairsWithin(bodies(context), TALKING_REACH),
        grain: { sprite: visual("ambient/talk"), colors: [0xffffff], size: [9, 9] },
        turns: 4, beat: 0.9,
        turn: (from, _to, share) => ({
            at: { x: from.head.x, y: from.head.y - WORD_HEIGHT - share * WORD_RISE },
            opacity: Math.min(1, share * 6, (1 - share) * 6),
        }),
    }),
})

/** A firefly goes from unit to unit, leaving a glow behind. */
const FIREFLY_RELAY = sceneEffect({
    id: "firefly-relay", category: "unit", floors: FIREFLY_FLOORS, weight: 3,
    scene: hop({
        among: bodies, least: 2, stops: 5, flight: 0.7, circle: 0, rest: 0.5, radius: 0, arc: 18,
        grain: { colors: [0xe8ff7a], size: [3, 3], glow: true },
        trail: {
            grain: { colors: [0xe8ff7a], size: [2, 2], opacity: 0.6, glow: true }, count: [1, 1], life: 0.4,
        },
    }),
})

/** Two heroes toss a coin to each other. */
const COIN_TOSS = sceneEffect({
    id: "coin-toss", category: "unit", weight: 2,
    scene: pair({
        pairs: context => pairsWithin(heroes(context), Infinity),
        grain: { colors: [0xffffff], size: [6, 6] },
        picture: context => context.coin(),
        turns: 3, beat: 0.8,
        turn: (from, to, share) => {
            const start = anchorOf(from, "middle")
            const end = anchorOf(to, "middle")
            return {
                at: {
                    x: start.x + (end.x - start.x) * share,
                    y: start.y + (end.y - start.y) * share - Math.sin(share * Math.PI) * TOSS_HEIGHT,
                },
                opacity: Math.min(1, share * 8, (1 - share) * 8),
            }
        },
    }),
})

/** A unit plays with one of the things it carries. */
const JUGGLING = sceneEffect({
    id: "juggling", category: "unit", weight: 3,
    scene: juggle({
        among: carriers, size: 10, tosses: [1, 3], height: 18,
        things: ({ unit }) => [
            ...unit.items.map(item => item.icon), ...unit.usables.map(carried => carried.usable.icon),
        ],
    }),
})

/** A small hand pats a pet that stands by a friend of its side. */
const PET_PAT = sceneEffect({
    id: "pet-pat", category: "unit", weight: 3,
    scene: companion({
        among: petsByAFriend(PATTING_REACH), most: 1, anchor: "head", duration: 2, fade: 0.3,
        grain: { sprite: visual("ambient/pat_hand"), colors: [0xffffff], size: [9, 9] },
        way: (_age, share) => {
            const lifted = Math.abs(Math.sin(share * PATS * Math.PI))
            return { x: 0, y: -PAT_HEIGHT - lifted * PAT_LIFT }
        },
    }),
})

/** What the units do between them, and as they move. */
export const UNIT_BOND_EFFECTS: readonly AmbientEffect[] = [
    FOOTFALL_PUFFS, PARTY_CHATTER, FIREFLY_RELAY, COIN_TOSS, JUGGLING, PET_PAT,
]
