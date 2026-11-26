import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { DISTANCE, UNIT, BATTLE_ROUND } from "../../../base/keywords"
import { TURN } from "../../../battle/mecanic/turn/keyword"
import { Ethereal } from "../../../process/subs/Ethereal"
import { Haunting } from "../../../process/subs/Haunting"
import type { Card } from "../../Card"

import { ActionCard } from "../ActionCard"
import { ProcessCard } from "../process/ProcessCards"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"

/** How far the haunt of the catalog reaches ahead, in meters. */
const HAUNT_RANGE = 5 - UNIT_RADIUS

/** How far the plagiarism of the catalog reaches around its caster, in meters. */
const PLAGIARISM_RANGE = 4 - UNIT_RADIUS

/** How many cards of others the plagiarism copies at most: the closest units come first. */
const PLAGIARISM_MAX = 2

/** What a haunt finding nobody says. */
const NOBODY = "personne en face"

export const ETHEREAL_FORM = new ProcessCard("Forme éthérée", [
    "Jusqu'à la fin du ", BATTLE_ROUND, ", ton corps ne prend pas de place : tu traverses les ", UNIT, "s, et nul ne peut te viser, ",
    "te toucher ni te déplacer. Dès que tu blesses quelqu'un, tu reprends corps.",
], Rarity.RARE, () => new Ethereal(), "éthéré")

/** A haunt: the first unit ahead is the host, which the caster, unsubstantial, follows from behind. */
function haunting(range: number): Action {
    return {
        use: function ({ battle, unit }){
            const { unit: host } = battle.ray(unit, range)
            if(!host){
                battle.events.push({ type: "skipped", unit, reason: NOBODY })
                hold(battle, SHORT_TIME, [Previews.label(unit.position, NOBODY, NOTE_COLOR)])
                return
            }
            hold(battle, SHORT_TIME, [Previews.arrow([unit.position, host.position], MOVE_WIDTH, CONTROL_COLOR)])
            battle.startProcess(unit, new Ethereal())
            battle.startProcess(unit, new Haunting(host))
        },
        preview: ({ battle, unit, pose }) => {
            const { unit: host } = battle.ray(unit, range, pose)
            if(!host) return Previews.still(pose, Previews.label(pose.position, NOBODY, NOTE_COLOR))
            const behind = host.position.minus(host.direction.times(host.radius + unit.radius))
            return Previews.still(
                { position: behind, direction: host.direction }, Previews.arrow([pose.position, behind], MOVE_WIDTH, CONTROL_COLOR),
                Previews.label(host.position, "hanté", NOTE_COLOR),
            )
        },
    }
}

export const HAUNT = new ActionCard("Hantise", [
    "Te connecte derrière la première ", UNIT, " en face, jusqu'à ", HAUNT_RANGE, " ", DISTANCE, " : sans corps jusqu'à ",
    "la fin du ", BATTLE_ROUND, ", tu la suis quand elle bouge ou ", TURN.as("se tourne"), ", et tu joues tes cartes depuis sa place, comme elle est ", TURN.as("tournée"), ".",
], Rarity.EPIC, haunting(HAUNT_RANGE))

/** The units of a circle around a pose that played a card, the closest first, the caster apart. */
function playersAround(battle: Battle, unit: Unit, pose: Pose, range: number): Unit[] {
    return battle.fetch(unit.around(range, pose), unit)
        .filter(other => other.lastTree.length > 0)
        .sort((a, b) => a.position.distance(pose.position) - b.position.distance(pose.position))
}

/** A plagiarism: the last cards played by the units around are copied at the end of the chain of the caster. */
function plagiarizing(range: number, most: number): Action {
    return {
        use: function ({ battle, unit }){
            const players = playersAround(battle, unit, unit, range).slice(0, most)
            hold(battle, SHORT_TIME, [Previews.polygon(unit.around(range), CONTROL_COLOR)])
            if(players.length === 0){
                battle.events.push({ type: "skipped", unit, reason: "rien à plagier" })
                return
            }
            const copies: Card[] = players.flatMap(player => [...player.lastTree])
            battle.appendToChain(unit, copies)
        },
        preview: ({ battle, unit, pose }) => {
            const players = playersAround(battle, unit, pose, range).slice(0, most)
            const shown = players.map(player => Previews.label(player.position, `${player.lastPlayed}`, NOTE_COLOR))
            return Previews.still(pose, Previews.polygon(unit.around(range, pose), CONTROL_COLOR), ...shown)
        },
    }
}

export const PLAGIARISM = new ActionCard("Plagiat", [
    "Les ", UNIT, "s jusqu'à ", PLAGIARISM_RANGE, " ", DISTANCE, " autour de toi, alliées ou ennemies, qui ont déjà joué : ",
    "les ", PLAGIARISM_MAX, " plus proches voient leurs dernières cartes jouées copiées au bout de ta chaîne, que tu joues ce ", BATTLE_ROUND, ".",
], Rarity.EPIC, plagiarizing(PLAGIARISM_RANGE, PLAGIARISM_MAX))
