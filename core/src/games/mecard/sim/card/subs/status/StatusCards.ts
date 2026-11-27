import { ALLONGE, DISTANCE, FORCE, PORTEE, UNIT, BATTLE_ROUND } from "../../../base/keywords"
import { BLUE_HEART } from "../../../heart/subs/BlueHeartKind"
import { EXPLOSIVE_HEART } from "../../../heart/subs/ExplosiveHeartKind"
import { Heart } from "../../../heart/Heart"
import { Grievance, WeakeningBlows } from "../../../process/subs/Grievance"
import { BLEEDING, FRAGILE, MARKED } from "../../../status/subs/Wounds"
import { CONCENTRATED, CONCENTRATION_RANGE, FURIOUS } from "../../../status/subs/Calm"
import { PHYSICAL_COLOR, RANGE_COLOR } from "../../../battle/previewColors"
import { HeartCount } from "../../../battle/words"
import type { Action } from "../../../battle/Action"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { StatusType } from "../../../status/Status"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { ahead, onCircle, onFirstAhead, onSelf, ring } from "../tools/targeting"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"

/** The reach of the weakening blows: a short wide band ahead. */
const WEAKENING_LENGTH = 1.5 - UNIT_RADIUS
const WEAKENING_WIDTH = 0.8

/** The segment of the marks and of the fragility: the mark reaches farther, the fragility is a dagger's. */
const MARK_LENGTH = 1.5 - UNIT_RADIUS
const MARK_WIDTH = 0.4
const DAGGER_LENGTH = 1.1 - UNIT_RADIUS
const DAGGER_WIDTH = 0.4

/** How many rounds a mark waits for the attack that is doubled. */
const MARK_ROUNDS = 3

/** How far the rampart reaches around its unit, in meters. */
const RAMPART_RADIUS = 1.5 - UNIT_RADIUS

/** An action of the unit on itself, giving a status of a level. */
function giving(type: StatusType, level: number, what: string): Action {
    return onSelf((battle, unit) => battle.applyStatus(unit, type, level), what)
}

export const CONCENTRATION = new ActionCard("Concentration", [
    "Gagne un ", BATTLE_ROUND, " de concentration : chaque Attendre en ajoute un, et chaque ", BATTLE_ROUND, " restant donne +",
    CONCENTRATION_RANGE, " ", PORTEE, " et ", ALLONGE, ".",
], Rarity.RARE, giving(CONCENTRATED, 1, "+1 concentration"))

export const HELD_FURY = new ActionCard("Fureur contenue", [
    "Gagne un ", BATTLE_ROUND, " de fureur : chaque Attendre en ajoute un, et chaque ", BATTLE_ROUND, " restant donne un point de force.",
], Rarity.RARE, giving(FURIOUS, 1, "+1 fureur"))

export const COOL_HEAD = new ActionCard("Sang froid", [
    "Retire tous ses status négatifs, et gagne un ", BATTLE_ROUND, " de concentration pour chacun.",
], Rarity.RARE, onSelf((battle, unit) => {
    const bad = [...unit.statuses.keys()].filter(type => type.polarity === "negative")
    for(const type of bad) battle.removeStatus(unit, type)
    if(bad.length > 0) battle.applyStatus(unit, CONCENTRATED, bad.length)
}, "sang froid"))

