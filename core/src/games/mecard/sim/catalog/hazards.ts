/**
 * @packageDocumentation
 * The catalog of the hazards of the arena: what a fight lays out on the ground it is fought on.
 */

import { Vector2 } from "../base/Vector2"
import { visual } from "../base/Visual"
import { Box } from "../battle/hitbox/Box"
import * as Areas from "../battle/area/Areas"
import type { PlacedBody } from "../battle/Battle"
import { UNIT_RADIUS } from "../battle/Unit"
import { CANNONBALL } from "../card/subs/summon/Cannonballs"
import { FALL, HINDER } from "../card/subs/body/HazardCards"
import { FLAMETHROWER } from "../card/subs/combat/Flamethrower"
import { PROJECTION, SHOCK_WAVE, TIDE } from "../card/subs/combat/Shoves"
import { RAM } from "../card/subs/movement/Ram"
import { ABOUT_FACE } from "../card/subs/movement/Orientation"
import { STEP } from "../card/subs/movement/Step"
import { WAIT } from "../card/subs/movement/Wait"
import { Heart } from "../heart/Heart"
import { RED_HEART } from "../heart/subs/RedHeartKind"
import { SOLID_HEART } from "../heart/subs/SolidHeartKind"
import { hazardType } from "../hazard/HazardType"
import type { HazardType } from "../hazard/HazardType"
import { EXPLOSIVE } from "../status/subs/Explosive"
import { EXPLOSIVE_DASH, SHADOW_STEP } from "../card/subs"

/** How far the belt of a conveyor carries, and how wide it is, in meters: what the card it plays covers. */
const CONVEYOR_LENGTH = 4
const CONVEYOR_WIDTH = 3

/** The radius of the ground a hole, a puddle and a thicket cover, in meters. */
const HOLE_RADIUS = 0.9
const PUDDLE_RADIUS = 1
const BUSH_RADIUS = 0.8

/** How many times the hearts of a barrel last, and the level of the explosion it holds. */
const BARREL_HEARTS = 1
const BARREL_EXPLOSIVE_LEVEL = 2

/** The sizes of what stands still, as a factor of the radius of a unit. */
const PILLAR_SIZE = 0.45 / UNIT_RADIUS
const TREE_SIZE = 1.4
const ROCK_SIZE = 1.2
const FIXTURE_SIZE = 1.1

/** What every body of the scenery that stands still is: it blocks, and nothing aims at it, touches it or moves it. */
function standing(name: string, sprite: string): Pick<PlacedBody, "name"|"sprite"|"hearts"|"targetable"|"touchable"|"movable"> {
    return {
        name, sprite: visual(sprite), hearts: [new Heart(SOLID_HEART)],
        targetable: false, touchable: false, movable: false,
    }
}

/** What every body lying on the ground is: it takes no room, and nothing aims at it, touches it or moves it. */
function lying(name: string, sprite: string): Pick<PlacedBody, "name"|"sprite"|"hearts"|"tangible"|"targetable"|"touchable"|"movable"> {
    return { ...standing(name, sprite), tangible: false }
}

export const PILLAR = hazardType({
    id: "pillar", name: "Pilier", description: "Une colonne de pierre : elle arrête les pas et les tirs.",
    icon: visual("units/pillar"), direction: Vector2.DOWN,
    bodies: [{ body: { ...standing("Pilier", "units/pillar"), size: PILLAR_SIZE } }],
})

export const WALL = hazardType({
    id: "wall", name: "Mur", description: "Un mur bas et long : on le contourne, les tirs s'y arrêtent.",
    icon: visual("units/wall"), direction: Vector2.RIGHT,
    bodies: [{ body: { ...standing("Mur", "units/wall"), hitbox: new Box(3, 0.5) } }],
})

export const TREE = hazardType({
    id: "tree", name: "Arbre", description: "Un tronc épais : il arrête les pas et les tirs.",
    icon: visual("units/tree"), direction: Vector2.DOWN,
    bodies: [{ body: { ...standing("Arbre", "units/tree"), size: TREE_SIZE } }],
})

export const ROCK_BLOCK = hazardType({
    id: "rock", name: "Rocher", description: "Un bloc de roche : il arrête les pas et les tirs.",
    icon: visual("units/rock"), direction: Vector2.DOWN,
    bodies: [{ body: { ...standing("Rocher", "units/rock"), size: ROCK_SIZE } }],
})

export const TORII = hazardType({
    id: "torii", name: "Arche japonaise", description: "Deux montants de bois, avec un passage entre eux.",
    icon: visual("units/torii"), direction: Vector2.DOWN,
    bodies: [-1.1, 1.1].map(side => ({
        body: { ...standing("Montant d'arche", "units/torii"), hitbox: new Box(0.5, 0.5) }, side,
    })),
})

export const RING_ROPE = hazardType({
    id: "ring-rope", name: "Corde de ring", description: "Une corde tendue : elle retient autant qu'un mur.",
    icon: visual("units/ring_rope"), direction: Vector2.RIGHT,
    bodies: [{ body: { ...standing("Corde de ring", "units/ring_rope"), hitbox: new Box(4, 0.2) } }],
})

export const BUSH = hazardType({
    id: "bush", name: "Buisson", description: ["Ralentit qui s'y trouve à son tour : ", HINDER, "."],
    icon: visual("units/bush"), direction: Vector2.DOWN,
    bodies: [{
        body: { ...lying("Buisson", "units/bush"), cards: [HINDER] },
        ground: at => Areas.circle(at, BUSH_RADIUS),
    }],
})

