import { UNIT } from "../../../base/keywords"
import { BLUE_HEART } from "../../../heart/subs/BlueHeartKind"
import { EXPLOSIVE_HEART } from "../../../heart/subs/ExplosiveHeartKind"
import { Heart } from "../../../heart/Heart"
import { Grievance, WeakeningBlows } from "../../../process/subs/Grievance"
import { BLEEDING, FRAGILE, MARKED } from "../../../status/subs/Wounds"
import { CONCENTRATED, FURIOUS } from "../../../status/subs/Calm"
import { PHYSICAL_COLOR, RANGE_COLOR } from "../../../battle/previewColors"
import { meters } from "../../../battle/words"
import type { Action } from "../../../battle/Action"
import type { StatusType } from "../../../status/Status"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { polygon, still } from "../tools/previews"
import { ahead, onCircle, onFirstAhead, onSelf, ring } from "../tools/targeting"
import { Rarity } from "../../Rarity"

/** The reach of the weakening blows: a short wide band ahead. */
const WEAKENING_LENGTH = 1.5
const WEAKENING_WIDTH = 0.8

/** The segment of the marks and of the fragility: the mark reaches farther, the fragility is a dagger's. */
const MARK_LENGTH = 1.5
const MARK_WIDTH = 0.4
const DAGGER_LENGTH = 1.1
const DAGGER_WIDTH = 0.4

/** How many rounds a mark waits for the attack that is doubled. */
const MARK_ROUNDS = 3

/** How far the rampart reaches around its unit, in meters. */
const RAMPART_RADIUS = 1.5

/** An action of the unit on itself, giving a status of a level. */
function giving(type: StatusType, level: number, what: string): Action {
    return onSelf((battle, unit) => battle.applyStatus(unit, type, level), what)
}

export const CONCENTRATION = new ActionCard("Concentration", [
    "Gagne un round de concentration : chaque Attendre en ajoute un, et chaque round restant donne un mètre de ",
    "vision et un quart de mètre de portée.",
], Rarity.RARE, giving(CONCENTRATED, 1, "+1 concentration"))

export const HELD_FURY = new ActionCard("Fureur contenue", [
    "Gagne un round de fureur : chaque Attendre en ajoute un, et chaque round restant donne un point de force.",
], Rarity.RARE, giving(FURIOUS, 1, "+1 fureur"))

export const COOL_HEAD = new ActionCard("Sang froid", [
    "Retire tous ses status négatifs, et gagne un round de concentration pour chacun.",
], Rarity.RARE, onSelf((battle, unit) => {
    const bad = [...unit.statuses.keys()].filter(type => type.polarity === "negative")
    for(const type of bad) battle.removeStatus(unit, type)
    if(bad.length > 0) battle.applyStatus(unit, CONCENTRATED, bad.length)
}, "sang froid"))

export const WEAKENING_BLOWS = new ActionCard("Coups affaiblissant", [
    "Les ", UNIT.as("unités"), " touchées sur ", meters(WEAKENING_LENGTH), " devant, jusqu'à la fin du round, ",
    "prennent un écho de 1 + force à chaque blessure.",
], Rarity.RARE, {
    use: function* ({ battle, unit }){
        const area = ahead(unit, WEAKENING_LENGTH, WEAKENING_WIDTH)
        for(const target of battle.unitsIn(area, unit)){
            battle.startProcess(target, new WeakeningBlows(1 + unit.stats.strength.value))
        }
        yield* hold(battle, SHORT_TIME, [polygon(area, PHYSICAL_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        const area = ahead(pose, WEAKENING_LENGTH, WEAKENING_WIDTH)
        return still(pose, polygon(area, RANGE_COLOR), ...battle.unitsIn(area, unit).map(ring))
    },
})

export const MARK_CARD = new ActionCard("Marque", [
    "Marque la première ", UNIT, " touchée sur ", meters(MARK_LENGTH), " : la prochaine attaque qui la blesse ",
    "inflige le double.",
], Rarity.RARE, onFirstAhead(MARK_LENGTH, MARK_WIDTH, (battle, _unit, target) => {
    battle.applyStatus(target, MARKED, MARK_ROUNDS)
}, "marquée"))

export const FRAGILITY_CARD = new ActionCard("Fragilité", [
    "La première ", UNIT, " touchée sur ", meters(DAGGER_LENGTH), " prend un cœur de plus à chaque blessure, ",
    "autant de rounds que la force.",
], Rarity.RARE, onFirstAhead(DAGGER_LENGTH, DAGGER_WIDTH, (battle, unit, target) => {
    battle.applyStatus(target, FRAGILE, Math.max(1, unit.stats.strength.value))
}, "fragile"))

export const BLEED = new ActionCard("Saignement", [
    "La première ", UNIT, " touchée sur ", meters(DAGGER_LENGTH), " gagne un round de saignement : chaque ",
    "déplacement lui coûte un cœur.",
], Rarity.COMMON, onFirstAhead(DAGGER_LENGTH, DAGGER_WIDTH, (battle, _unit, target) => {
    battle.applyStatus(target, BLEEDING, 1)
}, "saigne"))

export const HEMORRHAGE = new ActionCard("Hémorragie", [
    "Double les rounds de saignement de la première ", UNIT, " touchée sur ", meters(DAGGER_LENGTH), ".",
], Rarity.RARE, onFirstAhead(DAGGER_LENGTH, DAGGER_WIDTH, (battle, _unit, target) => {
    const bleeding = target.statuses.get(BLEEDING)
    if(bleeding) battle.applyStatus(target, BLEEDING, bleeding.level)
}, "saignement ×2"))

export const GRUDGE = new ActionCard("Rancune", [
    "Jusqu'à la fin du round, chaque blessure subie donne un round d'énergie démoniaque.",
], Rarity.RARE, onSelf((battle, unit) => battle.startProcess(unit, new Grievance()), "rancune"))

export const BLOCK = new ActionCard("Blocage", [
    "Gagne un cœur bleu.",
], Rarity.COMMON, onSelf((_battle, unit) => unit.hearts.give(new Heart(BLUE_HEART)), "+1 cœur bleu"))

export const RAMPART = new ActionCard("Rempart", [
    "Donne un cœur bleu à chaque allié à ", meters(RAMPART_RADIUS), " autour, soi compris.",
], Rarity.RARE, onCircle(
    RAMPART_RADIUS, (unit, other) => other.team === unit.team,
    (_battle, _unit, other) => other.hearts.give(new Heart(BLUE_HEART)), "+1 cœur bleu",
))

export const EXPLOSIVE_SHELL = new ActionCard("Carapace explosive", [
    "Gagne un cœur explosif.",
], Rarity.RARE, onSelf((_battle, unit) => unit.hearts.give(new Heart(EXPLOSIVE_HEART)), "+1 cœur explosif"))
