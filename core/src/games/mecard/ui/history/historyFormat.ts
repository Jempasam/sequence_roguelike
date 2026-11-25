import type { Card } from "../../sim/card/Card"
import type { Hero } from "../../sim/run/Hero"
import { ALL_FLOORS } from "../../sim/catalog/floors"
import type { FloorType } from "../../sim/floor/Floor"
import type { HistoryEntry } from "../../sim/save/historySave"

/** The sentences that tell how a game ended, from the fight lost and the step it was lost on, if known. */
const EPITAPHS: readonly ((fight: string, step: number|null) => string)[] = [
    (fight, step) => `Tombés face à ${fight}${atStep(step)}.`,
    (fight, step) => `${fight} a eu raison du groupe${atStep(step)}.`,
    (fight, step) => `La route s'arrête devant ${fight}${atStep(step)}.`,
    (fight, step) => `${fight} n'a laissé aucune chance${atStep(step)}.`,
    (fight, step) => `Une dernière bataille contre ${fight}${atStep(step)}.`,
]

/** What says the step a game was lost on, nothing when it is not known. */
function atStep(step: number|null): string {
    return step === null ? "" : `, à l'étape ${step}`
}

/** When the game ended, as the players read it. */
export function formatDate(entry: HistoryEntry): string {
    return new Date(entry.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
}

/** The gold of the game. */
export function formatGold(entry: HistoryEntry): string {
    return `${entry.gold} or`
}

/** The seed of the game. */
export function formatSeed(entry: HistoryEntry): string {
    return `graine ${entry.seed}`
}

/** Which row of the map the party fell on, and how many it has, none for a game that did not tell. */
export function formatStep(entry: HistoryEntry): string|null {
    const { route } = entry
    return route ? `étape ${route.fallAt + 1} de ${route.layers.length}` : null
}

/** The sort of floor a game ended on, none when the catalog has no floor of its name any more. */
export function floorTypeOf(entry: HistoryEntry): FloorType|null {
    return ALL_FLOORS.find(floor => floor.name === entry.floor) ?? null
}

/**
 * A sentence on how the game ended, the same for the same game: the seed picks it. None for a game that
 * does not tell the fight it was lost to.
 */
export function epitaph(entry: HistoryEntry): string|null {
    if(!entry.fight) return null
    const sentence = EPITAPHS[Math.abs(entry.seed) % EPITAPHS.length]
    return sentence(entry.fight, entry.route ? entry.route.fallAt + 1 : null)
}

/** Has a hero no heart left: did it fall? */
export function isDead(hero: Hero): boolean {
    return hero.hearts.every(heart => heart.isEmpty)
}

/** The place of the deck a card of a hero is the most in, the first of them when it is as much in several. */
export function deckOfCard(hero: Hero, card: Card): number {
    let best = 0
    let most = 0
    hero.decks.forEach((deck, place) => {
        const count = deck.filter(each => each === card).length
        if(count > most){
            best = place
            most = count
        }
    })
    return best
}

/** How many cards each deck of a hero holds, by the place of the deck. */
export function deckSizes(hero: Hero): readonly number[] {
    return hero.decks.map(deck => deck.length)
}
