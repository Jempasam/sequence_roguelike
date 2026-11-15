import { AGILITE, DISTANCE, UNIT } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { UnitContext } from "../../../battle/Action"
import { frenchNumber } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { GLASS_HEART } from "../../../heart/subs/GlassHeartKind"
import { CHESS_PIECE } from "../../../status/subs/ChessPieces"

import { AbstractUsable } from "../AbstractUsable"

/** How far a spring throws its user back, in meters, before the agility. */
const SPRING_LENGTH = 3

/** How far a kite carries its user, in meters, before the agility. */
const KITE_LENGTH = 5

/** How far the silence jar reaches, in meters. */
const SILENCE_RANGE = 5

/** How far the iron magnet pulls the bodies of its user, and from how far around, in meters. */
const MAGNET_PULL = 2
const MAGNET_RANGE = 6

/** How far the pawn powder reaches, in meters, and how many rounds the promotion lasts. */
const POWDER_RANGE = 4
const POWDER_ROUNDS = 2

/** How many glass hearts the glass flask gives. */
const GLASS_FLASK_HEARTS = 2

/** A spring: its user is thrown back. */
export class Spring extends AbstractUsable {


    constructor(){
        super("Ressort", visual("usables/spring"), [
            "Te propulse de ", SPRING_LENGTH, "×", AGILITE, " ", DISTANCE, " en arrière. 3 utilisations, rechargées à chaque combat.",
        ], { charges: 3, refill: "battle" })
    }


    protected act({ battle, unit }: UnitContext): void {
        battle.move(unit, unit.direction.opposite, SPRING_LENGTH * unit.stats.move.value)
    }
}

export const SPRING = new Spring()

/** A silence jar: the nearest enemy loses its next step. */
export class SilenceJar extends AbstractUsable {


    constructor(){
        super("Bocal de silence", visual("usables/silence_jar"), [
            "L'", UNIT, " ennemie la plus proche à ", frenchNumber(SILENCE_RANGE), " ", DISTANCE,
            " perd sa prochaine étape. 2 utilisations, rechargées à chaque combat.",
        ], { charges: 2, refill: "battle" })
    }


    protected act({ battle, unit }: UnitContext): void {
        const enemy = battle.nearestEnemy(unit, SILENCE_RANGE)
        if(enemy) battle.stun(enemy)
    }
}

export const SILENCE_JAR = new SilenceJar()

/** A kite: its user is carried ahead, over everything. */
export class Kite extends AbstractUsable {


    constructor(){
        super("Cerf-volant", visual("usables/kite"), [
            "Te téléporte de ", KITE_LENGTH, "×", AGILITE, " ", DISTANCE, " devant. Une fois par combat.",
        ], { charges: 1, refill: "battle" })
    }


    protected act({ battle, unit }: UnitContext): void {
        battle.blink(unit, unit.position.plus(unit.direction.times(KITE_LENGTH * unit.stats.move.value)))
    }
}

export const KITE = new Kite()

/** An iron magnet: the bodies of its user around are pulled to it. */
export class IronMagnet extends AbstractUsable {


    constructor(){
        super("Aimant à fer", visual("usables/iron_magnet"), [
            "Tire de ", MAGNET_PULL, " ", DISTANCE, " vers toi chacune de tes invocations à ", MAGNET_RANGE, " ", DISTANCE,
            " autour. 2 utilisations.",
        ], { charges: 2 })
    }


    protected act({ battle, unit }: UnitContext): void {
        for(const body of battle.units){
            if(body.owner !== unit || !body.alive || body.position.distance(unit.position) > MAGNET_RANGE) continue
            const way = unit.position.minus(body.position).normalized
            if(way) battle.move(body, way, MAGNET_PULL, true)
        }
    }
}

export const IRON_MAGNET = new IronMagnet()

/** A pawn powder: the nearest ally becomes a piece of chess for a while. */
export class PawnPowder extends AbstractUsable {


    constructor(){
        super("Poudre de pion", visual("usables/pawn_powder"), [
            "L'allié le plus proche à ", POWDER_RANGE, " ", DISTANCE, " devient une pièce d'échecs pour ", POWDER_ROUNDS,
            " rounds. 2 utilisations.",
        ], { charges: 2 })
    }


    protected act({ battle, unit }: UnitContext): void {
        const ally = battle.nearestAlly(unit, POWDER_RANGE)
        if(ally) battle.applyStatus(ally, CHESS_PIECE, POWDER_ROUNDS)
    }
}

export const PAWN_POWDER = new PawnPowder()

/** A glass flask: its user gets glass hearts. */
export class GlassFlask extends AbstractUsable {


    constructor(){
        super("Fiole de verre", visual("usables/glass_flask"), [
            "Te donne ", GLASS_FLASK_HEARTS, " cœurs de verre. Rechargée à chaque combat.",
        ], { charges: 1, refill: "battle" })
    }


    protected act({ unit }: UnitContext): void {
        for(const heart of Heart.many(GLASS_HEART, GLASS_FLASK_HEARTS)) unit.hearts.give(heart)
    }
}

export const GLASS_FLASK = new GlassFlask()
