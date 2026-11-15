import { DISTANCE, FORCE, UNIT } from "../../../base/keywords"
import type { Vector2 } from "../../../base/Vector2"
import { visual } from "../../../base/Visual"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import { DamageType } from "../../../battle/DamageType"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { NOTE_COLOR, PHYSICAL_COLOR } from "../../../battle/previewColors"
import { HeartCount } from "../../../battle/words"
import {
    BISHOP_PIECE, BISHOP_MOVE, CHESS_PIECE, KNIGHT_EXTRA, KNIGHT_PIECE, PAWN_PIECE, QUEEN_PIECE, ROOK_EXTRA, ROOK_PIECE,
} from "../../../status/subs/ChessPieces"
import type { StatusType } from "../../../status/Status"
import { Rarity } from "../../Rarity"

import { ActionCard } from "../ActionCard"
import { ModifierCard } from "../ModifierCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { summonedHearts, summonShown } from "../summon/SummonCard"
import { EVERY_PIECE, LAST_PIECE, NEAREST_PIECE, piecesOf, playedBy } from "../tools/delegating"
import { MOVE_COLOR, MOVE_WIDTH } from "../../../battle/previewColors"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How long a swap takes to fade out and back in, in seconds. */
const SWAP_TIME = 0.15

/** How far ahead a piece is set down, in meters: at the contact. */
const AHEAD = 1

/** How many hearts each piece lives by, before the summoning of the unit. */
const PAWN_HEARTS = 1
const ROOK_HEARTS = 2
const KNIGHT_HEARTS = 1
const BISHOP_HEARTS = 1
const QUEEN_HEARTS = 3

/** How far a promotion reaches, in meters. */
const PROMOTION_RANGE = 4

/** How many rounds a promoted ally is a piece for. */
const PROMOTION_ROUNDS = 2

/** How far around the unit the pieces take a check, in meters. */
const CHECK_RADIUS = 6

/** How far a piece strikes when it is checked, in meters, and how wide. */
const CHECK_REACH = 1.5
const CHECK_WIDTH = 0.6

/** How many hearts a piece in check takes from an enemy, before its strength. */
const CHECK_DAMAGE = 1

/** What a card of a piece sets down. */
interface Piece {
    readonly name: string

    /** Its picture, by its name among the units. */
    readonly sprite: string

    readonly status: StatusType
    readonly hearts: number
    readonly rarity: Rarity

    /** What it does, once it is set down, from the card. */
    readonly description: ConstructorParameters<typeof ActionCard>[1]

    /** What more it gets: its owner's items for a queen. */
    readonly equip?: (battle: Battle, body: Unit, owner: Unit) => void
}

/** The spot where a piece stands, from a pose. */
function spotOf(pose: Pose): Vector2 {
    return pose.position.plus(pose.direction.times(AHEAD))
}

/** A card setting down a piece: a body with no deck, which plays what its owner has it play. */
function pieceCard(piece: Piece): ActionCard {
    const action: Action = {
        use: function ({ battle, unit }){
            const body = battle.place(unit, {
                sprite: visual(`units/${piece.sprite}`),
                name: piece.name, at: spotOf(unit), direction: unit.direction,
                hearts: summonedHearts(unit, piece.hearts),
            })
            if(body){
                battle.applyStatus(body, piece.status, 1)
                piece.equip?.(battle, body, unit)
            }
            hold(battle, SHORT_TIME)
        },
        preview: ({ battle, unit, pose }) => {
            const spot = spotOf(pose)
            if(!battle.free(spot, unit, UNIT_RADIUS)) return Previews.still(pose, Previews.label(spot, "pas de place", NOTE_COLOR))
            return Previews.still(pose, summonShown(spot))
        },
    }
    return new ActionCard(piece.name, piece.description, piece.rarity, action)
}

export const PAWN_CARD = pieceCard({
    name: "Pion", sprite: "pawn", status: PAWN_PIECE, hearts: PAWN_HEARTS, rarity: Rarity.COMMON,
    description: [
        "Pose à ", AHEAD, " ", DISTANCE, " devant un pion de ", new HeartCount(PAWN_HEARTS), ". Quand plusieurs pièces ",
        "jouent la même action, il la joue avant les autres.",
    ],
})

export const ROOK_CARD = pieceCard({
    name: "Tour", sprite: "rook", status: ROOK_PIECE, hearts: ROOK_HEARTS, rarity: Rarity.COMMON,
    description: [
        "Pose à ", AHEAD, " ", DISTANCE, " devant une tour de ", new HeartCount(ROOK_HEARTS), ". Après chaque déplacement, ",
        "elle avance de ", ROOK_EXTRA, " ", DISTANCE, " de plus dans la même direction.",
    ],
})

export const KNIGHT_PIECE_CARD = pieceCard({
    name: "Cavalier", sprite: "chess_knight", status: KNIGHT_PIECE, hearts: KNIGHT_HEARTS, rarity: Rarity.COMMON,
    description: [
        "Pose à ", AHEAD, " ", DISTANCE, " devant un cavalier de ", new HeartCount(KNIGHT_HEARTS), ". Après chaque ",
        "déplacement, il se décale de ", KNIGHT_EXTRA, " ", DISTANCE, " à droite.",
    ],
})

export const BISHOP_CARD = pieceCard({
    name: "Fou", sprite: "bishop", status: BISHOP_PIECE, hearts: BISHOP_HEARTS, rarity: Rarity.COMMON,
    description: [
        "Pose à ", AHEAD, " ", DISTANCE, " devant un fou de ", new HeartCount(BISHOP_HEARTS), ". Ses déplacements vont ",
        BISHOP_MOVE * 100, " % plus loin.",
    ],
})

