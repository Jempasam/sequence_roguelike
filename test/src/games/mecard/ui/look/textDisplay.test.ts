import { describe, expect, test } from "vitest"
import { plainText, spansOf } from "@game/core-src/semantic/Text"
import type { Text } from "@game/core-src/semantic/Text"
import {
    AGILITE,
    ALLONGE,
    FEBRILE,
    CARTE,
    FUSION,
    DECK,
    DISTANCE,
    FORCE,
    HEART,
    MERGE,
    PORTEE,
    PRECISION,
    SUPPRESSION,
    UNIT,
    GOLD,
    BATTLE_ROUND,
    BATTLE_TURN,
    TRAVEL_STEP,
    HALT,
    MONSTER,
    PET,
    ADVENTURER,
    UPGRADE,
    ITEM,
    USABLE,
    BOOSTER,
    FIGHT,
    FLOOR,
    REWARD,
    HEAL,
    SUMMON_STAT,
    ALCHEMY,
} from "@game/core-src/games/mecard/sim/base/keywords"
import { DamageType } from "@game/core-src/games/mecard/sim/battle/DamageType"
import { HeartCount, GoldCount } from "@game/core-src/games/mecard/sim/battle/words"
import {
    ACTION,
    PREPARATION,
    ELEMENT,
    POTION,
    CARD,
    SECRET,
    MODULE,
    BEAST,
} from "@game/core-src/games/mecard/sim/card/CardType"
import { SLASH } from "@game/core-src/games/mecard/sim/card/subs/attack/Slash"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { FusionCard, UNSTABLE_THRUST } from "@game/core-src/games/mecard/sim/card/subs/composite/FusionCard"
import { CHARGE } from "@game/core-src/games/mecard/sim/card/subs/composite/MergedCard"
import { ELEMENT_CARDS } from "@game/core-src/games/mecard/sim/card/subs/spell/ElementCard"
import { ALL_BOOSTERS } from "@game/core-src/games/mecard/sim/catalog/boosters"
import { ALL_CARDS } from "@game/core-src/games/mecard/sim/catalog/cards"
import { ALL_FLOORS } from "@game/core-src/games/mecard/sim/catalog/floors"
import { allHalts } from "@game/core-src/games/mecard/sim/catalog/halts"
import { ALL_HAZARDS } from "@game/core-src/games/mecard/sim/catalog/hazards"
import { ALL_ITEMS } from "@game/core-src/games/mecard/sim/catalog/items"
import { ALL_KITS } from "@game/core-src/games/mecard/sim/catalog/kits"
import { ALL_MONSTERS } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { ALL_UPGRADES } from "@game/core-src/games/mecard/sim/catalog/upgrades"
import { ALL_USABLES } from "@game/core-src/games/mecard/sim/catalog/usables"
import { BASE_ELEMENTS } from "@game/core-src/games/mecard/sim/element/reactions"
import { ALL_FIGHT_CATEGORIES } from "@game/core-src/games/mecard/sim/fight/fights"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import { STATUS_TYPES } from "@game/core-src/games/mecard/sim/status/statusTypes"
import { BURN } from "@game/core-src/games/mecard/sim/status/subs/Burn"
import { explanationOf } from "@game/core/mecard/explanations"
import { mecardDisplay } from "@game/core/mecard/text-display"

// --- Fixture builders ---

const CARD_TYPES = [ACTION, PREPARATION, ELEMENT, POTION, CARD, SECRET, MODULE, BEAST]

const NOTIONS = [HALT, MONSTER, PET, ADVENTURER, UPGRADE, ITEM, USABLE, BOOSTER, FIGHT, FLOOR, REWARD]

const STATS = [HEAL, SUMMON_STAT, ALCHEMY]

/** The words a text writes through a keyword, never as a plain word. */
const KEYWORD_WORDS = /\b(objets?|monstres?|aventuriers?|c(œ|oe)urs?|invocations?|alchimie|familiers?|pets?|haltes?|récompenses?)\b/i

