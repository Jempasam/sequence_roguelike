import type { UnitContext } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { meters } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { TIME_HEART } from "../../../heart/subs/TimeHeartKind"
import { MODULE } from "../../../card/CardType"
import type { Card } from "../../../card/Card"
import { FISHING } from "../../../card/subs/attack/Crosses"
import { placeChainSummon, DECOY, TURRET } from "../../../card/subs/summon/ChainSummons"
import { turnUnitsIn } from "../../../card/subs/tools/turning"
import { UNIT } from "../../../base/keywords"
import { ModuleCard } from "../../../card/subs/mechanic/ModuleCard"
import { FusionCard } from "../../../card/subs/composite/FusionCard"
import { canMerge, MergedCard } from "../../../card/subs/composite/MergedCard"

import { AbstractUsable } from "../AbstractUsable"
import { visual } from "../../../base/Visual"

/** How far around its unit the whistle reaches, in meters. */
const WHISTLE_RADIUS = 1.5

/** Does a body play a chain of its own this round, as a robot or a turret does? */
function playsCards(battle: Battle, body: Unit): boolean {
    return (battle.planOf(body)?.cards.length ?? 0) > 0
}

/** Engine oil: the chains of the robots of its unit are played twice this round. */
export class EngineOil extends AbstractUsable {


    constructor(){
        super("Huile de moteur", visual("usables/energizer"), ["Ce round, chaque robot joue sa chaîne deux fois de suite."])
    }


    protected act({ battle, unit }: UnitContext): void {
        for(const body of battle.summonsOf(unit)) if(playsCards(battle, body)) battle.repeatChain(body)
    }
}

export const ENGINE_OIL = new EngineOil()

/** A wrench: a copy of a part, drawn at random among those its unit holds, goes to its hand. */
export class Wrench extends AbstractUsable {


    constructor(){
        super(
            "Clé à molette", visual("usables/mixer"),
            ["Ajoute à ta main un module de ta main, ton deck ou ta défausse, tiré au hasard. 2 utilisations, rechargées à chaque combat."],
            { charges: 2, refill: "battle" },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        const held: Card[] = [...unit.hand, ...unit.decks.all.flatMap(deck => [...deck.pile, ...deck.discard])]
        const parts = held.filter(card => card.input === MODULE && card.output === MODULE)
        const part = battle.rng.pick(parts)
        if(part) battle.giveCard(unit, part)
    }
}

export const WRENCH = new Wrench()

/** A magic watch: the last step of the chain plays once more. */
export class MagicWatch extends AbstractUsable {


    constructor(){
        super(
            "Montre magique", visual("usables/energizer"),
            ["La dernière étape de la chaîne est jouée une fois de plus. 2 utilisations, rechargées à chaque combat."],
            { charges: 2, refill: "battle" },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        battle.duplicateLastStep(unit)
    }
}

export const MAGIC_WATCH = new MagicWatch()

/** A fishing card: a Fishing in the hand. */
export class FishingCard extends AbstractUsable {


    constructor(){
        super("Carte de pêche", visual("usables/thrust_bottle"), ["Ajoute ", FISHING, " à ta main. 2 utilisations."], { charges: 2 })
    }


    protected act({ battle, unit }: UnitContext): void {
        battle.giveCard(unit, FISHING)
    }
}

export const FISHING_CARD = new FishingCard()

/** A whistle: the units around turn to face its unit. */
export class Whistle extends AbstractUsable {


    constructor(){
        super(
            "Sifflet", visual("usables/energizer"),
            [
                "Tourne chaque ", UNIT, " à ", meters(WHISTLE_RADIUS), " autour vers toi. 2 utilisations, rechargées à chaque combat.",
            ],
            { charges: 2, refill: "battle" },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        turnUnitsIn(
            battle, { kind: "circle", center: unit.position, radius: WHISTLE_RADIUS }, unit,
            other => unit.position.minus(other.position).normalized,
        )
    }
}

export const WHISTLE = new Whistle()

/** A folding turret: a turret set down ahead. */
export class FoldingTurret extends AbstractUsable {


    constructor(){
        super("Tourelle pliable", visual("usables/plant_bag"), ["Pose ", TURRET, " à un mètre devant toi. 2 utilisations."], { charges: 2 })
    }


    protected act({ battle, unit }: UnitContext): void {
        placeChainSummon(battle, unit, TURRET.summon)
    }
}

export const FOLDING_TURRET = new FoldingTurret()

/** An inflatable decoy: a decoy set down ahead. */
export class InflatableDecoy extends AbstractUsable {


