import type { Rng } from "../../../base/Rng"
import type { Card } from "../../../card/Card"
import { ACTION, ELEMENT, MODULE, POTION, PREPARATION } from "../../../card/CardType"
import { signatureOf } from "../../../card/CardChain"
import { SHOT } from "../../../card/subs/attack/Shot"
import { SLASH } from "../../../card/subs/attack/Slash"
import { SWEEP } from "../../../card/subs/attack/Sweep"
import { THRUST } from "../../../card/subs/attack/Thrust"
import { DODGE_CARD } from "../../../card/subs/combat/DodgeCard"
import { BLAST_MODULE, BOW_MODULE, BULL_MODULE, MISSILE } from "../../../card/subs/mechanic/ModuleCard"
import { IMPROVISED_ROBOT } from "../../../card/subs/mechanic/RobotCard"
import { DOUBLE_DIAGONAL } from "../../../card/subs/modifier/DoubleDiagonal"
import { REPEAT_2 } from "../../../card/subs/modifier/RepeatCard"
import { AIM } from "../../../card/subs/movement/Aim"
import { PATH_AIM } from "../../../card/subs/movement/PathAim"
import { TURN_LEFT, TURN_RIGHT } from "../../../card/subs/movement/TurnCard"
import { WAIT } from "../../../card/subs/movement/Wait"
import { THROWN_POTION } from "../../../card/subs/potion/PotionActions"
import { ELEMENT_CARDS } from "../../../card/subs/spell/ElementCard"
import { SPELL } from "../../../card/subs/spell/SpellCard"
import type { Run } from "../../../run/Run"
import { transmute } from "../../../run/visits"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { haltPnj, sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { DeckHalt } from "../DeckHalt"
import { fusionShown } from "../shown"
import { CARTE } from "../../../base/keywords"

/** What the alchemist says of itself. */
const LINE = ["Deux copies d'une ", CARTE, " ? J'en fais une seule, améliorée."]

/** How the alchemist looks. */
const LOOK = sceneLook(15, 33, 23, [
    "mecard/travel/alchemist/1.png", "mecard/travel/alchemist/2.png", "mecard/travel/alchemist/3.png",
    "mecard/travel/alchemist/4.png", "mecard/travel/alchemist/5.png",
], "mecard/travel/alchemist/border.png", haltPnj("alchemist", [0.35, 0.9, 0.45], [1, 0.8, 0.3]))

/** The blows: the attacks the alchemist doubles or plays to both diagonals. */
const BLOWS: readonly Card[] = [SHOT, SLASH, THRUST, SWEEP]

/** The cards no upgrade is always good for: playing them twice changes nothing worth it. */
const NOT_UPGRADED: readonly Card[] = [AIM, PATH_AIM, TURN_LEFT, TURN_RIGHT, WAIT, DODGE_CARD]

/** The elements, for the spells. */
const ELEMENTS: readonly Card[] = ELEMENT_CARDS

/** The modules, for the robots. */
const MODULES: readonly Card[] = [BOW_MODULE, BULL_MODULE, BLAST_MODULE, MISSILE]

/**
 * The cards the alchemist makes of a card, its two copies given, always better: a blow doubled or played to
 * both diagonals, another action doubled, a card taking an element given one, an element given its spell, a
 * module given its robot, a robot given its module, a potion given a throw, a card taking an action given a
 * blow, a preparation card, a fusion among them, played twice. None for a card no upgrade is always good for:
 * an aim, a turn, a wait, a dodge.
 */
export function upgradeOf(card: Card, rng: Rng): Card[]|null {
    if(!canUpgrade(card)) return null
    const { input, output } = signatureOf(card)
    if(output === PREPARATION) return [card, card]
    if(output === ELEMENT){
        return input === ELEMENT ? [SPELL, card, rng.pick(ELEMENTS) ?? ELEMENTS[0]] : [SPELL, card]
    }
    if(output === MODULE) return [IMPROVISED_ROBOT, card]
    if(output === POTION) return [THROWN_POTION, card]
    if(input === ELEMENT) return [card, rng.pick(ELEMENTS) ?? ELEMENTS[0]]
    if(input === MODULE) return [card, rng.pick(MODULES) ?? MODULES[0]]
    if(input) return input === ACTION ? [card, rng.pick(BLOWS) ?? THRUST] : null
    if(BLOWS.includes(card)) return [rng.pick([REPEAT_2, DOUBLE_DIAGONAL]) ?? REPEAT_2, card]
    return [REPEAT_2, card]
}

/** Is there an upgrade always good for a card, which the alchemist makes of two copies of it? */
export function canUpgrade(card: Card): boolean {
    if(NOT_UPGRADED.includes(card)) return false
    const { input } = signatureOf(card)
    return input === null || card === SPELL || input === ACTION
}

/** How many copies of a card a deck holds. */
function copiesOf(cards: readonly Card[], card: Card): number {
    return cards.filter(each => each === card).length
}

/** Is a card of a deck one the alchemist can upgrade, the deck holding it twice? */
function isTwice(deck: readonly Card[], card: Card): boolean {
    return canUpgrade(card) && copiesOf(deck, card) >= 2
}

/** The alchemist: two copies of a card become one, upgraded. */
export class AlchemistHalt extends DeckHalt {


    constructor(run: Run){
        super(ALCHEMIST_HALT, run, LINE, LOOK)
    }


    protected fits(deck: readonly Card[]): boolean {
        return deck.some(card => isTwice(deck, card))
    }

    protected work(ctx: HaltContext, deck: Card[], back: () => void): void {
        ctx.cards(["Deux copies de quelle ", CARTE, " ?"], deck, { min: 1, max: 1 }, ([card]) => {
            const upgrade = upgradeOf(card, this.run.rng)
            if(!upgrade) throw new Error(`${card.name} was offered to the alchemist, who has no upgrade for it.`)
            this.impact()
            ctx.tell("Transmutée :", fusionShown(this.run.changeDeck(deck, changed => transmute(changed, card, upgrade)), deck))
        }, { among: card => isTwice(deck, card), back })
    }
}

/** The sort of the alchemist. */
export const ALCHEMIST_HALT: HaltType = {
    name: "Alchimiste",
    description: ["Deux copies d'une ", CARTE, " deviennent une seule, améliorée."],
    code: "AL",
    icon: "mecard/travel/alchemist/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new AlchemistHalt(run),
}
