import { describe, expect, test } from "vitest"
import { LAYERS, Run } from "@game/core/mecard"
import type { CardsDialog, Dialog, HeroDialog, OfferDialog, Place, PlaceKind, Travel } from "@game/core/mecard"

// --- Fixture builders ---

/** A new place of a kind, on no map. */
function placeOf(kind: PlaceKind): Place {
    return { kind, layer: 1, across: 0.5, next: [], exitTo: null, monsters: [] }
}

/** The last dialog opened, of the sort the test knows it is. */
function open<T extends Dialog>(travel: Travel): T {
    const dialog = travel.dialogs.at(-1)
    if(!dialog) throw new Error("No dialog is open.")
    return dialog as T
}

/** Everything a travel tells, in order. */
function logOf(travel: Travel): string[] {
    const log: string[] = []
    travel.phaseChanged.add(phase => log.push(`phase ${phase}`))
    travel.moved.add(() => log.push("moved"))
    travel.visitStarted.add(halt => log.push(`visit ${halt.title}`))
    travel.visitEnded.add(halt => log.push(`end ${halt.title}`))
    travel.fightReached.add(place => log.push(`fight ${place.kind}`))
    travel.offerAsked.add(() => log.push("offer"))
    travel.heroAsked.add(dialog => log.push(dialog.follows ? "hero follows" : "hero"))
    travel.cardsAsked.add(() => log.push("cards"))
    travel.confirmAsked.add(() => log.push("confirm"))
    travel.told.add(() => log.push("told"))
    travel.reacted.add(moment => log.push(`react ${moment}`))
    return log
}

/** Walk a party down to the exits of its floor, standing on the boss. */
function toBoss(travel: Travel): void {
    for(let layer = 0; layer < LAYERS; layer++){
        travel.go(travel.next[0])
        travel.enter()
        travel.leave()
    }
}

// --- Tests ---

describe("Travel, going", () => {
    test("a halt of the map → in once entered, the visit waiting for the players", () => {
        const { travel } = new Run(1)
        const place = travel.next[0]
        travel.go(place)
        expect(travel.phase).toBe("entering")
        expect(travel.place).toBe(place)
        expect(travel.halt).toBeNull()
    })

    test("out of the map → cannot go", () => {
        const { travel } = new Run(1)
        travel.go(travel.next[0])
        expect(() => travel.go(travel.next[0])).toThrow()
    })

    test("not entering a place → cannot enter", () => {
        expect(() => new Run(1).travel.enter()).toThrow()
    })

    test("entering a place → leaving does nothing", () => {
        const { travel } = new Run(1)
        travel.go(travel.next[0])
        travel.leave()
        expect(travel.phase).toBe("entering")
    })

    test("a place it does not lead to → cannot go", () => {
        const { travel } = new Run(1)
        expect(() => travel.go(placeOf("chest"))).toThrow()
        expect(travel.phase).toBe("map")
    })

    test("a jump → stands there, told, without entering", () => {
        const { travel } = new Run(1)
        const log = logOf(travel)
        const place = placeOf("chest")
        travel.jump(place)
        expect(travel.place).toBe(place)
        expect(log).toEqual(["moved"])
    })
})

describe("Travel, fights", () => {
    test("a fight → told, and nothing fought until the run is told to", () => {
        const run = new Run(1)
        const { travel } = run
        const log = logOf(travel)
        const place = placeOf("battle")
        travel.jump(place)
        travel.journey.link(place, place)
        travel.go(place)
        travel.enter()
        expect(log).toEqual(["moved", "moved", "phase entering", "phase fight", "fight battle"])
        expect(travel.phase).toBe("fight")
        expect(run.battle).toBeNull()
        expect(run.phase).toBe("travel")
    })
})

