import { Box, Label } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import { statusTypeText } from "../look/explanations"
import { CHOSEN_TEXT } from "../look/theme"
import { AbsItemIcon, STATUS_ICON_SIZE } from "../hud/AbsItemIcon"
import { concat, joinText } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import { HEART } from "../../sim/base/keywords"
import { HeartCount } from "../../sim/battle/words"
import { BeastCard } from "../../sim/card/subs/beast/BeastCard"
import { ModuleCard } from "../../sim/card/subs/mechanic/ModuleCard"
import { TURNS } from "../../sim/card/subs/movement/TurnCard"
import { STEP } from "../../sim/card/subs/movement/Step"
import { ALL_BOOSTERS } from "../../sim/catalog/boosters"
import { ALL_CARDS, ALL_HAZARDS, ALL_ITEMS, ALL_USABLES } from "../../sim/catalog/index"
import { ALL_KITS } from "../../sim/catalog/kits"
import { allFightTypes } from "../../sim/catalog/fightTypes"
import { allHalts } from "../../sim/catalog/halts"
import { ALL_FLOORS } from "../../sim/catalog/floors"
import { ALL_MONSTERS } from "../../sim/catalog/monsters"
import type { Monster } from "../../sim/catalog/monsters"
import { ALL_PETS } from "../../sim/catalog/pets"
import { EMPTY_FIGHT } from "../../sim/fight/fights"
import { Heart } from "../../sim/heart/Heart"
import type { HeartKind } from "../../sim/heart/HeartKind"
import { ALL_UPGRADES } from "../../sim/catalog/upgrades"
import { allyOf, foeOf } from "../../sim/run/Hero"
import type { Hero } from "../../sim/run/Hero"
import { boosterEntry } from "./BoosterEntry"
import { kitEntry } from "./KitEntry"
import { upgradeEntry } from "./UpgradeEntry"
import { KEPT_LOOT_HEARTS, SPENT_LOOT_HEARTS } from "../../sim/run/Run"
import { HEART_KINDS } from "../../sim/save/catalogNames"
import { STATUS_FAMILIES, STATUS_TYPES } from "../../sim/status/statusTypes"
import { usableText, described } from "../../sim/halt/subs/shown"
import { cardsOption } from "../hud/ChoiceOptions"
import { thingBag } from "../hud/thingBag"
import { unitView } from "../hud/unitView"
import { heartsRow } from "../hud/HeartView"
import type { UnitSprites } from "../look/UnitSprites"
import { lootHeartKey } from "../../persist/PlayerCatalog"
import type { CatalogCategory } from "../../sim/save/catalogSave"

/** Something the catalogue shows: how it looks in the list, and what its bubble says of it. */
export interface Entry {
    readonly view: Component
    readonly text: Text

    /** What the search reads, the text when none. */
    readonly search?: Text

    /** The name that tells it among the entries of its category, as the catalogue of the player counts it. */
    readonly key: string

    /** What the game holds that the entry shows: a card, a monster, a kit, a booster. None when none. */
    readonly value?: unknown
}

/** A way to keep some of the entries of a tab only, named for the player to turn on. */
export interface EntryFilter {
    readonly id: string

    /** What the player reads on the toggle that turns it on. */
    readonly label: string

    /** Does an entry stay when it is on? */
    test(entry: Entry): boolean
}

/** A tab of the catalogue: its title, and the entries it lists, made when it is shown. */
export interface Section {
    readonly title: string

    /** The category of the tab: a bar is drawn between two neighbour tabs of different ones. */
    readonly group: string

    /** What the catalogue of the player counts its entries as. */
    readonly category: CatalogCategory

    /** The ways to keep some of its entries only, none by default. */
    readonly filters?: readonly EntryFilter[]
    entries(): Entry[]
}

/** What the sections need to build their entries. */
export interface LibraryLook {
    readonly theme: Theme
    readonly sprites: UnitSprites

