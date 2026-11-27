import { describe, expect, test } from "vitest"
import { seededRandom } from "@game/core-src/engine/particles/random"
import { ACTION } from "@game/core-src/games/mecard/sim/card/CardType"
import { ALL_CARDS } from "@game/core-src/games/mecard/sim/catalog/cards"
import { GOBLIN, TROLL } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { BATTLE } from "@game/core-src/games/mecard/sim/fight/fights"
import { typeColorOf } from "@game/core-src/games/mecard/ui/look/colors"
import { ALL_FLOORS } from "@game/core-src/games/mecard/sim/catalog/floors"
import { CASTLE_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/CastleFloor"
import { CAVE_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/CaveFloor"
import { DOJO_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/DojoFloor"
import { FACTORY_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/FactoryFloor"
import { FOREST_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/ForestFloor"
import { HARBOR_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/HarborFloor"
import { HELL_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/HellFloor"
import { MINE_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/MineFloor"
import { SWAMP_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/SwampFloor"
import { TUNDRA_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/TundraFloor"
import { VOLCANO_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/VolcanoFloor"
import { TAVERN_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/TavernHalt"
import type { FloorType } from "@game/core-src/games/mecard/sim/floor/Floor"
import { isIndoors } from "@game/core/mecard/ambient-themes"
import {
    contextOf, effectOf, fightAt, haltAt, heroShown, petShown, playOut, SPRITE, startedAnimation,
} from "../../../../../fixtures/ambientFixtures"
import type { Context, Placed } from "../../../../../fixtures/ambientFixtures"
import { fightOf } from "../../../../../fixtures/fightFixtures"

/** The most particles a system of the ambient holds. */
const BUDGET = 512

/** A map holding what every effect may need: places, a halt and the party. */
function onMap(floor: FloorType, over: Partial<Context> = {}): Context {
    return contextOf([fightAt(100, 100), haltAt(TAVERN_HALT, 200, 150)], {
        floor: () => floor,
        outdoors: () => !isIndoors(floor),
        units: () => [heroShown({ x: 60 })],
        ...over,
    })
}

/** Play an effect to its end and tell the most particles each system had alive at once. */
function mostAlive(id: string, context: Context): { alpha: number, additive: number } {
    const animation = startedAnimation(id, context)!
    const most = { alpha: 0, additive: 0 }
    for(let frame = 0; frame < 2000; frame++){
        const more = animation.update(0.05)
        most.alpha = Math.max(most.alpha, context.alpha.count)
        most.additive = Math.max(most.additive, context.additive.count)
        context.alpha.update(0.05)
        context.additive.update(0.05)
        if(!more) break
    }
    animation.end()
    return most
}

/** The floors each effect is kept to, and those that stand for the others. */
const THEMED: readonly (readonly [string, readonly FloorType[]])[] = [
    ["hail", [SWAMP_FLOOR, HARBOR_FLOOR, TUNDRA_FLOOR]],
    ["giant-bubbles", [SWAMP_FLOOR]],
    ["aurora", [TUNDRA_FLOOR, HARBOR_FLOOR]],
    ["petal-storm", [DOJO_FLOOR]],
    ["fire-rain", [HELL_FLOOR, VOLCANO_FLOOR]],
    ["cave-tremor", [CAVE_FLOOR, MINE_FLOOR]],
    ["fireworks", [CASTLE_FLOOR, FACTORY_FLOOR, DOJO_FLOOR]],
    ["sky-whale", [HARBOR_FLOOR, SWAMP_FLOOR, TUNDRA_FLOOR]],
    ["dragon-shadow", [DOJO_FLOOR, CASTLE_FLOOR, CAVE_FLOOR, VOLCANO_FLOOR, FOREST_FLOOR, HELL_FLOOR]],
    ["witch-flight", [CASTLE_FLOOR, SWAMP_FLOOR, FOREST_FLOOR]],
    ["dark-eyes", [CAVE_FLOOR, MINE_FLOOR]],
]

/** The effects of any floor in the open air. */
const SKY = ["card-rain", "eclipse", "meteor-shower", "comet", "meteorite", "constellation"]

/** Every new effect with a floor it plays on. */
const ALL: readonly (readonly [string, FloorType])[] = [
    ...THEMED.flatMap(([id, floors]) => floors.map(floor => [id, floor] as const)),
    ...SKY.map(id => [id, FOREST_FLOOR] as const),
]

describe("the floors of the rare effects", () => {

    test.each(THEMED)("%s → it plays on its floors and on no other", (id, floors) => {
        for(const floor of ALL_FLOORS){
            const kept = floors.some(each => each === floor)
            expect(effectOf(id).isPlayable(onMap(floor)), floor.name).toBe(kept)
        }
    })

    test("indoors → no effect of the open air", () => {
        for(const id of SKY) expect(effectOf(id).isPlayable(onMap(CAVE_FLOOR)), id).toBe(false)
    })

    test("a map in the open air → the effects of the sky can play", () => {
        for(const id of SKY) expect(effectOf(id).isPlayable(onMap(FOREST_FLOOR)), id).toBe(true)
    })
})

describe("what a rare effect needs", () => {

    test("no unit → no constellation", () => {
        const context = onMap(FOREST_FLOOR, { units: () => [] })
        expect(effectOf("constellation").isPlayable(context)).toBe(false)
    })

    test("a monster ally in the party → the constellation draws it", () => {
        const drawn: unknown[] = []
        const pet = petShown(80)
        const context = onMap(FOREST_FLOOR, {
            units: () => [heroShown({ x: 60 }), pet],
            sprite: visual => {
                drawn.push(visual)
                return SPRITE
            },
        })
        startedAnimation("constellation", context)
        expect(drawn).toEqual([pet.unit.sprite])
    })

    test("a space with no place → no meteorite and no fireworks", () => {
        const context = contextOf([], { floor: () => DOJO_FLOOR })
        for(const id of ["meteorite", "fireworks"]) expect(effectOf(id).isPlayable(context), id).toBe(false)
    })

    test("sprites not loaded → the effects with a picture do not start", () => {
        const pictured = [
            "comet", "eclipse", "sky-whale", "witch-flight", "dragon-shadow", "aurora", "card-rain",
        ]
        for(const id of pictured){
            const context = onMap(TUNDRA_FLOOR, { sprite: () => null })
            expect(effectOf(id).effect.create(context), id).toBeNull()
        }
    })
})

describe("a rare effect played to its end", () => {

    test.each(ALL.map(([id, floor]) => [id, floor.name, floor] as const))(
        "%s on %s → it ends",
        (id, _name, floor) => {
            expect(playOut(id, onMap(floor))).toBeLessThan(600)
        },
    )

    test.each(ALL.map(([id, floor]) => [id, floor.name, floor] as const))(
        "%s on %s, seen from far → it stays under the particle budget",
        (id, _name, floor) => {
            const far = { scale: 0.5, size: () => ({ width: 640, height: 480 }) }
            const most = mostAlive(id, onMap(floor, far))
            expect(most.alpha).toBeLessThan(BUDGET)
            expect(most.additive).toBeLessThan(BUDGET)
        },
    )
})

/** How the first picture of an effect sets off, for a seed. */
function setOff(id: string, seed: number): { x: number, mirrored: boolean } {
    const context = onMap(SWAMP_FLOOR, { random: seededRandom(seed) })
    const pictures: { x: number, mirrored: boolean }[] = []
    const emit = context.alpha.emit.bind(context.alpha)
    context.alpha.emit = spec => {
        if(spec.sprite && spec.x > -1000) pictures.push({ x: spec.x, mirrored: spec.mirrored })
        return emit(spec)
    }
    startedAnimation(id, context)!.update(0.05)
    return pictures[0]
}

describe("a passage of beings", () => {

    const passages = [
        "witch-flight", "sky-whale", "dragon-shadow", "bird-flock", "seagulls", "crows", "bat-cloud",
        "snow-geese",
    ]

    test.each(passages)("%s, according to the seed → it goes one way or the other", id => {
        const ways = Array.from({ length: 30 }, (_, seed) => setOff(id, seed + 1))
        expect(new Set(ways.map(way => way.mirrored))).toEqual(new Set([false, true]))
    })

    test.each(passages)("%s going left → it comes in by the right, mirrored", id => {
        for(let seed = 1; seed <= 30; seed++){
            const { x, mirrored } = setOff(id, seed)
            expect(x > 160, `seed ${seed}`).toBe(mirrored)
        }
    })
})

/** A particle as it was emitted. */
interface Emitted {
    readonly x: number
    readonly y: number
    readonly vx: number
    readonly vy: number
    readonly picture: boolean
    readonly red: number
    readonly green: number
    readonly blue: number
}

/** Keep what a context emits with normal blending. */
function watched(context: Context): Emitted[] {
    const emitted: Emitted[] = []
    const emit = context.alpha.emit.bind(context.alpha)
    context.alpha.emit = spec => {
        const { r, g, b } = spec.colorStart
        const { x, y, vx, vy, sprite } = spec
        emitted.push({ x, y, vx, vy, picture: sprite !== null, red: r, green: g, blue: b })
        return emit(spec)
    }
    return emitted
}

/** The bottom of the area of the context of the fixtures. */
const GROUND = 220

describe("the shadow of a giant", () => {

    /** A map with a fight against a troll. */
    function giantMap(seed = 5): Context {
        return contextOf([giantAt(100, 100)], { random: seededRandom(seed) })
    }

    /** A place holding a fight against a giant. */
    function giantAt(x: number, y: number): Placed {
        const { place, ...shown } = fightAt(x, y)
        return { ...shown, place: { ...place, fight: fightOf(BATTLE, GOBLIN, TROLL) } }
    }

    test("no giant in the fights → it cannot play", () => {
        expect(effectOf("giant-monster-shadow").isPlayable(contextOf([fightAt(1, 1)]))).toBe(false)
    })

    test("a giant in a fight → its picture in black, a third of it under the bottom of the area", () => {
        const context = giantMap()
        const emitted = watched(context)
        expect(effectOf("giant-monster-shadow").isPlayable(context)).toBe(true)
        startedAnimation("giant-monster-shadow", context)
        const [shadow] = emitted
        expect(shadow).toMatchObject({ picture: true, red: 0, green: 0, blue: 0 })
        const tall = Math.min(300 * 0.45, 200 * 0.6)
        expect(shadow.y + tall / 2 - GROUND).toBeCloseTo(tall * 0.3)
    })

    test("a step over → dust is thrown up from the bottom edge of the area, none before", () => {
        const context = giantMap()
        const emitted = watched(context)
        const animation = startedAnimation("giant-monster-shadow", context)!
        const frames = (count: number): void => {
            for(let frame = 0; frame < count; frame++){
                animation.update(0.05)
                context.alpha.update(0.05)
            }
        }
        frames(30)
        expect(emitted.filter(each => !each.picture)).toHaveLength(0)
        frames(15)
        const dust = emitted.filter(each => !each.picture)
        expect(dust.length).toBeGreaterThan(20)
        expect(new Set(dust.map(each => each.y))).toEqual(new Set([GROUND]))
        for(const { x, vx, vy } of dust){
            expect(x).toBeGreaterThanOrEqual(10)
            expect(x).toBeLessThanOrEqual(310)
            expect(-vy).toBeGreaterThan(Math.abs(vx))
        }
    })

    test("according to the seed → it comes in by one side or the other", () => {
        const sides = Array.from({ length: 30 }, (_, seed) => {
            const context = giantMap(seed + 1)
            const emitted = watched(context)
            startedAnimation("giant-monster-shadow", context)
            return emitted[0].x
        })
        expect(new Set(sides)).toEqual(new Set([10, 310]))
    })

    test("played to its end → it lands several times and ends", () => {
        expect(playOut("giant-monster-shadow", giantMap())).toBeLessThan(600)
    })
})

describe("the shadow of a flier", () => {

    test.each(["witch-flight", "sky-whale"])("%s → a black picture far under it, in the area", id => {
        const gaps = Array.from({ length: 10 }, (_, seed) => {
            const context = onMap(SWAMP_FLOOR, { random: seededRandom(seed + 1) })
            const emitted = watched(context)
            startedAnimation(id, context)!.update(0.05)
            const [shadow, flier] = emitted.filter(each => each.picture)
            expect(shadow).toMatchObject({ x: flier.x, red: 0, green: 0, blue: 0 })
            expect(shadow.y).toBeLessThan(GROUND)
            expect(shadow.y - flier.y).toBeGreaterThan(40)
            return Math.round(shadow.y - flier.y)
        })
        expect(new Set(gaps).size).toBeGreaterThan(3)
    })
})

describe("the rain of cards", () => {

    /** The pictures a rain of cards emits, over its whole time. */
    function rained(): Emitted[] {
        const context = onMap(FOREST_FLOOR)
        const emitted = watched(context)
        playOut("card-rain", context)
        return emitted
    }

    /** Whether a picture is the face of a card: left as it is drawn. */
    const isFace = ({ red, green, blue }: Emitted): boolean => red === 1 && green === 1 && blue === 1

    test("a card falls → its face, then its colors at the same point", () => {
        const emitted = rained()
        expect(isFace(emitted[0])).toBe(true)
        expect(isFace(emitted[1])).toBe(false)
        expect(emitted[1]).toMatchObject({ x: emitted[0].x, y: emitted[0].y })
    })

    test("many cards → their bands follow the types of the cards of the game", () => {
        const random = seededRandom(3)
        const colors = new Map<string, number>()
        const context = onMap(FOREST_FLOOR, { random })
        const emitted = watched(context)
        for(let play = 0; play < 20; play++){
            playOut("card-rain", context)
            context.alpha.clear()
        }
        const bands = emitted.filter((each, index) => {
            return index > 0 && isFace(emitted[index - 1]) && !isFace(each)
        })
        for(const { red, green, blue } of bands){
            const key = [red, green, blue].map(channel => channel.toFixed(1)).join()
            colors.set(key, (colors.get(key) ?? 0) + 1)
        }
        const action = typeColorOf(ACTION)
        const key = [action.r, action.g, action.b].map(channel => channel.toFixed(1)).join()
        const share = ALL_CARDS.filter(card => card.output === ACTION).length / ALL_CARDS.length
        expect(colors.size).toBeGreaterThan(1)
        expect(colors.get(key)! / bands.length).toBeCloseTo(share, 1)
    })

    test("seen from far → every card stays whole, under the particle budget", () => {
        const far = { scale: 0.5, size: () => ({ width: 640, height: 480 }) }
        expect(mostAlive("card-rain", onMap(FOREST_FLOOR, far)).alpha).toBeLessThan(BUDGET)
    })
})

describe("a rare effect at the scale of its space", () => {

    /** The particles a play emits alive at once, at a scale. */
    function seenAt(id: string, floor: FloorType, scale: number): number {
        const most = mostAlive(id, onMap(floor, { scale }))
        return most.alpha + most.additive
    }

    test.each([
        ["hail", TUNDRA_FLOOR], ["meteor-shower", FOREST_FLOOR], ["constellation", FOREST_FLOOR],
        ["dark-eyes", CAVE_FLOOR],
    ] as const)("%s seen close → fewer things than at its own size", (id, floor) => {
        expect(seenAt(id, floor, 2)).toBeLessThan(seenAt(id, floor, 1))
    })

    test.each(["sky-whale", "witch-flight", "comet"])("%s in a wider space → it takes longer to cross", id => {
        const frames = (width: number): number => {
            return playOut(id, onMap(SWAMP_FLOOR, { size: () => ({ width, height: 240 }) }))
        }
        expect(frames(640)).toBeGreaterThan(frames(320))
    })

    test.each([
        ["sky-whale", SWAMP_FLOOR], ["dragon-shadow", FOREST_FLOOR],
        ["constellation", FOREST_FLOOR], ["eclipse", FOREST_FLOOR],
    ] as const)("%s in a small space → its picture fits in it", (id, floor) => {
        const widths: number[] = []
        const context = onMap(floor, { scale: 2.5, size: () => ({ width: 128, height: 96 }) })
        for(const system of [context.alpha, context.additive]){
            const emit = system.emit.bind(system)
            system.emit = spec => {
                if(spec.sprite) widths.push(spec.sizeStart)
                return emit(spec)
            }
        }
        startedAnimation(id, context)!.update(0.05)
        expect(widths.length).toBeGreaterThan(0)
        expect(Math.max(...widths)).toBeLessThan(128)
    })
})
