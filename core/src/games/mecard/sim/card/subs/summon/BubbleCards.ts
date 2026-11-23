import { DISTANCE, BATTLE_ROUND } from "../../../base/keywords"
import type { Unit } from "../../../battle/Unit"
import { HeartCount } from "../../../battle/words"
import { TIME_HEART } from "../../../heart/subs/TimeHeartKind"
import * as Previews from "../../../battle/preview/Previews"
import { NOTE_COLOR } from "../../../battle/previewColors"
import type { Battle } from "../../../battle/Battle"
import { BUBBLE, BULLE, SOAPY } from "../../../status/subs/BubbleStatuses"
import { MOMENTUM } from "../../../status/subs/Momentum"
import { Rarity } from "../../Rarity"

import { ActionCard } from "../ActionCard"
import { DrawnCard, RewriteCard } from "../composite/RewriteCards"
import { FusionCard } from "../composite/FusionCard"
import { DOUBLE_DIAGONAL } from "../modifier/DoubleDiagonal"
import { FIRE } from "../spell/ElementCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { placeChainSummon } from "./ChainSummons"
import {
    BEAST_BUBBLE, BLUE_BUBBLE, bubbleLook, bubbleSummon, ELEMENTAL_BUBBLE, EXPLOSIVE_BUBBLE, GIANT_BUBBLE, GREEN_BUBBLE,
    ORANGE_BUBBLE, POTION_BUBBLE, raiseSoapy, RED_BUBBLE, VIOLET_BUBBLE,
} from "./Bubbles"

/** How many rounds of soapiness an inspiration gives at least. */
const INSPIRED_ROUNDS = 3

/** How many levels of bubble a blowing up gives each bubble. */
const INFLATION = 4

/** How far the bubbles are pushed, in meters. */
const PISTO_PUSH = 2

/** The bubbles a unit commands as its own: the bodies it summoned that are bubbles. */
function bubblesOf(battle: Battle, unit: Unit): Unit[] {
    return battle.summonsOf(unit).filter(body => body.alive && body.statuses.has(BUBBLE))
}

/** Soapiness to at least three rounds, at the end of the preparation. */
export const INSPIRATION = new RewriteCard("Inspiration", [
    "Fin de préparation : ton ", SOAPY, " monte à ", INSPIRED_ROUNDS, " ", BATTLE_ROUND.as("rounds"), " au moins. Les ", BULLE.as("bulles"),
    " déjà posées copient dès le premier pas.",
], Rarity.RARE, () => ({ cards: [], consumed: 0, acting: true }), ({ battle, unit }) => {
    raiseSoapy(battle, unit, INSPIRED_ROUNDS)
})

/** Four levels of bubble to each of the bubbles of the unit. */
export const INFLATE = new RewriteCard("Gonflage", [
    "Fin de préparation : +", INFLATION, " niveaux de ", BULLE.as("bulle"), " à toutes tes bulles.",
], Rarity.RARE, () => ({ cards: [], consumed: 0, acting: true }), ({ battle, unit }) => {
    for(const bubble of bubblesOf(battle, unit)) battle.applyStatus(bubble, BUBBLE, INFLATION)
})

/** A bubble among the ones that fit its place, at random. */
export const SURPRISE_BUBBLE = new DrawnCard("Bulle surprise", [
    "Fin de préparation : devient une ", BULLE.as("bulle"), " tirée au hasard parmi celles qui tiennent à sa place.",
], Rarity.RARE, () => [
    VIOLET_BUBBLE, BLUE_BUBBLE, GREEN_BUBBLE, RED_BUBBLE, EXPLOSIVE_BUBBLE, ORANGE_BUBBLE, GIANT_BUBBLE,
    ELEMENTAL_BUBBLE, POTION_BUBBLE, BEAST_BUBBLE,
])

/** A blue bubble, then a violet one: the blue goes ahead before the violet comes. */
export const BATH = new FusionCard([BLUE_BUBBLE, VIOLET_BUBBLE], { name: "Bain", rarity: Rarity.RARE })

/** An explosive bubble at the left, another at the right. */
export const EXPLOSIVE_BATH = new FusionCard([DOUBLE_DIAGONAL, EXPLOSIVE_BUBBLE], { name: "Bain explosif", rarity: Rarity.EPIC })

/** A bubble of fire, with no element to give. */
export const FIERY_BUBBLE = new FusionCard([ELEMENTAL_BUBBLE, FIRE], { name: "Bulle ardente", rarity: Rarity.RARE })

/** The bubbles turn where the blower faces, gain momentum, and are pushed ahead. */
export const PISTO_BUBBLE = new ActionCard("Pisto-bulle", [
    "Tourne toutes tes ", BULLE.as("bulles"), " dans ta direction, leur donne de l'", MOMENTUM, " et les pousse de ", PISTO_PUSH,
    " ", DISTANCE, ". Une bulle arrêtée par une unité éclate.",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        for(const bubble of bubblesOf(battle, unit)){
            battle.turn(bubble, unit.direction)
            battle.applyStatus(bubble, MOMENTUM, 1)
            battle.push(bubble, unit.direction, PISTO_PUSH, unit)
        }
        hold(battle, SHORT_TIME)
    },
    preview: ({ pose }) => Previews.still(pose, Previews.label(pose.position, "pisto-bulle", NOTE_COLOR)),
})

/** All the bubbles of the unit burst, wherever they are. */
export const BURSTING = new ActionCard("Éclatement", [
    "Fait éclater toutes tes ", BULLE.as("bulles"), ", où qu'elles soient : les explosives explosent.",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        for(const bubble of bubblesOf(battle, unit)) bubble.hearts.slay(null)
        hold(battle, SHORT_TIME)
    },
    preview: ({ pose }) => Previews.still(pose, Previews.label(pose.position, "éclatement", NOTE_COLOR)),
})

/** A bubble that plays the cards that follow in the chain of its blower, which plays none of them. */
export const PROGRAMMED_BUBBLE = new ActionCard("Bulle programmée", [
    "Invoque devant toi une ", BULLE.as("bulle"), " de ", new HeartCount(2), " de ", TIME_HEART, ", qui joue les cartes qui suivent dans ta chaîne. ",
    "Tu ne les joues pas : elles vont à la défausse.",
], Rarity.EPIC, {
    use: function ({ battle, unit }){
        const cards = battle.cutChain(unit, unit.chain.cursor)
        if(cards.length > 0){
            placeChainSummon(battle, unit, bubbleSummon({
                name: "Bulle programmée", sprite: bubbleLook("programmed"), lives: 2, cards,
            }))
        }
        hold(battle, SHORT_TIME)
    },
    preview: ({ pose }) => Previews.still(pose, Previews.label(pose.position, "programmée", NOTE_COLOR)),
})
