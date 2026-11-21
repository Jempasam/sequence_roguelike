import { concat, Keyword } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import {
    AGILITE, ALLONGE, CARTE, FEBRILE, FUSION, DECK, COMPOSITE, DISTANCE, FORCE, INVOCATION, MERGE, PERFECT_CLONE, PORTEE,
    PRECISION, RANDOM, SUPPRESSION, UNIT,
} from "../../sim/base/keywords"
import { DamageType } from "../../sim/battle/DamageType"
import { AbstractCard } from "../../sim/card/subs/AbstractCard"
import { AbstractHeartKind } from "../../sim/heart/subs/AbstractHeartKind"
import { AbstractItem } from "../../sim/item/subs/AbstractItem"
import { StatusPotion } from "../../sim/potion/subs/StatusPotion"
import { boosterPoolsText } from "../../sim/catalog/boosters"
import type { Booster } from "../../sim/catalog/boosters"
import type { FightType } from "../../sim/fight/FightType"
import type { HazardType } from "../../sim/hazard/HazardType"
import { AbstractProcess } from "../../sim/process/AbstractProcess"
import type { Process } from "../../sim/process/Process"
import { StatusType } from "../../sim/status/Status"
import type { Status } from "../../sim/status/Status"
import { AbstractUsable } from "../../sim/usable/subs/AbstractUsable"

/** What the interface says of each keyword. */
const KEYWORD_HELP: ReadonlyMap<Keyword, Text> = new Map<Keyword, Text>([
    [COMPOSITE, [
        "Une ", COMPOSITE, " est une ", CARTE, " faite d'autres ", CARTE.as("cartes"), " et qui ne prend la place que d'une",
        " seule : un ", FUSION, ", un ", MERGE, ", ou un ", RANDOM, ".",
    ]],
    [RANDOM, [
        "Deux ", CARTE.as("cartes"), " qui prennent et donnent la même chose : à la fin de la préparation, l'une",
        " des deux est tirée au ", RANDOM, " et remplace le ", RANDOM, ".",
    ]],
    [FUSION, [
        "Des ", CARTE.as("cartes"), " ", FUSION.as("collées"), " ne prennent la place que d'une seule ", CARTE,
        " dans la chaîne. À la fin de la préparation, elles la remplacent, dans l'ordre, et se lisent comme si",
        " elles étaient posées là, avec leurs voisines.",
    ]],
    [MERGE, [
        "Deux ", CARTE.as("cartes"), " d'action ", MERGE.as("mélangées"), " sont jouées en même temps, en une",
        " seule étape. Les ", CARTE.as("cartes"), " d'action se ", MERGE.as("mélangent"),
        " si elles ne prennent rien, ou toutes la même chose : le mélange la prend alors, et la donne à chacune.",
    ]],
    [CARTE, ["Ce qu'une ", UNIT, " pioche, pose dans sa chaîne, puis joue."]],
    [UNIT, ["Tout ce qui se tient dans l'arène : héros, monstres, dangers."]],
    [SUPPRESSION, [
        "Une ", CARTE, " ", SUPPRESSION.as("supprimée"), " quitte le ", DECK, " pour le reste de la run.",
    ]],
    [DECK, [
        "La réserve de ", CARTE.as("cartes"), " d'une ", UNIT, ". Les ", CARTE.as("cartes"), " jouées vont à sa",
        " défausse. Quand sa pioche est vide, sa défausse est rebattue et redevient sa pioche ; un ", DECK,
        " ordonné la reprend dans l'ordre joué. Avec plusieurs ", DECK.as("decks"), ", on pioche dans chacun à",
        " tour de rôle, en passant ceux qui sont vides, et une ", CARTE, " retourne toujours à la défausse de son ",
        DECK, ".",
    ]],
    [INVOCATION, [
        "Une ", UNIT, " ", INVOCATION.as("invoquée"), " apparaît juste devant son invocateur, ou sur ses côtés si",
        " la place est prise, jamais derrière. Elle joue juste après lui dans l'ordre de tour, est contrôlée par",
        " un bot, et frappe ou se fait frapper comme toute ", UNIT, ". Sans place, rien n'apparaît.",
    ]],
    [PERFECT_CLONE, [
        "Un ", PERFECT_CLONE, " a la même chaîne, pour ce qui reste à jouer, le même ", DECK, ", la même main,",
        " les mêmes stats, objets et statuts que son modèle. Seuls ses cœurs sont à lui. Il reste jusqu'à sa",
        " mort, et compte pour son équipe.",
    ]],
    [DISTANCE, ["Des mètres dans l'arène. Une case de l'arène fait 1 ", DISTANCE, "."]],
    [FORCE, ["Influence les ", DamageType.PHYSICAL, " des coups au corps à corps."]],
    [PRECISION, ["Influence les ", DamageType.PHYSICAL, " des tirs."]],
    [AGILITE, [
        "Influence la ", DISTANCE, " des déplacements : pas, dash, téléportation. Les déplacements subis",
        " (poussée, charme) gardent la leur.",
    ]],
    [PORTEE, [
        "Influence la ", DISTANCE, " des lancers, tirs et crochets : bombe, potion, harpon.",
    ]],
    [ALLONGE, ["Influence la ", DISTANCE, " des coups au corps à corps : coup d'épée, estoc, dague."]],
    [FEBRILE, ["Se dit d'une ", UNIT, " dont la moitié des cœurs, ou plus, sont vides."]],
])

