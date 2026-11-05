import { describe, expect, test } from "vitest"
import {
    ACTION, Arena, Battle, COMPOUNDS, CROSSED_SPELL, DrawnCard, ELEMENT_CARDS, FusionCard, GRAND_RITUAL_CARD,
    Heart, IMPROVISED_WEAPON, LOOT_CARDS, loadBattle, MISSILE, planFor, POTION, POTION_POUCH,
    PREPARATION,
    REACTION, RED_HEART, RITUAL, saveBattle, signatureOf, SPELL, Team, Vector2,
} from "@game/core/mecard"
import type { Card, CardType } from "@game/core/mecard"

// --- Fixture builders ---

/** How many rounds each battle is played for at most. */
const ROUNDS = 12

/** How long the whole loot may take to play, in milliseconds: a second alone, more among the other tests. */
const PLAY_TIMEOUT = 30000

/** How many seeds the loot is played over. */
const SEEDS = 25

/** One of some cards, by a number: so each seed fills the slots with others. */
function nth<T>(cards: readonly T[], index: number): T {
    return cards[index % cards.length]
}

/**
 * What a card of the loot truly takes and gives: a preparation read as what it becomes, the pouch as the
 * potion it draws, which a deck alone tells.
 */
function typesOf(card: Card): { readonly input: CardType<unknown>|null, readonly output: CardType<unknown> } {
    return card === POTION_POUCH ? { input: null, output: POTION } : signatureOf(card)
}

/** Does a card play on its own, at the head of a row? */
function standing(card: Card): boolean {
    const { output } = typesOf(card)
    return output === ACTION || output === PREPARATION
}

/** The cards of the loot giving a type and taking nothing, which fill a slot of it. */
function fillers(type: CardType<unknown>): Card[] {
    return LOOT_CARDS.filter(card => {
        const { input, output } = typesOf(card)
        return output === type && input === null && !card.contents && !(card instanceof DrawnCard)
    })
}

/** The cards of the loot playing on their own and taking a type, which a card giving it plugs into. */
function takers(type: CardType<unknown>): Card[] {
    return LOOT_CARDS.filter(card => typesOf(card).input === type && standing(card))
}

/** The card of an element, among those found as cards. */
function cardOf(element: unknown): Card {
    const found = ELEMENT_CARDS.find(card => card.element === element)
    if(!found) throw new Error(`No card gives ${String(element)}.`)
    return found
}

/** A card of the loot rewriting itself from the cards on its right, as a tree it plays in, none otherwise. */
function rewritten(card: Card, index: number): Card[]|null {
    const { first, second } = nth(COMPOUNDS, index)
    if(card === REACTION) return [SPELL, card, cardOf(first), cardOf(second)]
    if(card === CROSSED_SPELL) return [card, nth(ELEMENT_CARDS, index), nth(ELEMENT_CARDS, index + 1)]
    if(card === RITUAL || card === GRAND_RITUAL_CARD) return [card, nth(ELEMENT_CARDS, index)]
    if(card === IMPROVISED_WEAPON) return [card, MISSILE]
    return null
}

/**
 * A card of the loot as a tree that plays: a card taking an input given one, a card that does not play on
 * its own plugged into one that does: `Bouteille + Antidote + Poison`.
 */
function played(card: Card, index: number): Card {
    const whole = rewritten(card, index)
    if(whole) return new FusionCard(whole)
    const { input, output } = typesOf(card)
    const tree = standing(card) ? [card] : [nth(takers(output), index), card]
    if(input) tree.push(nth(fillers(input), index))
    return tree.length === 1 ? card : new FusionCard(tree)
}

/** A battle of two bots on each side, each holding every card of the loot as a tree that plays. */
function lootBattle(seed: number): Battle {
    const on = new Battle(new Arena(7, 7, [{ center: new Vector2(3.5, 3.5), radius: 0.4 }]), seed)
    const cards = LOOT_CARDS.map((card, index) => played(card, index + seed))
    for(const [side, team] of [new Team("A"), new Team("B")].entries()){
        for(const rank of [0, 1]){
            on.add({
                name: `${team.name}${rank}`, team, controller: "bot",
                position: new Vector2(2 + 3 * rank, side === 0 ? 6 : 1),
                direction: side === 0 ? Vector2.UP : Vector2.DOWN,
                hearts: Heart.many(RED_HEART, 12), decks: [cards],
            })
        }
    }
    return on
}

// --- Tests ---

describe("the loot, played", () => {
    test("bots playing every card for rounds, over many seeds → no effect ever fails, and every rest saves", () => {
        const seen = new Set<Card>()
        for(let seed = 1; seed <= SEEDS; seed++){
            const on = lootBattle(seed)
            for(let round = 0; round < ROUNDS && on.waiting; round++){
                on.startRound()
                for(const unit of on.initiative){
                    const chain = planFor(unit)
                    for(const card of chain.cards){
                        for(const each of [card, ...card.contents ?? []]) seen.add(each)
                    }
                    on.commit(unit, chain)
                }
                const save = saveBattle(on)
                expect(JSON.stringify(saveBattle(loadBattle(save))), `seed ${seed}`).toBe(JSON.stringify(save))
                on.endPreparation()
                on.playRound()
            }
            const errors = on.events.flatMap(event => event.type === "error" ? [String(event.error)] : [])
            expect(errors, `seed ${seed}`).toEqual([])
        }
        // The pouch draws a potion in sight, and every potion here is held in a tree: it draws nothing, and
        // is played on its own in the tests of the rewrites.
        const unseen = LOOT_CARDS.filter(card => !seen.has(card) && card !== POTION_POUCH)
        expect(unseen.map(card => card.name)).toEqual([])
    }, PLAY_TIMEOUT)
})
