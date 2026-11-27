import { DISTANCE, UNIT } from "../../../base/keywords"
import * as Areas from "../../../battle/area/Areas"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import type { Battle } from "../../../battle/Battle"
import type { StatusType } from "../../../status/Status"
import { BISHOP_PIECE, CHESS_PIECE, KNIGHT_PIECE, PAWN_PIECE, QUEEN_PIECE, ROOK_PIECE } from "../../../status/subs/ChessPieces"
import { RESURRECTED } from "../../../status/subs/Resurrection"

import { Rarity } from "../../Rarity"
import { ActionCard } from "../ActionCard"
import { onFirstAhead } from "../tools/targeting"

/** How far ahead the epidemic reaches for its first victim, and how wide, in meters. */
const EPIDEMIC_LENGTH = 1.5 - UNIT_RADIUS
const EPIDEMIC_WIDTH = 0.4

/** How far around its victim the epidemic spreads, in meters. */
const EPIDEMIC_RADIUS = 1

/** How many levels each status loses by passing on. */
const EPIDEMIC_LOSS = 1

/** How far ahead the transfusion reaches, and how wide, in meters. */
const TRANSFUSION_LENGTH = 3.65
const TRANSFUSION_WIDTH = 0.6

/** The statuses a copy would make no sense of: a second life, a promotion. */
const NOT_PASSED_ON: ReadonlySet<StatusType> = new Set([
    RESURRECTED, CHESS_PIECE, PAWN_PIECE, ROOK_PIECE, KNIGHT_PIECE, BISHOP_PIECE, QUEEN_PIECE,
])

/** Can a status of a unit pass to another: one that is the body's own does not, nor what a copy makes no sense of. */
function passes(type: StatusType): boolean {
    return type.cloned && !NOT_PASSED_ON.has(type)
}

/** The statuses of a unit that pass on, with their levels, as they are now. */
function passing(unit: Unit): [StatusType, number][] {
    return [...unit.statuses].filter(([type]) => passes(type)).map(([type, status]) => [type, status.level])
}

/** Every status of a victim passed on, a level weaker, to each unit around it. */
function spread(battle: Battle, victim: Unit): void {
    const carried = passing(victim)
    for(const other of battle.fetch(Areas.circle(victim.position, EPIDEMIC_RADIUS + UNIT_RADIUS), victim)){
        for(const [type, level] of carried) battle.applyStatus(other, type, Math.max(1,level - EPIDEMIC_LOSS))
    }
}

export const EPIDEMIC = new ActionCard("Épidémie", [
    "Tous les statuts de la première ", UNIT, " touchée sur ", EPIDEMIC_LENGTH, " ", DISTANCE,
    " sont copiés, d'un niveau de moins (minimum 1), sur les ", UNIT.as("unités"), " à ", EPIDEMIC_RADIUS, " ", DISTANCE, " autour d'elle.",
], Rarity.EPIC, onFirstAhead(EPIDEMIC_LENGTH, EPIDEMIC_WIDTH, (battle, _unit, victim) => spread(battle, victim), "épidémie"))

export const TRANSFUSION = new ActionCard("Transfusion", [
    "Tous tes status négatifs passent sur la première ", UNIT, " touchée sur ", TRANSFUSION_LENGTH, " ", DISTANCE, " devant.",
], Rarity.RARE, onFirstAhead(TRANSFUSION_LENGTH, TRANSFUSION_WIDTH, (battle, unit, target) => {
    for(const [type, level] of passing(unit)){
        if(type.polarity !== "negative") continue
        battle.removeStatus(unit, type)
        battle.applyStatus(target, type, level)
    }
}, "transfusion"))