    constructor(){
        super(
            "Leurre gonflable", visual("usables/plant_bag"),
            ["Pose ", DECOY, " à un mètre devant toi. Rechargé à chaque combat."], { refill: "battle" },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        placeChainSummon(battle, unit, DECOY.summon)
    }
}

export const INFLATABLE_DECOY = new InflatableDecoy()

/** A battery: a round of time more for each body of its unit that lives by time. */
export class Battery extends AbstractUsable {


    constructor(){
        super(
            "Batterie", visual("usables/energizer"),
            ["Donne un cœur de temps de plus à chaque invocation et robot qui en a. 2 utilisations, rechargées à chaque combat."],
            { charges: 2, refill: "battle" },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        for(const body of battle.summonsOf(unit)){
            if(body.hearts.all.some(heart => heart.kind === TIME_HEART)) body.hearts.give(new Heart(TIME_HEART))
        }
    }
}

export const BATTERY = new Battery()

/** A leather bag: the cards of the chain of the first unit its unit kills are its own for good. */
export class LeatherBag extends AbstractUsable {


    constructor(){
        super(
            "Sac en cuir", visual("usables/plant_bag"),
            ["Pour le combat : la première ", UNIT, " que tu tues te donne toutes les cartes de sa chaîne, pour de bon."],
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        const watching = unit.killed.add(({ unit: dead }) => {
            watching.remove()
            // The chain it had that round, composites kept whole.
            battle.giveCards(unit, [...dead.chain.cards])
        })
    }
}

export const LEATHER_BAG = new LeatherBag()

/** The cards of the chain of a unit it has not played yet, as they are once rewritten. */
function chainLeft(unit: Unit): Card[] {
    return unit.chain.cards.slice(unit.chain.cursor)
}

/** A mechanical clone: a module playing the chain of its unit, its own for good. */
export class MechanicalClone extends AbstractUsable {


    constructor(){
        super("Clone mécanique", visual("usables/mechanical_clone"), [
            "Ajoute pour de bon à ton deck un module qui joue ta chaîne actuelle.",
        ])
    }


    protected act({ battle, unit }: UnitContext): void {
        const cards = chainLeft(unit)
        if(cards.length > 0) battle.giveCards(unit, [new ModuleCard("Module cloné", cards)])
    }
}

export const MECHANICAL_CLONE = new MechanicalClone()

/** A tube of glue: a collage of the chain of its unit, its own for good. */
export class GlueTube extends AbstractUsable {


    constructor(){
        super("Tube de colle", visual("usables/glue_tube"), [
            "Ajoute pour de bon à ton deck un collage de toute ta chaîne actuelle.",
        ])
    }


    protected act({ battle, unit }: UnitContext): void {
        const cards = chainLeft(unit)
        if(cards.length >= 2) battle.giveCards(unit, [new FusionCard(cards)])
    }
}

export const GLUE_TUBE = new GlueTube()

/**
 * Cocaine: the cards of the chain of its unit merged two by two, from left to right, wherever two that may be
 * merged follow each other.
 */
export class Cocaine extends AbstractUsable {


    constructor(){
        super("Cocaïne", visual("usables/cocaine"), [
            "Mélange deux par deux les cartes d'action qui se suivent dans ta chaîne. Rechargée à chaque combat.",
        ], { refill: "battle" })
    }


    protected act({ battle, unit }: UnitContext): void {
        const { chain } = unit
        let at = chain.cursor
        while(at + 1 < chain.cards.length){
            const [first, second] = [chain.cards[at], chain.cards[at + 1]]
            if(canMerge(first) && canMerge(second)) battle.replaceInChain(unit, at, 2, new MergedCard([first, second]))
            at++
        }
    }
}

export const COCAINE = new Cocaine()

/** A time pocket: the chain of its unit fused into one card, to its hand for the battle, and played no more. */
export class TimePocket extends AbstractUsable {


    constructor(){
        super("Poche temporelle", visual("usables/time_pocket"), [
            "Vide ta chaîne et ajoute à ta main pour ce combat une fusion de toutes ses cartes. 2 utilisations, ",
            "rechargées à chaque combat.",
        ], { charges: 2, refill: "battle" })
    }


    protected act({ battle, unit }: UnitContext): void {
        const cards = chainLeft(unit)
        if(cards.length === 0) return
        battle.cutChain(unit, unit.chain.cursor)
        battle.giveCard(unit, cards.length === 1 ? cards[0] : new FusionCard(cards))
    }
}

export const TIME_POCKET = new TimePocket()
