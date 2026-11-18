import { Box, Label } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import { CHOSEN_TEXT } from "../look/theme"
import { AbsItemIcon, STATUS_ICON_SIZE, THING_ICON_SIZE, usesText } from "../hud/AbsItemIcon"
import { concat, joinText } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import type { Card } from "../../sim/card/Card"
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
import { allyOf } from "../../sim/run/Hero"
import { boosterEntry } from "./BoosterEntry"
import { kitEntry } from "./KitEntry"
import { upgradeEntry } from "./UpgradeEntry"
import { KEPT_LOOT_HEARTS, SPENT_LOOT_HEARTS } from "../../sim/run/Run"
import { HEART_KINDS } from "../../sim/save/catalogNames"
import { STATUS_FAMILIES, STATUS_TYPES } from "../../sim/status/statusTypes"
import { usableText, described } from "../../sim/halt/subs/shown"
import { cardsOption, unitOption } from "../hud/ChoiceOptions"
import { heartsRow } from "../hud/HeartView"
import type { UnitSprites } from "../look/UnitSprites"

/** Something the catalogue shows: how it looks in the list, and what the box of details says of it. */
export interface Entry {
    readonly view: Component
    readonly text: Text

    /** What the search reads, the text when none. */
    readonly search?: Text
}

/** A tab of the catalogue: its title, and the entries it lists, made when it is shown. */
export interface Section {
    readonly title: string

    /** The category of the tab: a bar is drawn between two neighbour tabs of different ones. */
    readonly group: string
    entries(): Entry[]
}

/** What the sections need to build their entries. */
export interface LibraryLook {
    readonly theme: Theme
    readonly sprites: UnitSprites

    /** Hear that the pointer came over a card of an entry or left it. */
    readonly onCard: (card: Card, over: boolean) => void

    /** How many cards fit in a row of an entry at the width of the interface now. */
    readonly perRow: () => number
}

/** The option of hearts: their row above their description. */
function heartsEntry(look: LibraryLook, kind: HeartKind, count: number, text: Text): Entry {
    const hearts = heartsRow(look.theme, Heart.many(kind, count), () => {})
    return { view: cardsOption(look.theme, [], text, { head: hearts }), text }
}

/** The text of hearts: their kind, how many when told, and what they do. */
function heartText(kind: HeartKind, count: number|null): Text {
    return concat("Cœur ", kind, count === null ? "" : ` ×${count}`, " : ", kind.description)
}

/** The option of a monster or a pet: its picture and cards, and what it has. */
function monsterEntry(look: LibraryLook, monster: Monster): Entry {
    const hero = allyOf(monster, monster.name)
    const text = concat(
        monster, " : ", String(monster.hearts), " cœurs, pioche ", String(monster.draw), " : ",
        joinText([...new Set(monster.cards)], ", "), ".",
    )
    const view = unitOption(look.theme, hero, look.sprites, [...new Set(monster.cards)], null, {
        onCardHover: look.onCard,
        perRow: look.perRow(),
    })
    return { view, text }
}

