import type { Vector2 } from "../../../base/Vector2"
import { CARTE, DISTANCE, BATTLE_ROUND } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { Action, Pose } from "../../../battle/Action"
import { NOTE_COLOR } from "../../../battle/previewColors"
import { UNIT_HITBOX, UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { SummonedHearts } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { SHIELD_HEART } from "../../../heart/subs/ShieldHeartKind"
import { CHESS_PIECE, PAWN_PIECE } from "../../../status/subs/ChessPieces"
import { ACTION, MODULE } from "../../CardType"
import type { Module } from "../../CardType"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"
import { summonShown } from "../summon/SummonCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { PLAYED_BY_LAST } from "./ChessCards"
import * as Previews from "../../../battle/preview/Previews"

/** How far ahead the robot stands, in meters. */
const ROBOT_AHEAD = 1 - UNIT_RADIUS

/** How many shield hearts the small robot lives by, before the summoning of the unit. */
const ROBOT_HEARTS = 1

/** How many rounds the robot is a piece of chess for. */
const ROBOT_PIECE_ROUNDS = 3

/** Where the robot stands, ahead of the edge of a unit at a pose. */
function spotOf(unit: Unit, pose: Pose): Vector2 {
    return unit.muzzle(pose).plus(pose.direction.times(ROBOT_AHEAD))
}

/**
 * A small robot built from a module, as the improvised robot is, which is a pawn for a few rounds: its owner can
 * have it play actions, and gets in hand the card that has the last piece play one.
 */
export class PawnRobotCard extends AbstractCard<Action, Module> {


    public readonly output = ACTION
    public readonly input = MODULE

    constructor(){
        super("Robot pion", [
            "Invoque à ", ROBOT_AHEAD, " ", DISTANCE, " devant un petit robot d'",
            new SummonedHearts(ROBOT_HEARTS, SHIELD_HEART), ", qui joue les ", CARTE.as("cartes"),
            " du module à chaque ", BATTLE_ROUND, ". Il est une pièce d'échecs pour ", ROBOT_PIECE_ROUNDS, " ",
            BATTLE_ROUND.as("rounds"), ". Ajoute à ta main Par la dernière pièce.",
        ], Rarity.EPIC)
    }


    public get(module: Module): Action {
        return {
            use: function ({ battle, unit }){
                const count = ROBOT_HEARTS + unit.stats.summon.value
                const robot = battle.place(unit, {
                    sprite: visual("units/robot"), name: "Petit robot", at: spotOf(unit, unit), direction: unit.direction,
                    hearts: Heart.many(SHIELD_HEART, count),
                    cards: module.cards(options => battle.rng.pick(options) ?? options[0]),
                })
                if(robot){
                    module.tune(robot)
                    battle.applyStatus(robot, PAWN_PIECE, 1)
                    battle.applyStatus(robot, CHESS_PIECE, ROBOT_PIECE_ROUNDS)
                    battle.giveFleetingCard(unit, PLAYED_BY_LAST)
                }
                hold(battle, SHORT_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const spot = spotOf(unit, pose)
                if(!battle.free(spot, unit, UNIT_HITBOX)) return Previews.still(pose, Previews.label(spot, "pas de place", NOTE_COLOR))
                return Previews.still(pose, summonShown(spot))
            },
        }
    }
}

export const PAWN_ROBOT = new PawnRobotCard()
