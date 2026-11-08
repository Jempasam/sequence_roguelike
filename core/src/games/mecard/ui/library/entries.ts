import { Box, Label } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import { CHOSEN_TEXT } from "../look/theme"
import { AbsItemIcon, STATUS_ICON_SIZE, THING_ICON_SIZE, usesText } from "../hud/AbsItemIcon"
import { concat, joinText } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import type { Card } from "../../sim/card/Card"
import { ALL_BOOSTERS } from "../../sim/catalog/boosters"
import { ALL_ITEMS, LOOT_CARDS, ALL_USABLES } from "../../sim/catalog/index"
import { ALL_KITS } from "../../sim/catalog/kits"
import { ALL_MONSTERS } from "../../sim/catalog/monsters"
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
import { cardsOption, unitHead } from "../hud/ChoiceOptions"
import { heartsRow } from "../hud/HeartView"
import type { UnitSprites } from "../look/UnitSprites"

/** Something the catalogue shows: how it looks in the list, and what the box of details says of it. */
export interface Entry {
    readonly view: Component
    readonly text: Text
}

/** A tab of the catalogue: its title, and the entries it lists, made when it is shown. */
export interface Section {
    readonly title: string
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

/** The sections of the catalogue, in the order of its tabs. */
export function sections(look: LibraryLook): Section[] {
    const { theme, sprites, onCard, perRow } = look
    return [
        {
            title: "Cartes",
            entries: () => LOOT_CARDS.map(card => {
                const text = concat(card, " : ", card.description)
                return { view: cardsOption(theme, [card], card.description, { onCardHover: onCard, perRow: perRow() }), text }
            }),
        },
        {
            title: "Cœurs",
            entries: () => HEART_KINDS.map(kind => heartsEntry(look, kind, 1, heartText(kind, null))),
        },
        {
            title: "Cœurs temporaires",
            entries: () => SPENT_LOOT_HEARTS.map(({ heart, count }) => {
                return heartsEntry(look, heart, count, heartText(heart, count))
            }),
        },
        {
            title: "Cœurs gardés",
            entries: () => KEPT_LOOT_HEARTS.map(({ heart, count }) => {
                return heartsEntry(look, heart, count, heartText(heart, count))
            }),
        },
        {
            title: "Aventuriers",
            entries: () => ALL_KITS.map(kit => kitEntry(look, kit)),
        },
        {
            title: "Monstres",
            entries: () => ALL_MONSTERS.map(monster => {
                const hero = allyOf(monster, monster.name)
                const text = concat(
                    monster, " : ", String(monster.hearts), " cœurs, pioche ", String(monster.draw), " : ",
                    joinText([...new Set(monster.cards)], ", "), ".",
                )
                const view = cardsOption(theme, [...new Set(monster.cards)], null, {
                    head: unitHead(theme, hero, sprites), onCardHover: onCard, perRow: perRow(),
                })
                return { view, text }
            }),
        },
        {
            title: "Effets",
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
            title: "Objets",
            entries: () => ALL_ITEMS.map(item => {
                const text = described(item, item)
                const thing = new AbsItemIcon(theme, sprites, item.icon, "", 1, THING_ICON_SIZE)
                return { view: cardsOption(theme, [], concat("Objet ", text), { thing }), text }
            }),
        },
        {
            title: "Utilisables",
            entries: () => ALL_USABLES.map(usable => {
                const text = usableText(usable)
                const thing = new AbsItemIcon(theme, sprites, usable.icon, usesText(usable) ?? "", 1, THING_ICON_SIZE)
                return { view: cardsOption(theme, [], text, { thing }), text }
            }),
        },
        {
            title: "Boosters",
            entries: () => ALL_BOOSTERS.map(booster => boosterEntry(look, booster)),
        },
        {
            title: "Améliorations",
            entries: () => ALL_UPGRADES.map(upgrade => upgradeEntry(look, upgrade)),
        },
    ]
}
