import { CARTE, DISTANCE, BATTLE_ROUND } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { Action } from "../../../battle/Action"
import { SummonedHearts } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { SHIELD_HEART } from "../../../heart/subs/ShieldHeartKind"
import { CHESS_PIECE, PAWN_PIECE } from "../../../status/subs/ChessPieces"
import { ACTION, MODULE } from "../../CardType"
import type { Module } from "../../CardType"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"
import { SUMMON_AHEAD, summonSpot, summoning } from "../tools/playing"
import { PLAYED_BY_LAST } from "./ChessCards"

/** How many shield hearts the small robot lives by, before the summoning of the unit. */
const ROBOT_HEARTS = 1

/** How many rounds the robot is a piece of chess for. */
const ROBOT_PIECE_ROUNDS = 3

/**
 * A small robot built from a module, as the improvised robot is, which is a pawn for a few rounds: its owner can
 * have it play actions, and gets in hand the card that has the last piece play one.
 */
export class PawnRobotCard extends AbstractCard<Action, Module> {


    public readonly output = ACTION
    public readonly input = MODULE

    constructor(){
        super("Robot pion", [
            "Invoque à ", SUMMON_AHEAD, " ", DISTANCE, " devant un petit robot d'",
            new SummonedHearts(ROBOT_HEARTS, SHIELD_HEART), ", qui joue les ", CARTE.as("cartes"),
            " du module à chaque ", BATTLE_ROUND, ". Il est une pièce d'échecs pour ", ROBOT_PIECE_ROUNDS, " ",
            BATTLE_ROUND.as("rounds"), ". Ajoute à ta main Par la dernière pièce.",
        ], Rarity.EPIC)
    }


    public get(module: Module): Action {
        return summoning(
            (unit, pose) => [summonSpot(unit, pose)],
            (unit, battle) => ({
                sprite: visual("units/robot"), name: "Petit robot",
                hearts: () => Heart.many(SHIELD_HEART, ROBOT_HEARTS + unit.stats.summon.value),
                cards: module.cards(options => battle.rng.pick(options) ?? options[0]),
            }),
            {
                equip: (battle, robot, owner) => {
                    module.tune(robot)
                    battle.applyStatus(robot, PAWN_PIECE, 1)
                    battle.applyStatus(robot, CHESS_PIECE, ROBOT_PIECE_ROUNDS)
                    battle.giveFleetingCard(owner, PLAYED_BY_LAST)
                },
            },
        )
    }
}

export const PAWN_ROBOT = new PawnRobotCard()
