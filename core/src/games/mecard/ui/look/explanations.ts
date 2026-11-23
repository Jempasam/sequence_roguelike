import { concat, joinText, Keyword, plainText } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import {
    ADVENTURER, AGILITE, ALLONGE, BATTLE_ROUND, BATTLE_TURN, BOOSTER, CARTE, COMPOSITE, DECK, DISTANCE,
    ALCHEMY, FEBRILE, FIGHT, FLOOR, FORCE, FUSION, GOLD, HALT, HEAL, HEART, INVOCATION, ITEM, MERGE, MONSTER,
    PERFECT_CLONE, PET, PORTEE, PRECISION, RANDOM, REWARD, SUMMON_STAT, SUPPRESSION, TRAVEL_STEP, UNIT, UPGRADE,
    USABLE,
} from "../../sim/base/keywords"
import { FIRE_ELEMENT } from "../../sim/element/subs/Fire"
import { DamageType } from "../../sim/battle/DamageType"
import { HeartCount } from "../../sim/battle/words"
import { CardType } from "../../sim/card/CardType"
import { AbstractCard } from "../../sim/card/subs/AbstractCard"
import type { CardUpgrade } from "../../sim/catalog/upgrades"
import type { Kit } from "../../sim/catalog/kits"
import type { Monster } from "../../sim/catalog/monsters"
import type { Element } from "../../sim/element/Element"
import type { FightCategory } from "../../sim/fight/FightCategory"
import type { FloorType } from "../../sim/floor/Floor"
import type { HaltType } from "../../sim/halt/HaltType"
import { AbstractElement } from "../../sim/element/AbstractElement"
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
    [GOLD, ["Ce que le groupe dépense dans les boutiques, et trouve sur sa route."]],
    [BATTLE_ROUND, [
        "Une manche du combat : chaque ", UNIT, " pose sa chaîne de ", CARTE.as("cartes"), ", puis toutes la jouent,",
        " un ", BATTLE_TURN, " après l'autre. Les statuts et les processus durent un nombre de ", BATTLE_ROUND.as("rounds"), ".",
    ]],
    [HALT, [
        "Un lieu de la carte où le groupe s'arrête : une forge, une boutique, un marchand, un choix de ",
        CARTE.as("cartes"), ".",
    ]],
    [FIGHT, ["Une rencontre sur la carte, contre des ", MONSTER.as("monstres"), " ou des ", ADVENTURER.as("aventuriers"), "."]],
    [REWARD, [
        "Ce que le groupe récupère après avoir gagné un ", FIGHT,"."
    ]],
    [MONSTER, ["Une ", UNIT, " jouée par le jeu, ses ", CARTE.as("cartes"), " jouées dans un ordre prédéfini : son ", DECK, " n'est pas mélangé."]],
    [PET, ["Comme un ", MONSTER, ", ses ", CARTE.as("cartes"), " jouées dans un ordre prédéfini, mais on ne le trouve pas en ", FIGHT, "."]],
    [ADVENTURER, [
        "Un kit : un ", DECK, ", des ", ITEM.as("objets"), " et des ", USABLE.as("utilisables"), ", et des ",
        HEART.as("cœurs"), ". Celui d'un héros du groupe.",
    ]],
    [UPGRADE, ["Une chaîne de ", CARTE.as("cartes"), " dont une est remplacée par la ", CARTE, " à améliorer."]],
    [ITEM, ["Ce qu'un héros porte et qui l'aide en permanence."]],
    [USABLE, ["Ce qu'un héros emploie quelques fois pendant un ", FIGHT, " : chaque charge est dépensée."]],
    [BOOSTER, ["Un paquet de ", CARTE.as("cartes"), " dont on garde quelques-unes."]],
    [FLOOR, ["Un niveau du donjon, avec sa propre carte d'", TRAVEL_STEP.as("étapes"), "."]],
    [TRAVEL_STEP, [
        "Un lieu de la carte d'un ", FLOOR, " : un ", FIGHT, " ou une ", HALT, ", et les ", TRAVEL_STEP.as("étapes"),
        " où l'on peut aller ensuite.",
    ]],
    [BATTLE_TURN, ["Une étape de la chaîne d'une ", UNIT, ", jouée pendant un ", BATTLE_ROUND, "."]],
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
        " les mêmes stats, ", ITEM.as("objets"), " et statuts que son modèle. Seuls ses ", HEART.as("cœurs"),
        " sont à lui. Il reste jusqu'à sa",
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
    [HEAL, ["Ajoutée aux ", HEART.as("cœurs"), " rendus par chaque soin."]],
    [SUMMON_STAT, ["Ajoutée à la vie de chaque ", UNIT, " ", INVOCATION.as("invoquée"), "."]],
    [ALCHEMY, ["Ajoutée au niveau de chaque potion."]],
    [FEBRILE, ["Se dit d'une ", UNIT, " dont la moitié des ", HEART.as("cœurs"), ", ou plus, sont vides."]],
])