const spans = (text: Text) => spansOf(text, mecardDisplay)

/** What a text means, read without the interface: no picture comes from the simulation. */
const hasPicture = (text: Text): boolean => spansOf(text).some(span => span.kind !== "string")

const ALL_TEXTS: readonly (readonly [string, Text])[] = [
    ...ALL_CARDS.map(card => [card.name, card.description] as const),
    ...ALL_ITEMS.map(item => [item.name, item.description] as const),
    ...ALL_USABLES.map(usable => [usable.name, usable.description] as const),
    ...allHalts().map(type => [type.name, type.description] as const),
    ...ALL_FIGHT_CATEGORIES.map(category => [category.name, category.description] as const),
    ...STATUS_TYPES.map(type => [type.name, type.description] as const),
]

// --- Tests ---

describe("mecardDisplay", () => {
    test("a decimal number → rounded, its decimals after a comma", () => {
        expect(plainText(["Force +", 1.3, ", ", 0.456, " et ", 2], mecardDisplay)).toBe("Force +1,3, 0,46 et 2")
    })

    test("a type of damage → its icon in its color, the name kept as its plain string", () => {
        const text = [2, " ", DamageType.PHYSICAL]
        expect(spans(text).at(-1)).toMatchObject({
            kind: "picture", picture: { picture: "tiny_icon/damage", alt: "dégâts physiques" },
            link: DamageType.PHYSICAL,
        })
        expect(plainText(text, mecardDisplay)).toBe("2 dégâts physiques")
        expect(spans(DamageType.ELEMENTAL)[0].color).not.toEqual(spans(DamageType.PHYSICAL)[0].color)
    })

    test("a distance → its number, then the meters in their own color", () => {
        const [, , unit] = spans([2, " ", DISTANCE])
        expect(unit).toMatchObject({ kind: "string", text: "m", link: DISTANCE })
        expect(unit.color).not.toBeNull()
    })

    test("a stat → its word, standing out, linking to it", () => {
        for(const stat of [FORCE, PRECISION, AGILITE, PORTEE, ALLONGE, FEBRILE]){
            expect(spans(stat)[0]).toMatchObject({ kind: "string", text: stat.name, link: stat })
        }
        expect(plainText([2, "+", FORCE, " ", DamageType.PHYSICAL], mecardDisplay)).toBe("2+force dégâts physiques")
    })

    test("a heart → its icon, in the color of the text around it", () => {
        const pieces = spans(new HeartCount(1))
        expect(pieces.at(-1)).toMatchObject({ kind: "picture", picture: { picture: "tiny_icon/heart" } })
        expect(pieces.at(-1)?.color).toEqual(pieces[0].color)
    })

    test("gold → its coin, linking to the keyword, the word kept as its plain string", () => {
        const text = new GoldCount(12)
        expect(spans(text).at(-1)).toMatchObject({
            kind: "picture", picture: { picture: "tiny_icon/gold", alt: "or" }, link: GOLD,
        })
        expect(plainText(text, mecardDisplay)).toBe("12 or")
    })

    test("a keyword → its form, standing out, linking to the keyword whatever the form", () => {
        const [piece] = spans(FUSION.as("collées"))
        expect(piece).toMatchObject({ kind: "string", text: "collées", link: FUSION })
        expect(piece.color).not.toBeNull()
    })

    test("a keyword alone → as its plain form", () => {
        expect(spans(DECK)[0]).toMatchObject({ text: "deck", link: DECK })
    })

    test("a card → its name in the color of its rarity, linking to it", () => {
        const [piece] = spans(THRUST)
        expect(piece).toMatchObject({ text: THRUST.name, link: THRUST })
        expect(piece.color).toEqual(spansOf(THRUST)[0].color)
    })

    test("the cards of a collage → each linking to itself in its description", () => {
        const fusion = new FusionCard([SLASH, THRUST])
        const links = spans(fusion.description).map(span => span.link)
        expect(links).toContain(SLASH)
        expect(links).toContain(THRUST)
    })

    test("the cards of a mix → each linking to itself in its description", () => {
        const links = spans(CHARGE.description).map(span => span.link)
        for(const card of CHARGE.contents) expect(links).toContain(card)
    })

    test("a collage in a collage → the inner one links too, and tells its own cards", () => {
        const outer = new FusionCard([UNSTABLE_THRUST, SLASH])
        expect(spans(outer.description).map(span => span.link)).toContain(UNSTABLE_THRUST)
        const inner = explanationOf(UNSTABLE_THRUST) ?? ""
        const links = spans(inner).map(span => span.link)
        for(const card of UNSTABLE_THRUST.contents) expect(links).toContain(card)
    })

    test("an object it does not know → tells itself, with no link", () => {
        expect(spans({ toString: () => "chose" } as Text)).toEqual([
            { kind: "string", text: "chose", color: null, link: null },
        ])
    })
})