/** What the interface says of each type of damage. */
const DAMAGE_HELP: ReadonlyMap<DamageType, Text> = new Map<DamageType, Text>([
    [DamageType.PHYSICAL, ["Des cœurs perdus, que l'esquive et la garde peuvent éviter."]],
    [DamageType.ELEMENTAL, ["Des cœurs perdus, que l'esquive ne peut pas éviter : feu, poison, magie."]],
])

/** A thing of the game telling what it does through a description. */
type Described = AbstractCard<unknown, unknown>|AbstractItem|AbstractUsable|StatusPotion

function isDescribed(value: object): value is Described {
    return value instanceof AbstractCard || value instanceof AbstractItem || value instanceof AbstractUsable
        || value instanceof StatusPotion
}

/** How the player is told what a status is to its unit. */
export const POLARITY_WORDS = { negative: "négatif", positive: "positif", neutral: "neutre" } as const

/** What a status kind is, for the player: `name X (polarity) : description`, X standing for its level. */
export function statusTypeText(type: StatusType, level?: number): Text {
    const shown = level === undefined ? [] : [" ", level]
    return concat(type, ...shown, " (", POLARITY_WORDS[type.polarity], ") : ",
        level === undefined ? type.description : type.describe(level))
}

/** What a process is, for the player. */
export function processText(process: Process): Text {
    return concat("Processus ", process, " : ", process.description, " Jusqu'à la fin du round.")
}

function isBooster(value: object): value is Booster {
    return "pools" in value && "icon" in value && "color" in value
}

function isHazardType(value: object): value is HazardType {
    return typeof (value as Partial<HazardType>).lay === "function" && "bodies" in value
}

function isFightType(value: object): value is FightType {
    return typeof (value as Partial<FightType>).populate === "function" && "category" in value
}

function isStatus(value: object): value is Status {
    return (value as Partial<Status>).type instanceof StatusType && typeof (value as Partial<Status>).level === "number"
}

/** What the interface can say of an object named in a text, none when it has nothing to add to its name. */
export function explanationOf(value: object): Text|undefined {
    if(value instanceof Keyword) return KEYWORD_HELP.get(value)
    if(value instanceof StatusType) return statusTypeText(value)
    if(isStatus(value)) return statusTypeText(value.type, value.level)
    if(value instanceof AbstractProcess) return processText(value)
    if(isBooster(value)) return concat(value, " : ", boosterPoolsText(value))
    if(isHazardType(value) || isFightType(value)) return concat(value, " : ", value.description)
    if(value instanceof DamageType) return DAMAGE_HELP.get(value)
    if(value instanceof AbstractHeartKind) return concat("Cœur ", value, " : ", value.description)
    return isDescribed(value) ? concat(value, " : ", value.description) : undefined
}