/** What the interface says of each type of damage. */
const DAMAGE_HELP: ReadonlyMap<DamageType, Text> = new Map<DamageType, Text>([
    [DamageType.PHYSICAL, ["Des ", HEART.as("cœurs"), " perdus, que l'esquive et la garde peuvent éviter."]],
    [DamageType.ELEMENTAL, [
        "Des ", HEART.as("cœurs"), " perdus, que l'esquive ne peut pas éviter : ", FIRE_ELEMENT, ", poison, magie.",
    ]],
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

/** What an element is, for the player: what it does against a unit, for it, and what it calls. */
export function elementText(element: Element): Text {
    return [
        [element],
        concat("Contre : ", element.negativeText),
        concat("Pour : ", element.positiveText),
        concat("Invoque : ", element.invokedText),
    ]
}

/** A sort of place of the journey: a halt, a category of fight, a floor. */
export type PlaceSort = HaltType|FightCategory|FloorType

/** Is it a floor? It is the one sort of place with decorations. */
export function isFloorType(value: object): value is FloorType {
    return "decorations" in value && "look" in value && "name" in value && "description" in value
}

/** Is it a halt? It is the sort of place that makes a halt. */
export function isHaltType(value: object): value is HaltType {
    return typeof (value as Partial<HaltType>).create === "function" && "transition" in value && "icon" in value
        && !("populate" in value) && !isFloorType(value)
}

/** Is it a category of fight? It is a sort of place, which makes nothing. */
export function isFightCategory(value: object): value is FightCategory {
    const place = value as Partial<FightCategory>
    return typeof place.id === "string" && "transition" in value && "icon" in value && "description" in value
        && typeof (value as { create?: unknown }).create !== "function" && !isFloorType(value)
}

/** A kit: what a hero starts with. */
export function isKit(value: object): value is Kit {
    const kit = value as Partial<Kit>
    return typeof kit.name === "string" && Array.isArray(kit.cards) && Array.isArray(kit.items)
        && Array.isArray(kit.usables) && Array.isArray(kit.hearts)
}

/** An upgrade: a chain of cards with holes. */
export function isUpgrade(value: object): value is CardUpgrade {
    const upgrade = value as Partial<CardUpgrade>
    return typeof upgrade.name === "string" && Array.isArray(upgrade.chain) && typeof upgrade.fusion === "string"
}

/** A kind of monster: it tells itself, has hearts and a deck. */
export function isMonster(value: object): value is Monster {
    const monster = value as Partial<Monster>
    return typeof monster.hearts === "number" && Array.isArray(monster.cards) && typeof monster.toSemString === "function"
}

const UPGRADE_WORDS = { fusion: FUSION, merge: MERGE, random: RANDOM } as const

/** What a kit starts a hero with, for the player. */
export function kitText(kit: Kit): Text {
    const lines: Text[] = [[kit]]
    if(kit.cards.length > 0) lines.push(concat("Cartes : ", joinText([...new Set(kit.cards)], ", ")))
    if(kit.items.length > 0) lines.push(concat(ITEM.as("Objets"), " : ", joinText(kit.items, ", ")))
    if(kit.usables.length > 0) lines.push(concat(USABLE.as("Utilisables"), " : ", joinText(kit.usables, ", ")))
    return lines.length === 1 ? [kit] : lines
}

/** What an upgrade does, for the player: its chain, the improved card in the holes, and how they join. */
export function upgradeText(upgrade: CardUpgrade): Text {
    const chain = upgrade.chain.map(card => card ?? "la carte améliorée")
    return concat(upgrade, " : ", joinText(chain, ", "), " (", UPGRADE_WORDS[upgrade.fusion], ")")
}

/** What a kind of monster is, for the player. */
export function monsterText(monster: Monster): Text {
    return concat(
        monster, " : ", new HeartCount(monster.hearts), ", ", monster.cards.length, " ", CARTE.as("cartes"), " dans son ", DECK, ".",
    )
}

/** What a process is, for the player. */
export function processText(process: Process): Text {
    return concat("Processus ", process, " : ", process.description, " Jusqu'à la fin du ", BATTLE_ROUND, ".")
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
    if(value instanceof AbstractHeartKind) return concat(HEART, " ", value, " : ", value.description)
    if(value instanceof CardType){
        return plainText(value.description) === "" ? undefined : concat(value, " : ", value.description)
    }
    if(value instanceof AbstractElement) return elementText(value)
    if(isFloorType(value) || isHaltType(value) || isFightCategory(value)) return concat(value, " : ", value.description)
    if(isKit(value)) return kitText(value)
    if(isUpgrade(value)) return upgradeText(value)
    if(isMonster(value)) return monsterText(value)
    return isDescribed(value) ? concat(value, " : ", value.description) : undefined
}