describe("explanationOf", () => {
    test.each([FUSION, MERGE, CARTE, UNIT, SUPPRESSION, DECK, GOLD, BATTLE_ROUND, BATTLE_TURN, TRAVEL_STEP])("%s → an explanation", keyword => {
        expect(plainText(explanationOf(keyword) ?? "")).not.toBe("")
    })

    test("a heart, a mere icon → none", () => {
        expect(explanationOf(HEART)).toBeUndefined()
    })

    test("what has a description → its name and its description", () => {
        expect(plainText(explanationOf(THRUST) ?? "")).toBe(`${THRUST.name} : ${plainText(THRUST.description)}`)
        expect(plainText(explanationOf(ALL_ITEMS[0]) ?? "")).toContain(plainText(ALL_ITEMS[0].description))
        expect(plainText(explanationOf(ALL_USABLES[0]) ?? "")).toContain(plainText(ALL_USABLES[0].description))
        expect(plainText(explanationOf(RED_HEART) ?? "")).toContain(plainText(RED_HEART.description))
    })
})

describe("the texts of the game", () => {
    test.each(ALL_TEXTS)("%s → says what it means, with no picture of the simulation", (_name, text) => {
        expect(hasPicture(text)).toBe(false)
    })

    test.each(ALL_TEXTS)("%s → no sentence cut by an array left inside another", (_name, text) => {
        expect(plainText(text)).not.toMatch(/ \n|\n[ .,]/)
    })

    test.each(ALL_TEXTS)("%s → no notion with a keyword written as a plain word", (_name, text) => {
        const written = spans(text).filter(span => span.kind === "string" && span.link === null)
        const plain = written.map(span => span.kind === "string" ? span.text : "").join("")
        expect(plain).not.toMatch(KEYWORD_WORDS)
    })
})

