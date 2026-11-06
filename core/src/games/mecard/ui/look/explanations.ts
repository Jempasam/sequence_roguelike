import { concat, Keyword } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import { CARTE, FUSION, DECK, COMPOSITE, INVOCATION, MERGE, PERFECT_CLONE, RANDOM, SUPPRESSION, UNIT } from "../../sim/base/keywords"
import { AbstractCard } from "../../sim/card/subs/AbstractCard"
import { AbstractHeartKind } from "../../sim/heart/subs/AbstractHeartKind"
import { AbstractItem } from "../../sim/item/subs/AbstractItem"
import { StatusPotion } from "../../sim/potion/subs/StatusPotion"
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
        " seule étape. Seules les ", CARTE.as("cartes"), " d'action qui ne prennent rien se ",
        MERGE.as("mélangent"), ".",
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
])

/** A thing of the game telling what it does through a description. */
type Described = AbstractCard<unknown, unknown>|AbstractItem|AbstractUsable|StatusPotion

function isDescribed(value: object): value is Described {
    return value instanceof AbstractCard || value instanceof AbstractItem || value instanceof AbstractUsable
        || value instanceof StatusPotion
}

/** What the interface can say of an object named in a text, none when it has nothing to add to its name. */
export function explanationOf(value: object): Text|undefined {
    if(value instanceof Keyword) return KEYWORD_HELP.get(value)
    if(value instanceof AbstractHeartKind) return concat("Cœur ", value, " : ", value.description)
    return isDescribed(value) ? concat(value, " : ", value.description) : undefined
}