    /** How many cards fit in a row of an entry at the width of the interface now. */
    readonly perRow: () => number
}

/** How wide a card of an entry is, the space between two, and the frame around the cards of an entry. */
const CARD_WIDTH = 44
const CARD_GAP = 2
const ENTRY_FRAME = 16

/** How many cards fit in a row of an entry in a room of a width, in virtual pixels. */
export function cardsPerRow(room: number): number {
    return Math.max(1, Math.floor((room - ENTRY_FRAME + CARD_GAP) / (CARD_WIDTH + CARD_GAP)))
}

/** An entry before it is given its key. */
export type Unkeyed = Omit<Entry, "key">

/** An entry, given the name that tells it among the others of its category. */
function keyed(key: string, entry: Unkeyed): Entry {
    return { ...entry, key }
}

/** The option of hearts: their row above their description. */
function heartsEntry(look: LibraryLook, kind: HeartKind, count: number, text: Text): Unkeyed {
    const hearts = heartsRow(look.theme, Heart.many(kind, count), () => {})
    return { view: cardsOption(look.theme, [], text, { head: hearts }), text }
}

/** The text of hearts: their kind, how many when told, and what they do. */
function heartText(kind: HeartKind, count: number|null): Text {
    return concat(HEART, " ", kind, count === null ? "" : ` ×${count}`, " : ", kind.description)
}

/** The option of a monster or a pet: its picture and cards, and what it has. */
export function monsterEntry(look: LibraryLook, monster: Monster, hero: Hero): Entry {
    const text = concat(
        monster, " : ", new HeartCount(monster.hearts), ", pioche ", String(monster.draw), " : ",
        joinText([...new Set(monster.cards)], ", "), ".",
    )
    const view = unitView(look.theme, look.sprites, hero, { perRow: look.perRow() })
    return { view, text, key: monster.name, value: monster }
}

/** The filters of the cards: the cards that make a module, those that make a beast. */
const CARD_FILTERS: readonly EntryFilter[] = [
    { id: "modules", label: "Modules", test: entry => entry.value instanceof ModuleCard },
    { id: "beasts", label: "Bêtes", test: entry => entry.value instanceof BeastCard },
]

