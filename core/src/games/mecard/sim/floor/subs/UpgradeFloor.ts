import type { HaltType } from "../../halt/HaltType"
import { greatHalts, masterHalts } from "../../catalog/halts"
import { ALCHEMIST_HALT } from "../../halt/subs/deck/AlchemistHalt"
import { ANTIQUARIAN_HALT } from "../../halt/subs/deck/AntiquarianHalt"
import { ENCHANTER_HALT } from "../../halt/subs/deck/EnchanterHalt"
import { FORGE_HALT } from "../../halt/subs/deck/ForgeHalt"
import { REMOVAL_HALT } from "../../halt/subs/deck/RemovalHalt"
import { STRATEGIST_HALT } from "../../halt/subs/deck/StrategistHalt"
import { WEAVER_HALT } from "../../halt/subs/deck/WeaverHalt"
import { CHEST_HALT } from "../../halt/subs/gift/ChestHalt"
import { INVENTOR_HALT } from "../../halt/subs/gift/InventorHalt"
import { MAGICIAN_HALT } from "../../halt/subs/gift/MagicianHalt"
import { MERCHANT_HALT } from "../../halt/subs/gift/MerchantHalt"
import { SHOP_HALT } from "../../halt/subs/gift/ShopHalt"
import { TRAINER_HALT } from "../../halt/subs/gift/TrainerHalt"
import { WITCH_HALT } from "../../halt/subs/gift/WitchHalt"
import { HOSPITAL_HALT } from "../../halt/subs/party/HospitalHalt"
import type { Place } from "../../run/Journey"
import type { Floor, FloorContext, FloorType } from "../Floor"
import { CAVE_FLOOR } from "./CaveFloor"
import { zipped } from "./AbstractFloor"

/** How many rows the floor has when nothing says otherwise. */
export const UPGRADE_ROWS = 5

/** How many places a row has at least and at most, and how many the first has at least. */
const MIN_WIDTH = 2
const MAX_WIDTH = 4
const FIRST_WIDTH = 3

/** How likely two places side by side lead on together, rather than one of the two going on alone. */
const BOTH_ON = 0.3

/**
 * The sorts of halt a place of the floor may be: all those that make the party stronger, none that costs it
 * or fights. The ones of a master and of a great one weigh as much as the others.
 */
export function upgradeHalts(): readonly HaltType[] {
    return [
        HOSPITAL_HALT, SHOP_HALT, CHEST_HALT, REMOVAL_HALT, FORGE_HALT, ENCHANTER_HALT, ALCHEMIST_HALT,
        MERCHANT_HALT, WITCH_HALT, INVENTOR_HALT, TRAINER_HALT, ANTIQUARIAN_HALT, MAGICIAN_HALT, WEAVER_HALT,
        STRATEGIST_HALT, ...masterHalts(), ...greatHalts(),
    ]
}

/**
 * A floor with no fight: only halts that upgrade the party, in rows of a few places leading to the next, so
 * the party chooses what to get stronger with, by different paths. The rows are zipped together as those of
 * any floor, from left to right.
 *
 * @remarks
 * A place is never the kind of a place leading to it, so a path does not meet the same halt twice in a row.
 */
export class UpgradeFloor implements Floor {


    constructor(
        public readonly level: number,
        public readonly type: FloorType,

        /** How many rows of places it has, at least two. */
        public readonly rows: number = UPGRADE_ROWS,

        /** The sorts of halt its places may be, the upgrades of a party by default. */
        private readonly halts: () => readonly HaltType[] = upgradeHalts,
    ){
        if(!Number.isInteger(rows) || rows < 2) throw new Error(`A floor of upgrades has two rows at least, not ${rows}.`)
    }


    public fillMap(ctx: FloorContext): void {
        const pool = this.halts()
        let previous: Place[] = []
        for(let layer = 0; layer < this.rows; layer++){
            const width = layer === 0
                ? FIRST_WIDTH + ctx.rng.int(MAX_WIDTH - FIRST_WIDTH + 1)
                : MIN_WIDTH + ctx.rng.int(MAX_WIDTH - MIN_WIDTH + 1)
            const links = layer === 0 ? [] : zipped(previous.length, width, () => ctx.rng.chance(BOTH_ON))
            const row: Place[] = []
            for(let index = 0; index < width; index++){
                const leading = links.filter(([, to]) => to === index).map(([from]) => previous[from])
                const taken = new Set(leading.map(place => place.halt))
                const allowed = pool.filter(type => !taken.has(type))
                const type = ctx.rng.pick(allowed) ?? ctx.rng.pick(pool)!
                const place = ctx.addHalt(type, { layer, across: (index + 0.5) / width })
                for(const from of leading) ctx.link(from, place)
                row.push(place)
            }
            previous = row
        }
    }
}

/**
 * The sort of a floor of upgrades of a number of rows. It lies on no exit: only a mode that wants it starts a
 * run on it.
 */
export function upgradeFloorType(rows: number = UPGRADE_ROWS): FloorType {
    const type: FloorType = {
        ...CAVE_FLOOR,
        name: "Atelier",
        description: "Rien que des haltes pour s'améliorer : on y choisit son chemin, et de quoi devenir plus fort.",
        create: level => new UpgradeFloor(level, type, rows),
    }
    return type
}

/** The sort of the floor of upgrades, of the rows it has when nothing says otherwise. */
export const UPGRADE_FLOOR: FloorType = upgradeFloorType()
