import type { HaltType } from "../../halt/HaltType"
import { CONDUCTOR_HALT } from "../../halt/subs/necro/ConductorHalt"
import { NECRO_RECRUIT_HALT } from "../../halt/subs/necro/NecroRecruitHalt"
import { PROMPTER_HALT } from "../../halt/subs/necro/PrompterHalt"
import type { FloorType } from "../Floor"
import { CAVE_FLOOR } from "./CaveFloor"
import { UpgradeFloor, upgradeHalts } from "./UpgradeFloor"

/** How many rows the floor of a necromancer has when nothing says otherwise. */
export const NECRO_ROWS = 6

/** How many times the halts that suit an army of monsters weigh among the upgrades. */
const FAVOURED = 3

/**
 * The sorts of halt a place of the floor of a necromancer may be: the upgrades of a party, and the halts of
 * an army of monsters played in the order of their decks, which weigh more.
 */
export function necroHalts(): readonly HaltType[] {
    const army = [NECRO_RECRUIT_HALT, CONDUCTOR_HALT, PROMPTER_HALT]
    return [...upgradeHalts(), ...Array.from({ length: FAVOURED }, () => army).flat()]
}

/**
 * The sort of a floor of a necromancer: no fight, only halts to raise an army of monsters and order its
 * decks. It leads to itself, so the necromancer goes on for ever, a level higher at each floor. The halts of
 * the duels are the mode's to lay.
 */
export function necroFloorType(rows: number = NECRO_ROWS): FloorType {
    const type: FloorType = {
        ...CAVE_FLOOR,
        name: "Antre du nécromancien",
        description: "Pas un combat : des monstres à recruter, des decks à ordonner, et des héros à attendre.",
        create: level => new UpgradeFloor(level, type, rows, necroHalts),
        leadsTo: () => [type],
    }
    return type
}

/** The sort of the floor of a necromancer, of the rows it has when nothing says otherwise. */
export const NECRO_FLOOR: FloorType = necroFloorType()
