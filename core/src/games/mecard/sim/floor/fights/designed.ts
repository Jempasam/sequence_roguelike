import { Rng } from "../../base/Rng"
import type { Visual } from "../../base/Visual"
import type { Text } from "../../../../../semantic"
import type { Vector2 } from "../../base/Vector2"
import type { Kit } from "../../catalog/kits"
import type { Monster } from "../../catalog/monsters"
import { KitFightType } from "../../fight/KitFightType"
import type { FightStage } from "../../fight/Fight"
import type { FightCategory } from "../../fight/FightCategory"
import { AMBUSH } from "../../fight/fights"
import { fightType } from "../../fight/FightType"
import type { FightType, Laying } from "../../fight/FightType"
import type { HazardType } from "../../hazard/HazardType"
import { hazardSpot, monsterSpot } from "../../run/formation"

/** A fight of a floor, and the layers of the map it may be laid in. */
export interface Laid {
    readonly type: FightType

    /** The first layer it may be laid in. */
    readonly from: number

    /** The last layer it may be laid in. */
    readonly to: number
}

/** What a fight thought for a floor is made of. */
export interface Design {
    readonly category: FightCategory

    /** Its name, from which its id is made too: it tells what the fight holds. */
    readonly name: string
    readonly description: Text

    /** The first and the last layer of the map it may be laid in. */
    readonly layers: readonly [from: number, to: number]

    /** The hazards laid out in its arena: none by default. */
    readonly hazards?: readonly Laying[]

    /** Stand its monsters, with {@link put}. */
    populate(stage: FightStage): void
}

/** The picture of a fight: the sprite of its sturdiest monster, the first of them when several are as sturdy. */
function pictureOf(design: Design): Visual {
    const monsters: Monster[] = []
    design.populate({
        rng: new Rng(0), level: 1, layer: design.layers[0],
        add: monster => { monsters.push(monster) }, addKit: () => {},
    })
    const lead = monsters.reduce((best, each) => each.hearts > best.hearts ? each : best)
    return lead.sprite
}

/** A fight of a floor, thought apart: its monsters stand where its design says, its picture is one of them. */
export function designed(design: Design): Laid {
    const { category, name, description, layers, hazards, populate } = design
    const id = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const type = fightType({ id, name, description, icon: pictureOf(design), category, hazards, populate })
    return { type, from: layers[0], to: layers[1] }
}

/** What a fight of a floor against kits is made of. */
export interface KitsDesign {
    readonly category: FightCategory

    /** Its name, from which its id is made too: it tells who attacks. */
    readonly name: string
    readonly description: Text

    /** The first and the last layer of the map it may be laid in. */
    readonly layers: readonly [from: number, to: number]

    /** The hazards laid out in its arena: none by default. */
    readonly hazards?: readonly Laying[]

    /** The kits the party fights, the picture of the fight being the sprite of the first. */
    readonly kits: readonly Kit[]
}

/** A fight of a floor against kits, thought apart: its picture is the sprite of its first kit. */
export function designedKits(design: KitsDesign): Laid {
    const { category, name, description, layers, hazards, kits } = design
    const id = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const type = new KitFightType({ id, name, description, icon: kits[0].sprite, category, hazards, kits })
    return { type, from: layers[0], to: layers[1] }
}

/**
 * Stand a monster on a spot of its half of the arena: the column from the left, 0 to 6, and the row from the
 * top, 0 behind and 1 in front, facing the party.
 */
export function put(stage: FightStage, monster: Monster, column: number, row: number): void {
    stage.add(monster, { position: monsterSpot(column, row) })
}

/**
 * Lay a hazard on a spot of the middle of the arena, the column from the left, 0 to 6, and the row from the top,
 * 2 to 4, a half of either between two spots, facing a direction, its own by default.
 */
export function lay(type: HazardType, column: number, row: number, direction?: Vector2): Laying {
    return { type, at: hazardSpot(column, row), direction }
}

/**
 * The fight of a category a floor lays in a layer, one of those that may lie there, as likely as each other.
 *
 * @throws {@link Error} When the floor has none for the category and the layer.
 */
export function laidIn(fights: readonly Laid[], category: FightCategory, layer: number, rng: Rng): FightType {
    const fitting = fights.filter(each => each.from <= layer && layer <= each.to && fightsAs(each.type, category))
    const chosen = rng.pick(fitting)
    if(!chosen) throw new Error(`The floor has no fight of category "${category.id}" for layer ${layer}.`)
    return chosen.type instanceof KitFightType && category === AMBUSH ? chosen.type.ambush : chosen.type
}

/** May a fight be fought as a category says: its own, or the ambush for any fight against kits? */
function fightsAs(type: FightType, category: FightCategory): boolean {
    return type.category === category || category === AMBUSH && type instanceof KitFightType
}
