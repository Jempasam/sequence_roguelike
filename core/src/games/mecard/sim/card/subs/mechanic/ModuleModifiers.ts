import type { Text } from "../../../../../../semantic"
import type { Card } from "../../Card"
import { MODULE } from "../../CardType"
import type { Module } from "../../CardType"
import { Rarity } from "../../Rarity"
import type { Unit } from "../../../battle/Unit"
import { Heart } from "../../../heart/Heart"
import { SHIELD_HEART } from "../../../heart/subs/ShieldHeartKind"

import { AbstractCard } from "../AbstractCard"
import { BlowCard } from "../attack/BlowCard"
import { THRUST_CHARGE } from "../attack/Charges"
import { AIM } from "../movement/Aim"
import { STEP, StepCard } from "../movement/Step"
import { BLOCK } from "../status/StatusCards"

/** A card taking a module and giving it changed: a part fitted on a machine. */
export class ModuleModifierCard extends AbstractCard<Module, Module> {


    public readonly output = MODULE
    public readonly input = MODULE

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** The cards it gives for the cards it takes, the cards drawn at random drawn with the chance given. */
        public readonly change: (
            cards: readonly Card[], pick: <T>(options: readonly T[]) => T,
        ) => readonly Card[],

        /** What it adds to the body built, nothing by default. */
        public readonly tune: (body: Unit) => void = () => {},
    ){
        super(name, description, rarity)
    }


    public get(module: Module): Module {
        return {
            cards: pick => this.change(module.cards(pick), pick),
            tune: body => {
                module.tune(body)
                this.tune(body)
            },
        }
    }
}

/** The cards in a random order, drawn one by one with the chance given. */
function shuffled(cards: readonly Card[], pick: <T>(options: readonly T[]) => T): Card[] {
    const rest = [...cards]
    const mixed: Card[] = []
    while(rest.length > 0){
        const card = pick(rest)
        mixed.push(card)
        rest.splice(rest.indexOf(card), 1)
    }
    return mixed
}

export const THRUSTERS = new ModuleModifierCard("Propulseurs", [
    "Module : ajoute Avancer en tête.",
], Rarity.RARE, cards => [STEP, ...cards])

export const ARMOR_PLATING = new ModuleModifierCard("Blindage", [
    "Module : ajoute Blocage en fin de module ; le robot gagne un cœur de bouclier.",
], Rarity.RARE, cards => [...cards, BLOCK], body => body.hearts.give(new Heart(SHIELD_HEART)))

export const TURBO = new ModuleModifierCard("Turbo", [
    "Module : chaque Avancer devient une Charge d'estoc.",
], Rarity.RARE, cards => cards.map(card => card instanceof StepCard ? THRUST_CHARGE : card))

export const HOMING_HEAD = new ModuleModifierCard("Tête chercheuse", [
    "Module : ajoute Viser avant chaque attaque.",
], Rarity.RARE, cards => cards.flatMap(card => card instanceof BlowCard ? [AIM, card] : [card]))

export const MODULE_MIXER = new ModuleModifierCard("Mélangeur", [
    "Module : mélange l'ordre des cartes au hasard.",
], Rarity.RARE, (cards, pick) => shuffled(cards, pick))

export const RECYCLING = new ModuleModifierCard("Recyclage", [
    "Module : retire la première carte.",
], Rarity.RARE, cards => cards.slice(1))

export const REPEATER = new ModuleModifierCard("Répétiteur", [
    "Module : duplique la dernière carte.",
], Rarity.RARE, cards => cards.length > 0 ? [...cards, cards[cards.length - 1]] : cards)

export const INVERTER = new ModuleModifierCard("Inverseur", [
    "Module : inverse l'ordre des cartes.",
], Rarity.RARE, cards => [...cards].reverse())

export const MODULE_CORE = new ModuleModifierCard("Cœur de module", [
    "Module : ajoute Blocage en tête.",
], Rarity.RARE, cards => [BLOCK, ...cards])