describe("Travel, visits", () => {
    test("a chest → each step told in order, down to the map", () => {
        const run = new Run(3)
        const { travel } = run
        const [hero] = run.heroes
        const log = logOf(travel)
        const cards = hero.decks[0].length
        travel.visit("chest")
        travel.takeOffer(open<OfferDialog>(travel), 0)
        travel.takeHero(open<HeroDialog>(travel), hero)
        expect(travel.halt?.title).toBe("Coffre")
        travel.leave()
        expect(log).toEqual([
            "phase visit", "visit Coffre", "react arrive", "offer",
            "react pick", "hero follows",
            "react pick", "react done", "told",
            "phase map", "end Coffre",
        ])
        expect(hero.decks[0]).toHaveLength(cards + 1)
        expect(travel.halt).toBeNull()
        expect(travel.dialogs).toEqual([])
    })

    test("a character asked during a pick → follows it, both open", () => {
        const { travel } = new Run(3)
        travel.visit("chest")
        const offer = open<OfferDialog>(travel)
        travel.takeOffer(offer, 0)
        const asked = open<HeroDialog>(travel)
        expect(asked.follows).toBe(true)
        expect(travel.dialogs).toEqual([offer, asked])
    })

    test("a step answered again → the steps after it taken back", () => {
        const run = new Run(3)
        const { travel } = run
        travel.visit("chest")
        const offer = open<OfferDialog>(travel)
        travel.takeOffer(offer, 0)
        const first = open<HeroDialog>(travel)
        travel.takeOffer(offer, 1)
        const second = open<HeroDialog>(travel)
        expect(travel.dialogs).toEqual([offer, second])
        expect(() => travel.takeHero(first, run.heroes[0])).toThrow()
    })

    test("a way back → the dialog before, the character refusing", () => {
        const run = new Run(3)
        const { travel } = run
        const log = logOf(travel)
        travel.visit("removal")
        travel.takeHero(open<HeroDialog>(travel), run.heroes[0])
        const cards = open<CardsDialog>(travel)
        expect(cards.back).toBe(true)
        travel.goBack(cards)
        expect(log.slice(-2)).toEqual(["react refuse", "hero"])
        expect(open(travel).back).toBe(false)
    })

    test("no way back → refused", () => {
        const { travel } = new Run(3)
        travel.visit("chest")
        expect(() => travel.goBack(open(travel))).toThrow()
    })

    test("nobody can profit → told so, the character refusing", () => {
        const { travel } = new Run(3)
        const log = logOf(travel)
        travel.visit("butcher")
        expect(log.slice(-3)).toEqual(["react done", "told", "react refuse"])
    })

    test("a dialog no longer open → refused", () => {
        const run = new Run(3)
        const { travel } = run
        travel.visit("chest")
        const offer = open<OfferDialog>(travel)
        travel.leave()
        expect(() => travel.takeOffer(offer, 0)).toThrow()
    })

    test("an offer it does not hold → refused", () => {
        const { travel } = new Run(3)
        travel.visit("chest")
        const offer = open<OfferDialog>(travel)
        expect(() => travel.takeOffer(offer, offer.offers.length)).toThrow()
    })

    test("a character it does not let in → refused", () => {
        const run = new Run(3)
        const { travel } = run
        travel.visit("chest")
        travel.takeOffer(open<OfferDialog>(travel), 0)
        expect(() => travel.takeHero(open<HeroDialog>(travel), new Run(4).heroes[0])).toThrow()
    })

    test("too many cards, or the same twice → refused", () => {
        const run = new Run(3)
        const { travel } = run
        travel.visit("removal")
        travel.takeHero(open<HeroDialog>(travel), run.heroes[0])
        const cards = open<CardsDialog>(travel)
        expect(() => travel.takeCards(cards, [])).toThrow()
        expect(() => travel.takeCards(cards, [0, 0])).toThrow()
        expect(() => travel.takeCards(cards, [0, 1, 2, 3])).toThrow()
    })

    test("cards taken → by their places in the pool", () => {
        const run = new Run(3)
        const { travel } = run
        const [hero] = run.heroes
        const [, second] = hero.decks[0]
        const copies = (): number => hero.decks[0].filter(card => card === second).length
        const before = copies()
        travel.visit("removal")
        travel.takeHero(open<HeroDialog>(travel), hero)
        travel.takeCards(open<CardsDialog>(travel), [1])
        expect(copies()).toBe(before - 1)
    })

    test("a halt left as it was → gone back into, the same, no deeper", () => {
        const { travel } = new Run(3)
        const place = placeOf("chest")
        travel.jump(place)
        const halt = travel.haltOf(place)
        const { depth } = travel
        travel.go(place)
        travel.enter()
        expect(travel.halt).toBe(halt)
        expect(travel.depth).toBe(depth)
    })

    test("an exit accepted → the next floor, its map new, the party before it", () => {
        const { travel } = new Run(3)
        toBoss(travel)
        const entered: string[] = []
        travel.floorEntered.add(floor => entered.push(floor.type.name))
        const { journey } = travel
        const [exit] = travel.next
        travel.go(exit)
        travel.enter()
        const floor = exit.exitTo
        travel.accept(open(travel))
        expect(entered).toEqual([floor?.type.name])
        expect(travel.floor).toBe(floor)
        expect(travel.journey).not.toBe(journey)
        expect(travel.place).toBeNull()
        expect(travel.phase).toBe("map")
    })
})

describe("Run, the party told", () => {
    test("each change → one notification", () => {
        const run = new Run(3)
        const [first, second] = run.heroes
        const log: string[] = []
        run.goldChanged.add(gold => log.push(`gold ${gold}`))
        run.heroJoined.add(hero => log.push(`joined ${hero.name}`))
        run.heroLeft.add(hero => log.push(`left ${hero.name}`))
        run.partyHealed.add(() => log.push("healed"))
        run.deckChanged.add(() => log.push("deck"))
        run.gold = 50
        run.spend(20)
        run.heal()
        run.changeDeck(first.decks[0], deck => deck.pop())
        const merged = run.merge(first, second)
        run.fire(merged)
        expect(log).toEqual([
            "gold 50", "gold 30", "healed", "deck",
            `left ${first.name}`, `left ${second.name}`, `joined ${merged.name}`, `left ${merged.name}`,
        ])
    })

    test("the same gold → told nothing", () => {
        const run = new Run(3)
        let told = 0
        run.goldChanged.add(() => told++)
        const { gold } = run
        run.gold = gold
        expect(told).toBe(0)
    })

    test("a halt changing a deck → told", () => {
        const run = new Run(3)
        const { travel } = run
        const [hero] = run.heroes
        const decks: unknown[] = []
        run.deckChanged.add(deck => decks.push(deck))
        travel.visit("chest")
        travel.takeOffer(open<OfferDialog>(travel), 0)
        travel.takeHero(open<HeroDialog>(travel), hero)
        expect(decks).toEqual([hero.decks[0]])
    })

    test("a character not in the party → cannot be sent away", () => {
        expect(() => new Run(3).fire(new Run(4).heroes[0])).toThrow()
    })
})