export const WEAKENING_BLOWS = new ActionCard("Coups affaiblissant", [
    "Les ", UNIT.as("unités"), " touchées sur ", WEAKENING_LENGTH, " ", DISTANCE, " devant, jusqu'à la fin du ", BATTLE_ROUND, ", ",
    "prennent un écho de ", 1, "+", FORCE, " à chaque blessure.",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        const area = ahead(unit, unit, WEAKENING_LENGTH, WEAKENING_WIDTH)
        for(const target of battle.fetch(area, unit)){
            battle.startProcess(target, new WeakeningBlows(1 + unit.stats.strength.value))
        }
        hold(battle, SHORT_TIME, [Previews.polygon(area, PHYSICAL_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        const area = ahead(unit, pose, WEAKENING_LENGTH, WEAKENING_WIDTH)
        return Previews.still(pose, Previews.polygon(area, RANGE_COLOR), ...battle.fetch(area, unit).map(ring))
    },
})

export const MARK_CARD = new ActionCard("Marque", [
    "Marque la première ", UNIT, " touchée sur ", MARK_LENGTH, " ", DISTANCE, " : la prochaine attaque qui la blesse ",
    "inflige le double.",
], Rarity.RARE, onFirstAhead(MARK_LENGTH, MARK_WIDTH, (battle, _unit, target) => {
    battle.applyStatus(target, MARKED, MARK_ROUNDS)
}, "marquée"))

export const FRAGILITY_CARD = new ActionCard("Fragilité", [
    "La première ", UNIT, " touchée sur ", DAGGER_LENGTH, " ", DISTANCE, " prend ", new HeartCount(1), " de plus à chaque blessure, ",
    "autant de ", BATTLE_ROUND.as("rounds"), " que de ", FORCE, ".",
], Rarity.RARE, onFirstAhead(DAGGER_LENGTH, DAGGER_WIDTH, (battle, unit, target) => {
    battle.applyStatus(target, FRAGILE, Math.max(1, unit.stats.strength.value))
}, "fragile"))

export const BLEED = new ActionCard("Saignement", [
    "La première ", UNIT, " touchée sur ", DAGGER_LENGTH, " ", DISTANCE, " gagne un ", BATTLE_ROUND, " de saignement : chaque ",
    "déplacement lui coûte ", new HeartCount(1), ".",
], Rarity.COMMON, onFirstAhead(DAGGER_LENGTH, DAGGER_WIDTH, (battle, _unit, target) => {
    battle.applyStatus(target, BLEEDING, 1)
}, "saigne"))

export const HEMORRHAGE = new ActionCard("Hémorragie", [
    "Double les ", BATTLE_ROUND.as("rounds"), " de saignement de la première ", UNIT, " touchée sur ", DAGGER_LENGTH, " ", DISTANCE, ".",
], Rarity.RARE, onFirstAhead(DAGGER_LENGTH, DAGGER_WIDTH, (battle, _unit, target) => {
    const bleeding = target.statuses.get(BLEEDING)
    if(bleeding) battle.applyStatus(target, BLEEDING, bleeding.level)
}, "saignement ×2"))

export const GRUDGE = new ActionCard("Rancune", [
    "Jusqu'à la fin du ", BATTLE_ROUND, ", chaque blessure subie donne un ", BATTLE_ROUND, " d'énergie démoniaque.",
], Rarity.RARE, onSelf((battle, unit) => battle.startProcess(unit, new Grievance()), "rancune"))

export const BLOCK = new ActionCard("Blocage", [
    "Gagne ", new HeartCount(1), " ", BLUE_HEART, ".",
], Rarity.COMMON, onSelf((_battle, unit) => unit.hearts.give(new Heart(BLUE_HEART)), "+1 cœur bleu"))

export const RAMPART = new ActionCard("Rempart", [
    "Donne ", new HeartCount(1), " ", BLUE_HEART, " à chaque allié à ", RAMPART_RADIUS, " ", DISTANCE, " autour, soi compris.",
], Rarity.RARE, onCircle(
    RAMPART_RADIUS, (unit, other) => other.team === unit.team,
    (_battle, _unit, other) => other.hearts.give(new Heart(BLUE_HEART)), "+1 cœur bleu",
))

export const EXPLOSIVE_SHELL = new ActionCard("Carapace explosive", [
    "Gagne ", new HeartCount(1), " ", EXPLOSIVE_HEART, ".",
], Rarity.RARE, onSelf((_battle, unit) => unit.hearts.give(new Heart(EXPLOSIVE_HEART)), "+1 cœur explosif"))
