import { FUSION, UNIT } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import type { Card } from "../../../card/Card"
import { beastBodyOf } from "../../../card/subs/beast/BeastRewrites"
import { collageOf } from "../../../card/subs/composite/ChainRewrites"
import { CompositeCard } from "../../../card/subs/composite/CompositeCard"
import { BLINK } from "../../../card/subs/movement/Blink"
import { STEP } from "../../../card/subs/movement/Step"

import { AbstractItem } from "../AbstractItem"

/** A card with every step it holds, at any depth, become a blink: the card itself when it holds none. */
function winged(card: Card): Card {
    if(card === STEP) return BLINK
    if(!(card instanceof CompositeCard)) return card
    const contents = card.contents.map(winged)
    return contents.some((each, index) => each !== card.contents[index]) ? card.with(contents) : card
}

/** Wings: every step of the chain, once rewritten, is a blink. */
export class Wings extends AbstractItem {


    constructor(){
        super("Ailes", visual("items/boots"), [
            "Chaque Avancer de ta chaîne, même au sein d'une fusion, devient un Blink.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(unit.onPrep.add(() => {
            const { chain } = unit
            for(let index = chain.cursor; index < chain.cards.length; index++){
                const card = chain.cards[index]
                const changed = winged(card)
                if(changed !== card) battle.replaceInChain(unit, index, 1, changed)
            }
        }))
    }
}

export const WINGS = new Wings()

/** A soul lantern: an enemy dying during the turn of its unit leaves it what it had yet to play. */
export class SoulLantern extends AbstractItem {


    constructor(){
        super("Lanterne à âme", visual("items/amulet"), [
            "Quand une ", UNIT, " ennemie meurt pendant ton tour, reçois un ", FUSION.as("collage"),
            " temporaire des cartes qu'elle n'avait pas encore jouées.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.unitDied.add(({ unit: dead }) => {
            if(battle.phase !== "execution" || battle.actor !== unit || dead.team === unit.team) return
            const left = dead.unplayed()
            if(left.length > 0) battle.giveFleetingCard(unit, collageOf(left))
        }))
    }
}

export const SOUL_LANTERN = new SoulLantern()

/** A fang necklace: a beast it summoned dying leaves its run and its bite in the hand. */
export class FangNecklace extends AbstractItem {


    constructor(){
        super("Collier de crocs", visual("items/fang"), [
            "Quand une de tes bêtes invoquées meurt, reçois un ", FUSION.as("collage"),
            " temporaire de sa course et de sa morsure.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.unitDied.add(({ unit: dead }) => {
            if(dead.owner !== unit) return
            const body = beastBodyOf(dead)
            if(body) battle.giveFleetingCard(unit, collageOf([...body.run, ...body.bite]))
        }))
    }
}

export const FANG_NECKLACE = new FangNecklace()