export const QUEEN_CARD = pieceCard({
    name: "Reine", sprite: "queen", status: QUEEN_PIECE, hearts: QUEEN_HEARTS, rarity: Rarity.EPIC,
    description: [
        "Pose à ", AHEAD, " ", DISTANCE, " devant une reine de ", new HeartCount(QUEEN_HEARTS), ", qui reçoit une copie ",
        "de tous tes objets.",
    ],
    equip: (battle, body, owner) => {
        for(const item of owner.items) battle.equip(body, item)
    },
})

export const PLAYED_BY_NEAREST = new ModifierCard("Par la pièce proche", [
    "L'action est jouée par la pièce la plus proche de toi, de là où elle est.",
], Rarity.COMMON, action => playedBy(action, NEAREST_PIECE))

export const PLAYED_BY_LAST = new ModifierCard("Par la dernière pièce", [
    "L'action est jouée par la dernière pièce posée.",
], Rarity.RARE, action => playedBy(action, LAST_PIECE))

export const PLAYED_BY_ALL = new ModifierCard("Par toutes les pièces", [
    "L'action est jouée par chacune de tes pièces, l'une après l'autre, les pions d'abord.",
], Rarity.EPIC, action => playedBy(action, EVERY_PIECE))

/** Make the nearest ally a piece for a few rounds. */
export const PROMOTION = new ActionCard("Promotion", [
    "L'allié le plus proche à ", PROMOTION_RANGE, " ", DISTANCE, " devient une pièce d'échecs pour ", PROMOTION_ROUNDS,
    " rounds.",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        const ally = battle.nearestAlly(unit, PROMOTION_RANGE)
        if(ally) battle.applyStatus(ally, CHESS_PIECE, PROMOTION_ROUNDS)
        hold(battle, SHORT_TIME, [Previews.label(unit.position, "promotion", NOTE_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        const ally = battle.nearestAlly(unit, PROMOTION_RANGE, pose.position)
        return Previews.still(pose, Previews.label(ally?.position ?? pose.position, ally ? "promotion" : "personne en vue", NOTE_COLOR))
    },
})

/** The piece nearest to a unit, none when it has none. */
function nearestPiece(battle: Battle, unit: Unit, from: Vector2): Unit|null {
    let best: Unit|null = null
    for(const piece of piecesOf(battle, unit)){
        if(!best || piece.position.distance(from) < best.position.distance(from)) best = piece
    }
    return best
}

/** A swap of places with the nearest piece. */
export const CASTLING = new ActionCard("Roque", [
    "Échange ta place avec la pièce la plus proche.",
], Rarity.COMMON, {
    use: function ({ battle, unit }){
        const piece = nearestPiece(battle, unit, unit.position)
        if(!piece){
            battle.events.push({ type: "skipped", unit, reason: "aucune pièce" })
            hold(battle, SHORT_TIME, [Previews.label(unit.position, "aucune pièce", NOTE_COLOR)])
            return
        }
        hold(battle, SWAP_TIME, [Previews.arrow([unit.position, piece.position], MOVE_WIDTH / 2, MOVE_COLOR)])
        battle.swap(unit, piece)
        hold(battle, SWAP_TIME)
    },
    preview: ({ battle, unit, pose }) => {
        const piece = nearestPiece(battle, unit, pose.position)
        if(!piece) return Previews.still(pose, Previews.label(pose.position, "aucune pièce", NOTE_COLOR))
        return Previews.still({ ...pose, position: piece.position }, Previews.arrow([pose.position, piece.position], MOVE_WIDTH / 2, MOVE_COLOR))
    },
})

/** The ground a piece in check strikes: ahead of it, a short narrow band. */
function checkArea(at: Vector2, way: Vector2) {
    return Areas.line(at, at.plus(way.times(CHECK_REACH)), CHECK_WIDTH)
}

/** Every piece around turns to the nearest enemy and thrusts. */
export const CHECK = new ActionCard("Échec", [
    "Chaque pièce à ", CHECK_RADIUS, " ", DISTANCE, " autour de toi se tourne vers l'", UNIT, " ennemie la plus proche ",
    "et frappe : ", CHECK_DAMAGE, "+", FORCE, " ", DamageType.PHYSICAL, " à ", CHECK_REACH, " ", DISTANCE, ".",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        for(const piece of piecesOf(battle, unit)){
            if(piece.position.distance(unit.position) > CHECK_RADIUS) continue
            const enemy = battle.nearestEnemy(piece)
            const way = enemy ? enemy.position.minus(piece.position).normalized : null
            if(!way) continue
            battle.turn(piece, way)
            battle.strike(piece, checkArea(piece.position, way), CHECK_DAMAGE + piece.stats.strength.value, DamageType.PHYSICAL)
        }
        hold(battle, SHORT_TIME, [Previews.label(unit.position, "échec", NOTE_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        const shown = piecesOf(battle, unit)
            .filter(piece => piece.position.distance(pose.position) <= CHECK_RADIUS)
            .flatMap(piece => {
                const enemy = battle.nearestEnemy(piece)
                const way = enemy ? enemy.position.minus(piece.position).normalized : null
                return way ? [Previews.polygon(checkArea(piece.position, way), PHYSICAL_COLOR)] : []
            })
        return Previews.still(pose, ...shown)
    },
})
