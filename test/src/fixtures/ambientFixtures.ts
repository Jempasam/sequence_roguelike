import { ParticleSystem } from "@game/core-src/engine/particles/ParticleSystem"
import { seededRandom } from "@game/core-src/engine/particles/random"
import type { Animation } from "@game/core-src/engine/animation/Animation"
import type { Sprite } from "@game/core-src/engine/gpu/Sprite"
import { LANCER_KIT } from "@game/core-src/games/mecard/sim/catalog/kits"
import { GOBLIN } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { Heart } from "@game/core-src/games/mecard/sim/heart/Heart"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import { allyOf, heroOf } from "@game/core-src/games/mecard/sim/run/Hero"
import { BATTLE } from "@game/core-src/games/mecard/sim/fight/fights"
import type { FloorType } from "@game/core-src/games/mecard/sim/floor/Floor"
import type { HaltType } from "@game/core-src/games/mecard/sim/halt/HaltType"
import type { Place } from "@game/core-src/games/mecard/sim/run/Journey"
import { AMBIENT_EFFECTS } from "@game/core/mecard/ambient-effects"
import { fightOf } from "./fightFixtures"

type Effect = (typeof AMBIENT_EFFECTS)[number]

/** What an ambient effect reads and draws in. */
export type Context = Parameters<Effect["isPlayable"]>[0]

/** A place of the map shown, as the context tells it. */
export type Placed = ReturnType<Context["places"]>[number]

export const SPRITE = { width: 16, height: 16 } as Sprite

/** A unit of the space an ambient decorates, as the context tells it. */
export type Shown = ReturnType<Context["units"]>[number]

/** A place holding a fight, shown at a point. */
export function fightAt(x: number, y: number, visited = false): Placed {
    const fight = fightOf(BATTLE, GOBLIN)
    const place: Place = { layer: 0, across: 0.5, next: [], exitTo: null, fight, halt: null }
    return { place, position: { x, y }, visited }
}

/** A place holding a halt, shown at a point. */
export function haltAt(type: HaltType, x: number, y: number): Placed {
    const place: Place = { layer: 0, across: 0.5, next: [], exitTo: null, fight: null, halt: type }
    return { place, position: { x, y }, visited: false }
}

/** What a test says of a hero shown: where, and how many of its hearts are full. */
export interface HeroShown {
    readonly x: number
    readonly y?: number
    readonly full?: number
    readonly total?: number
}

/** A hero shown with its feet at a point, its picture 16 pixels high, facing right. */
export function heroShown({ x, y = 100, full = 3, total = 3 }: HeroShown): Shown {
    const hearts = Array.from({ length: total }, (_, index) => new Heart(RED_HEART, index >= full))
    return {
        unit: heroOf(LANCER_KIT), position: { x, y }, head: { x, y: y - 16 }, facing: { x: 1, y: 0 }, hearts,
    }
}

/** A pet of the party shown with its feet at a point: an ally a bot plays. */
export function petShown(x: number): Shown {
    return { ...heroShown({ x }), unit: allyOf(GOBLIN, "Gobelin") }
}

/** A context over the places given, drawing into systems of its own. */
export function contextOf(places: readonly Placed[] = [], over: Partial<Context> = {}, seed = 5): Context {
    return {
        alpha: new ParticleSystem(512),
        additive: new ParticleSystem(512),
        random: seededRandom(seed),
        scale: 1,
        enabled: () => true,
        settled: () => true,
        scene: () => places,
        outdoors: () => true,
        openEdges: () => true,
        units: () => [],
        places: () => places,
        size: () => ({ width: 320, height: 240 }),
        area: () => ({ x: 10, y: 20, width: 300, height: 200 }),
        heroPosition: () => ({ x: 50, y: 50 }),
        floor: () => ({}) as FloorType,
        sprite: () => SPRITE,
        coin: () => SPRITE,
        ...over,
    }
}

/** The effect of an id. */
export function effectOf(id: string): Effect {
    const found = AMBIENT_EFFECTS.find(each => each.id === id)
    if(!found) throw new Error(id)
    return found
}

/** Make the animation of an effect and start it, as a pool does. */
export function startedAnimation(id: string, context: Context): Animation|null {
    const animation = effectOf(id).effect.create(context)
    animation?.start()
    return animation
}

/**
 * Play an effect to its end, in frames of 50 ms, drawing into the systems of its context.
 *
 * @returns How many frames it took, 2000 at most.
 */
export function playOut(id: string, context: Context): number {
    const animation = startedAnimation(id, context)
    if(!animation) throw new Error(`${id} did not start`)
    let frames = 0
    while(frames < 2000){
        frames++
        const more = animation.update(0.05)
        context.alpha.update(0.05)
        context.additive.update(0.05)
        if(!more) break
    }
    animation.end()
    return frames
}