/** The sections of the catalogue, in the order of its tabs. */
export function sections(look: LibraryLook): Section[] {
    const { theme, sprites, onCard, perRow } = look
    return [
        {
            // What every hero plays as often as it wishes comes first: a step, and a turn, whose dial is only shown here.
            title: "Cartes",
            group: "Cartes",
            entries: () => [...new Set([STEP, TURNS[0], ...ALL_CARDS])].map(card => {
                const text = concat(card, " : ", card.description)
                return { view: cardsOption(theme, [card], card.description, { onCardHover: onCard, perRow: perRow() }), text }
            }),
        },
        {
            title: "Boosters",
            group: "Cartes",
            entries: () => ALL_BOOSTERS.map(booster => boosterEntry(look, booster)),
        },
        {
            title: "Améliorations",
            group: "Cartes",
            entries: () => ALL_UPGRADES.map(upgrade => upgradeEntry(look, upgrade)),
        },
        {
            title: "Aventuriers",
            group: "Unités",
            entries: () => ALL_KITS.map(kit => kitEntry(look, kit)),
        },
        {
            title: "Monstres",
            group: "Unités",
            entries: () => ALL_MONSTERS.map(monster => monsterEntry(look, monster)),
        },
        {
            title: "Familiers",
            group: "Unités",
            entries: () => ALL_PETS.map(pet => monsterEntry(look, pet)),
        },
        {
            // Each fight of the floors, the picture of one of its monsters beside its category and what it holds.
            title: "Combats",
            group: "Monde",
            entries: () => allFightTypes().filter(type => type !== EMPTY_FIGHT).map(type => {
                const text = concat(type.name, " (", type.category.name, ") : ", type.description)
                return { view: cardsOption(theme, [], text, { sprites, sprite: type.icon }), text }
            }),
        },
        {
            // Each hazard a fight lays out, its picture beside what it does, with the cards its bodies play.
            title: "Hazards",
            group: "Monde",
            entries: () => ALL_HAZARDS.map(hazard => {
                const text = concat(hazard.name, " : ", hazard.description)
                const cards = [...new Set(hazard.bodies.flatMap(each => each.body.cards ?? []))]
                const view = cardsOption(theme, cards, text, {
                    sprites, sprite: hazard.icon, onCardHover: onCard, perRow: perRow(),
                })
                return { view, text }
            }),
        },
        {
            // Each halt of a map, its token beside what it offers.
            title: "Haltes",
            group: "Monde",
            entries: () => allHalts().map(halt => {
                const text = concat(halt.name, " : ", halt.description)
                return { view: cardsOption(theme, [], text, { sprites, sprite: halt.icon }), text }
            }),
        },
        {
            // Each sort of floor, its picture beside what it is.
            title: "Étages",
            group: "Monde",
            entries: () => ALL_FLOORS.map(floor => {
                const text = concat(floor.name, " : ", floor.description)
                return { view: cardsOption(theme, [], text, { sprites, sprite: floor.icon }), text }
            }),
        },
        {
            title: "Effets",
            group: "Règles",
            entries: () => [...STATUS_TYPES, ...STATUS_FAMILIES].map(type => {
                const polarity = { negative: "négatif", positive: "positif", neutral: "neutre" }[type.polarity]
                const text = concat(type, " (", polarity, ") : ", type.description)
                const head = new Box("row", { gap: 4, align: "center" })
                head.add(new AbsItemIcon(theme, sprites, type.visual, "", 2, STATUS_ICON_SIZE))
                head.add(new Label(theme, type.name, { color: CHOSEN_TEXT }))
                return { view: cardsOption(theme, [], null, { head }), text }
            }),
        },
        {
            title: "Cœurs",
            group: "Règles",
            entries: () => HEART_KINDS.map(kind => heartsEntry(look, kind, 1, heartText(kind, null))),
        },
        {
            title: "Cœurs temporaires",
            group: "Règles",
            entries: () => SPENT_LOOT_HEARTS.map(({ heart, count }) => {
                return heartsEntry(look, heart, count, heartText(heart, count))
            }),
        },
        {
            title: "Cœurs gardés",
            group: "Règles",
            entries: () => KEPT_LOOT_HEARTS.map(({ heart, count }) => {
                return heartsEntry(look, heart, count, heartText(heart, count))
            }),
        },
        {
            title: "Objets",
            group: "Butin",
            entries: () => ALL_ITEMS.map(item => {
                const text = described(item, item)
                const thing = new AbsItemIcon(theme, sprites, item.icon, "", 1, THING_ICON_SIZE)
                return { view: cardsOption(theme, [], concat("Objet ", text), { thing }), text }
            }),
        },
        {
            title: "Utilisables",
            group: "Butin",
            entries: () => ALL_USABLES.map(usable => {
                const text = usableText(usable)
                const thing = new AbsItemIcon(theme, sprites, usable.icon, usesText(usable) ?? "", 1, THING_ICON_SIZE)
                return { view: cardsOption(theme, [], text, { thing }), text }
            }),
        },
    ]
}