export const HOLE = hazardType({
    id: "hole", name: "Trou", description: ["Blesse qui s'y trouve à son tour : ", FALL, "."],
    icon: visual("units/hole"), direction: Vector2.DOWN,
    bodies: [{
        body: { ...lying("Trou", "units/hole"), cards: [FALL] },
        ground: at => Areas.circle(at, HOLE_RADIUS),
    }],
})

export const PUDDLE_ZONE = hazardType({
    id: "puddle", name: "Flaque", description: ["Ralentit qui s'y trouve à son tour : ", HINDER, "."],
    icon: visual("units/puddle"), direction: Vector2.DOWN,
    bodies: [{
        body: { ...lying("Flaque", "units/puddle"), cards: [HINDER] },
        ground: at => Areas.circle(at, PUDDLE_RADIUS),
    }],
})

export const CONVEYOR = hazardType({
    id: "conveyor", name: "Tapis roulant", description: ["Emporte qui est dessus, le long de sa flèche : ", TIDE, "."],
    icon: visual("units/conveyor"), direction: Vector2.RIGHT,
    bodies: [{
        body: { ...lying("Tapis roulant", "units/conveyor"), cards: [TIDE] },
        ground: (at, direction) => Areas.line(at, at.plus(direction.times(CONVEYOR_LENGTH)), CONVEYOR_WIDTH),
    }],
})

export const PISTON = hazardType({
    id: "piston", name: "Piston", description: ["Attend, puis projette ce qui est devant : ", PROJECTION, "."],
    icon: visual("units/piston"), direction: Vector2.DOWN,
    bodies: [{ body: { ...standing("Piston", "units/piston"), size: FIXTURE_SIZE, cards: [WAIT, PROJECTION] } }],
})

export const FLAMETHROWER_TURRET = hazardType({
    id: "flamethrower", name: "Lance-flamme mécanique", description: ["Attend, puis brûle devant lui : ", FLAMETHROWER, "."],
    icon: visual("units/flamethrower"), direction: Vector2.DOWN,
    bodies: [{ body: { ...standing("Lance-flamme", "units/flamethrower"), size: FIXTURE_SIZE, cards: [WAIT, FLAMETHROWER] } }],
})

export const GEYSER = hazardType({
    id: "geyser", name: "Geyser", description: ["Attend, puis jaillit : ", SHOCK_WAVE, "."],
    icon: visual("units/geyser"), direction: Vector2.DOWN,
    bodies: [{ body: { ...lying("Geyser", "units/geyser"), cards: [WAIT, SHOCK_WAVE] } }],
})

export const PATROL_ROBOT = hazardType({
    id: "patrol-robot",
    name: "Robot patrouilleur",
    description: ["Fonce deux fois sur sa ligne, puis fait demi-tour : ", RAM, "."],
    icon: visual("units/robot"), direction: Vector2.DOWN,
    bodies: [{
        body: {
            ...standing("Robot patrouilleur", "units/robot"), hitbox: new Box(0.9, 0.7), cards: [RAM, RAM, ABOUT_FACE],
        },
    }],
})

export const PIRATE_SHIP = hazardType({
    id: "pirate-ship",
    name: "Bateau pirate",
    description: ["Traverse l'arène et en sort : ", PROJECTION, "."],

    icon: visual("units/ship"), direction: Vector2.RIGHT,
    bodies: [{
        body: {
            ...standing("Bateau pirate", "units/ship"), hitbox: new Box(3.2, 1.2), bounded: false,
            cards: [SHADOW_STEP, PROJECTION, SHADOW_STEP, PROJECTION],
        },
    }],
})

export const EXPLOSIVE_BARREL = hazardType({
    id: "explosive-barrel",
    name: "Tonneau explosif",
    description: ["Explose quand il est détruit : ", EXPLOSIVE, "."],

    icon: visual("units/barrel"), direction: Vector2.DOWN,
    bodies: [{
        body: {
            name: "Tonneau explosif", sprite: visual("units/barrel"), hearts: Heart.many(RED_HEART, BARREL_HEARTS),
            targetable: false,
        },
        statuses: [{ type: EXPLOSIVE, level: BARREL_EXPLOSIVE_LEVEL }],
    }],
})

export const PIRATE_CANNON = hazardType({
    id: "pirate-cannon", name: "Canon de pirate", description: ["Attend, puis tire un boulet devant lui : ", CANNONBALL, "."],
    icon: visual("units/cannon"), direction: Vector2.DOWN,
    bodies: [{ body: { ...standing("Canon de pirate", "units/cannon"), size: FIXTURE_SIZE, cards: [WAIT, CANNONBALL] } }],
})

/** Every hazard, for what lists them. */
export const ALL_HAZARDS: readonly HazardType[] = [
    PILLAR, WALL, TREE, ROCK_BLOCK, TORII, RING_ROPE, BUSH, HOLE, PUDDLE_ZONE, CONVEYOR, PISTON,
    FLAMETHROWER_TURRET, GEYSER, PATROL_ROBOT, PIRATE_SHIP, EXPLOSIVE_BARREL, PIRATE_CANNON,
]

/**
 * The hazard with an id, from a command.
 *
 * @throws {@link Error} When the catalog has none.
 */
export function hazardTypeById(id: string): HazardType {
    const type = ALL_HAZARDS.find(each => each.id === id)
    if(!type) throw new Error(`The catalog has no hazard "${id}".`)
    return type
}