/** The sections of the catalogue, in the order of its tabs. */
export function sections(look: LibraryLook): Section[] {
    const { theme, sprites, perRow } = look
    return [
        {
            // What every hero plays as often as it wishes comes first: a step, and a turn, whose dial is only shown here.
            title: "Cartes",
            group: "Cartes",
            category: "cards",
            filters: CARD_FILTERS,
            entries: () => [...new Set([STEP, TURNS[0], ...ALL_CARDS])].map(card => {
                const text = concat(card, " : ", card.description)
                const view = cardsOption(theme, [card], card.description, { perRow: perRow() })
                return keyed(card.name, { view, text, value: card })
            }),
        },
        {
            title: "Boosters",
            group: "Cartes",
            category: "boosters",
            entries: () => ALL_BOOSTERS.map(booster => {
                return keyed(booster.name, { ...boosterEntry(look, booster), value: booster })
            }),
        },
        {
            title: "Améliorations",
            group: "Cartes",
            category: "upgrades",
            entries: () => ALL_UPGRADES.map(upgrade => keyed(upgrade.name, upgradeEntry(look, upgrade))),
        },
        {
            title: "Aventuriers",
            group: "Unités",
            category: "kits",
            entries: () => ALL_KITS.map(kit => keyed(kit.name, { ...kitEntry(look, kit), value: kit })),
        },
        {
            title: "Monstres",
            group: "Unités",
            category: "monsters",
            entries: () => ALL_MONSTERS.map(monster => monsterEntry(look, monster, foeOf(monster, monster.name))),
        },
        {
            title: "Familiers",
            group: "Unités",
            category: "pets",
            entries: () => ALL_PETS.map(pet => monsterEntry(look, pet, allyOf(pet, pet.name))),
        },
        {
            // Each fight of the floors, the picture of one of its monsters beside its category and what it holds.
            title: "Combats",
            group: "Monde",
            category: "fights",
            entries: () => allFightTypes().filter(type => type !== EMPTY_FIGHT).map(type => {
                const text = concat(type, " (", type.category.name, ") : ", type.description)
                return keyed(type.id, { view: cardsOption(theme, [], text, { sprites, sprite: type.icon }), text })
            }),
        },
        {
            // Each hazard a fight lays out, its picture beside what it does, with the cards its bodies play.
            title: "Hazards",
            group: "Monde",
            category: "hazards",
            entries: () => ALL_HAZARDS.map(hazard => {
                const text = concat(hazard, " : ", hazard.description)
                const cards = [...new Set(hazard.bodies.flatMap(each => each.body.cards ?? []))]
                const view = cardsOption(theme, cards, text, {
                    sprites, sprite: hazard.icon, perRow: perRow(),
                })
                return keyed(hazard.id, { view, text })
            }),
        },
        {
            // Each halt of a map, its token beside what it offers.
            title: "Haltes",
            group: "Monde",
            category: "halts",
            entries: () => allHalts().map(halt => {
                const text = concat(halt.name, " : ", halt.description)
                return keyed(halt.id, { view: cardsOption(theme, [], text, { sprites, sprite: halt.icon }), text })
            }),
        },
        {
            // Each sort of floor, its picture beside what it is.
            title: "Étages",
            group: "Monde",
            category: "floors",
            entries: () => ALL_FLOORS.map(floor => {
                const text = concat(floor.name, " : ", floor.description)
                return keyed(floor.name, { view: cardsOption(theme, [], text, { sprites, sprite: floor.icon }), text })
            }),
        },
        {
            title: "Effets",
            group: "Règles",
            category: "effects",
            entries: () => [...STATUS_TYPES, ...STATUS_FAMILIES].map(type => {
                const text = statusTypeText(type)
                const head = new Box("row", { gap: 4, align: "center" })
                head.add(new AbsItemIcon(theme, sprites, type.visual, "", 2, STATUS_ICON_SIZE))
                head.add(new Label(theme, type.name, { color: CHOSEN_TEXT }))
                return keyed(type.name, { view: cardsOption(theme, [], null, { head }), text })
            }),
        },
        {
            title: "Cœurs",
            group: "Règles",
            category: "hearts",
            entries: () => HEART_KINDS.map(kind => keyed(kind.name, heartsEntry(look, kind, 1, heartText(kind, null)))),
        },
        {
            title: "Cœurs temporaires",
            group: "Règles",
            category: "tempHearts",
            entries: () => SPENT_LOOT_HEARTS.map(loot => {
                return keyed(lootHeartKey(loot), heartsEntry(look, loot.heart, loot.count, heartText(loot.heart, loot.count)))
            }),
        },
        {
            title: "Cœurs gardés",
            group: "Règles",
            category: "keptHearts",
            entries: () => KEPT_LOOT_HEARTS.map(loot => {
                return keyed(lootHeartKey(loot), heartsEntry(look, loot.heart, loot.count, heartText(loot.heart, loot.count)))
            }),
        },
        {
            title: "Objets",
            group: "Butin",
            category: "items",
            entries: () => ALL_ITEMS.map(item => {
                const text = described(item, item)
                const under = thingBag(theme, sprites, [item], [])
                return keyed(item.name, { view: cardsOption(theme, [], concat("Objet ", text), { under }), text })
            }),
        },
        {
            title: "Utilisables",
            group: "Butin",
            category: "usables",
            entries: () => ALL_USABLES.map(usable => {
                const text = usableText(usable)
                const under = thingBag(theme, sprites, [], [usable])
                return keyed(usable.name, { view: cardsOption(theme, [], text, { under }), text })
            }),
        },
    ]
}