describe("the objects of the game in a text", () => {
    test.each(STATUS_TYPES.map(type => [type.name, type] as const))("status %s → explained, so a link", (_name, type) => {
        expect(explanationOf(type)).toBeDefined()
        expect(spans(["", type]).some(span => span.link === type)).toBe(true)
    })

    test("a status kind → its icon first, then its name, all linking to it", () => {
        const [icon, name] = spans(BURN)
        expect(icon).toMatchObject({ kind: "picture", picture: { picture: BURN.visual.visual }, link: BURN })
        expect(name).toMatchObject({ kind: "string", text: BURN.name, link: BURN })
        expect(plainText(BURN, mecardDisplay)).toBe(BURN.name)
    })

    test("a status with a level → its icon, its name and its level", () => {
        expect(plainText(BURN.make(2, BURN), mecardDisplay)).toContain("2")
        expect(spans(BURN.make(2, BURN))[0]).toMatchObject({ kind: "picture" })
    })

    test.each(CARD_TYPES)("card type %s → its name, explained by its description", type => {
        expect(plainText(explanationOf(type) ?? "")).toBe(`${type.name} : ${plainText(type.description)}`)
        expect(spans(type)[0]).toMatchObject({ text: type.name, link: type })
    })

    test.each(BASE_ELEMENTS.map(element => [element.name, element] as const))("element %s → its name, explained", (_name, element) => {
        expect(spans(element)[0]).toMatchObject({ text: element.name, link: element })
        const lines = plainText(explanationOf(element) ?? "").split("\n")
        expect(lines).toHaveLength(4)
        expect(lines[0]).toBe(element.name)
    })

    test.each(allHalts().map(halt => [halt.name, halt] as const))("halt %s → its name in a color, explained", (name, halt) => {
        expect(plainText(halt, mecardDisplay)).toBe(name)
        expect(spans(halt)[0]).toMatchObject({ link: halt })
        expect(spans(halt)[0].color).not.toBeNull()
        expect(plainText(explanationOf(halt) ?? "", mecardDisplay)).toContain(plainText(halt.description))
    })

    test.each(ALL_FLOORS.map(floor => [floor.name, floor] as const))("floor %s → its name in a color, explained", (name, floor) => {
        expect(plainText(floor, mecardDisplay)).toBe(name)
        expect(spans(floor)[0]).toMatchObject({ link: floor })
        expect(explanationOf(floor)).toBeDefined()
    })

    test.each(ALL_FIGHT_CATEGORIES.map(category => [category.name, category] as const))("fight category %s → its name, explained", (name, category) => {
        expect(plainText(category, mecardDisplay)).toBe(name)
        expect(explanationOf(category)).toBeDefined()
    })

    test.each(ALL_FIGHT_CATEGORIES.map(category => [category.name, category] as const))("fight category %s → its name in a text, read by any reader", (name, category) => {
        expect(plainText(["Un ", category, "."])).toBe(`Un ${name}.`)
        expect(spans(category)[0]).toMatchObject({ link: category })
        expect(spans(category)[0].color).not.toBeNull()
    })

    test("a kit → its name, and what it starts with", () => {
        for(const kit of ALL_KITS){
            expect(plainText(kit, mecardDisplay)).toBe(kit.name)
            expect(plainText(explanationOf(kit) ?? "", mecardDisplay)).toContain(kit.cards[0].name)
        }
    })

    test("an upgrade → its name, and its chain with the improved card in the holes", () => {
        for(const upgrade of ALL_UPGRADES){
            expect(plainText(upgrade, mecardDisplay)).toBe(upgrade.name)
            expect(plainText(explanationOf(upgrade) ?? "", mecardDisplay)).toContain(upgrade.name)
        }
    })

    test("a monster → its name, its hearts and its deck", () => {
        for(const monster of ALL_MONSTERS){
            expect(explanationOf(monster)).toBeDefined()
            expect(spans(monster)[0]).toMatchObject({ link: monster })
        }
    })

    test.each(STATS)("stat %s → explained, and a link when written", keyword => {
        expect(explanationOf(keyword)).toBeDefined()
        expect(spans(keyword)[0]).toMatchObject({ text: keyword.name, link: keyword })
    })

    test("an element card → its name in the color of its element", () => {
        for(const card of ELEMENT_CARDS){
            expect(spans(card)[0].color).toEqual(spans(card.element)[0].color)
        }
    })

    test.each(NOTIONS)("notion %s → explained, and a link when written", keyword => {
        expect(explanationOf(keyword)).toBeDefined()
        expect(spans(keyword)[0]).toMatchObject({ text: keyword.name, link: keyword })
    })

    test.each(ALL_BOOSTERS.map(booster => [booster.name, booster] as const))("booster %s → its name in a color", (name, booster) => {
        expect(plainText(booster)).toBe(name)
        expect(spans(booster).every(span => span.color !== null)).toBe(true)
    })

    test.each(ALL_HAZARDS.map(hazard => [hazard.name, hazard] as const))("hazard %s → its name, explained", (name, hazard) => {
        expect(plainText(hazard)).toBe(name)
        expect(explanationOf(hazard)).toBeDefined()
    })
})
