import { rgba } from "../base/Rgba"
import { Vector2 } from "../base/Vector2"
import type { Rgba } from "../base/Rgba"
import { Arena } from "../battle/Arena"
import { Battle } from "../battle/Battle"
import { Team } from "../battle/Team"
import type { Area } from "../battle/Area"
import type { BattleState, UnitState } from "../battle/BattleState"
import type { Controller, StatBases } from "../battle/Unit"
import { CardChain } from "../card/CardChain"
import type { Card } from "../card/Card"
import { SECRET_CARD } from "../card/subs/SecretCard"
import { FusionCard } from "../card/subs/composite/FusionCard"
import { MergedCard } from "../card/subs/composite/MergedCard"
import { RandomCard } from "../card/subs/composite/RandomCard"
import { Heart } from "../heart/Heart"
import { Carried } from "../usable/Usable"
import type { Status } from "../status/Status"

import { CARD_NAMES, HEART_NAMES, ITEM_NAMES, STATUS_NAMES, USABLE_NAMES } from "./catalogNames"
import type { StatusData } from "./catalogNames"

/** The version of the shape of a save, raised whenever it changes, so an old save is refused clearly. */
export const BATTLE_SAVE_VERSION = 13

/** A point or a direction, as `[x, y]`. */
type SavedVector = readonly [number, number]

/** A color, as `[r, g, b, a]`. */
type SavedColor = readonly [number, number, number, number]

/**
 * A card: by its name in the catalog, or for a card holding cards made during the run, which no catalog
 * holds, by its kind and its cards, in order.
 */
export type SavedCard =
    | string
    | { readonly fused: readonly SavedCard[] }
    | { readonly merged: readonly SavedCard[] }
    | { readonly random: readonly SavedCard[] }

export interface SavedTeam {
    readonly name: string
    readonly color: SavedColor|null
}

/** The two piles of a deck. */
export interface SavedDeck {
    readonly pile: readonly SavedCard[]
    readonly discard: readonly SavedCard[]
}

export interface SavedUnit {
    readonly name: string

    /** Its picture, by its name among the sprites of the units, none for one with no picture. */
    readonly sprite: string|null

    /** Its team, by its index in {@link BattleSave.teams}. */
    readonly team: number

    readonly controller: Controller
    readonly position: SavedVector
    readonly direction: SavedVector

    /** Each heart, by the name of its kind, and whether it is empty. */
    readonly hearts: readonly (readonly [string, boolean])[]

    /** The cards of its hand. */
    readonly hand: readonly SavedCard[]

    /** The draw pile (the next one last) and the discard of each of its decks. */
    readonly decks: readonly SavedDeck[]

    /** The deck it draws from next, by its place among them. */
    readonly cursor: number

    /** The cards out of its decks, each with the deck it goes back to. */
    readonly homes: readonly (readonly [SavedCard, number])[]

    readonly items: readonly string[]

    /** What it carries to use, each by name, with the charges it has left. */
    readonly usables: readonly (readonly [string, number])[]

    /** Each status, by the name of its kind, and what it holds. */
    readonly statuses: readonly (readonly [string, StatusData])[]

    readonly bases: StatBases

    /** Does it count for its team? */
    readonly decisive: boolean

    /** The ground it covers, for a body lying on it, none for one standing. */
    readonly zone: SavedArea|null
}

/** A zone of the arena, written down: its kind, and its points as pairs. */
export type SavedArea =
    | { readonly kind: "circle", readonly center: SavedVector, readonly radius: number }
    | {
        readonly kind: "sector", readonly center: SavedVector, readonly direction: SavedVector,
        readonly radius: number, readonly cosHalf: number,
    }
    | { readonly kind: "segment", readonly from: SavedVector, readonly to: SavedVector, readonly width: number }
    | {
        readonly kind: "crescent", readonly center: SavedVector, readonly direction: SavedVector,
        readonly inner: number, readonly radius: number, readonly cosHalf: number,
    }

/**
 * A battle at a rest, written down as JSON: what {@link BattleState} holds, every card, item, heart and
 * status by its name in the catalog, every unit by its index.
 */
export interface BattleSave {
    readonly version: number
    readonly arena: {
        readonly width: number
        readonly height: number
    }
    readonly rng: number
    readonly round: number
    readonly phase: "draw"|"preparation"|"over"

    /** The team left standing, by its index, none during the battle and for a draw. */
    readonly winner: number|null

    readonly teams: readonly SavedTeam[]
    readonly units: readonly SavedUnit[]
    readonly initiative: readonly number[]

    /** The chain each unit committed this round, by the index of the unit, its cards in order. */
    readonly plans: readonly { readonly unit: number, readonly cards: readonly SavedCard[] }[]

    /** The cards that left the hand of each unit for its chain, by the index of the unit. */
    readonly played: readonly { readonly unit: number, readonly cards: readonly SavedCard[] }[]

    /**
     * What each unit chose to use at the start of the execution, by the index of the unit, each by its
     * place in the belt of the unit.
     */
    readonly activated: readonly { readonly unit: number, readonly usables: readonly number[] }[]

    /** Who summoned each summoned body, by the index of the body, then of its owner. */
    readonly owners: readonly (readonly [number, number])[]

}

/** How a battle is written down. */
export interface SaveOptions {
    /**
     * Are the cards of the draw piles written as the secret card, for a viewer who must not see what anyone
     * draws next? Nothing draws during an execution, so a viewer still plays the round the same.
     */
    readonly secret?: boolean
}

/**
 * A battle written down, to load again with {@link loadBattle}.
 *
 * @throws {@link Error} During an execution, which cannot be written down.
 */
export function saveBattle(battle: Battle, options: SaveOptions = {}): BattleSave {
    const state = battle.state()
    const teams = [...new Set(state.units.map(unit => unit.spec.team))]
    const pile = (cards: readonly Card[]) => {
        return cards.map(card => options.secret ? SECRET_CARD.name : savedCard(card))
    }
    return {
        version: BATTLE_SAVE_VERSION,
        arena: { width: state.arena.width, height: state.arena.height },
        rng: state.rng, round: state.round, phase: state.phase,
        winner: state.winner ? teams.indexOf(state.winner) : null,
        teams: teams.map(team => ({ name: team.name, color: team.color ? colorOf(team.color) : null })),
        units: state.units.map(unit => savedUnit(unit, teams.indexOf(unit.spec.team), pile)),
        initiative: [...state.initiative],
        plans: [...state.plans].map(([unit, chain]) => ({ unit, cards: chain.cards.map(savedCard) })),
        played: [...state.played].map(([unit, cards]) => ({ unit, cards: cards.map(savedCard) })),
        activated: [...state.activated].map(([unit, used]) => {
            const belt = state.units[unit].spec.usables ?? []
            return { unit, usables: used.map(each => belt.indexOf(each)) }
        }),
        owners: [...state.owners],
    }
}

/**
 * The battle a save writes down, playing as the one it was taken from.
 *
 * @throws {@link Error} When the save is of another version, or names something the catalog does not have.
 */
export function loadBattle(save: BattleSave): Battle {
    return Battle.restore(battleStateOf(save))
}

/**
 * What a save writes down, as a battle reads it.
 *
 * @throws {@link Error} When the save is of another version, or names something the catalog does not have.
 */
export function battleStateOf(save: BattleSave): BattleState {
    if(save.version !== BATTLE_SAVE_VERSION){
        throw new Error(`A battle save of version ${save.version} cannot be loaded by version ${BATTLE_SAVE_VERSION}.`)
    }
    const teams = save.teams.map(team => new Team(team.name, team.color ? rgba(...team.color) : null))
    const card = cardLoader()
    const units = save.units.map(unit => loadedUnit(unit, teams, card))
    return {
        arena: new Arena(save.arena.width, save.arena.height),
        rng: save.rng, round: save.round, phase: save.phase,
        winner: save.winner === null ? null : teams[save.winner],
        units,
        initiative: save.initiative,
        plans: new Map(save.plans.map(({ unit, cards }) => [unit, new CardChain(cards.map(card))])),
        played: new Map(save.played.map(({ unit, cards }) => [unit, cards.map(card)])),
        activated: new Map(save.activated.map(({ unit, usables }) => {
            const belt = units[unit].spec.usables ?? []
            return [unit, usables.map(index => belt[index])]
        })),
        owners: new Map(save.owners),
    }
}


function colorOf({ r, g, b, a }: Rgba): SavedColor {
    return [r, g, b, a]
}

/** A zone of the arena, written down. */
function savedArea(area: Area): SavedArea {
    const pair = (point: Vector2): SavedVector => [point.x, point.y]
    switch(area.kind){
        case "circle": return { kind: "circle", center: pair(area.center), radius: area.radius }
        case "sector": return {
            kind: "sector", center: pair(area.center), direction: pair(area.direction), radius: area.radius,
            cosHalf: area.cosHalf,
        }
        case "segment": return { kind: "segment", from: pair(area.from), to: pair(area.to), width: area.width }
        case "crescent": return {
            kind: "crescent", center: pair(area.center), direction: pair(area.direction), inner: area.inner,
            radius: area.radius, cosHalf: area.cosHalf,
        }
        default: throw new Error("An area of an unknown kind was saved.")
    }
}

/** A zone of the arena, read back. */
function loadedArea(saved: SavedArea): Area {
    switch(saved.kind){
        case "circle": return { kind: "circle", center: new Vector2(...saved.center), radius: saved.radius }
        case "sector": return {
            kind: "sector", center: new Vector2(...saved.center), direction: new Vector2(...saved.direction),
            radius: saved.radius, cosHalf: saved.cosHalf,
        }
        case "segment": return {
            kind: "segment", from: new Vector2(...saved.from), to: new Vector2(...saved.to), width: saved.width,
        }
        case "crescent": return {
            kind: "crescent", center: new Vector2(...saved.center), direction: new Vector2(...saved.direction),
            inner: saved.inner, radius: saved.radius, cosHalf: saved.cosHalf,
        }
        default: throw new Error("An area of an unknown kind was loaded: the save is corrupted.")
    }
}

/** @throws {@link Error} For a card neither of the catalog nor holding cards. */
export function savedCard(card: Card): SavedCard {
    if(CARD_NAMES.has(card)) return card.name
    if(card instanceof FusionCard) return { fused: card.contents.map(savedCard) }
    if(card instanceof MergedCard) return { merged: card.contents.map(savedCard) }
    if(card instanceof RandomCard) return { random: card.contents.map(savedCard) }
    throw new Error(`${card.name} is not in the catalog: it cannot be saved.`)
}

/**
 * The cards of a hand that cards written down stand for, each card of the hand taken once. They are looked
 * for rather than loaded: a card holding cards loaded anew is another card than the one in the hand.
 *
 * @throws {@link Error} For a card the hand does not hold.
 */
export function cardsInHand(hand: readonly Card[], saved: readonly SavedCard[]): Card[] {
    const left = [...hand]
    const texts = left.map(card => JSON.stringify(savedCard(card)))
    return saved.map(each => {
        const index = texts.indexOf(JSON.stringify(each))
        if(index < 0) throw new Error(`The hand holds no ${JSON.stringify(each)}.`)
        texts.splice(index, 1)
        return left.splice(index, 1)[0]
    })
}

/**
 * What loads the cards of one save: a name from the catalog, a card holding cards made again from them.
 * The cards made of the same cards are made once, so the copies of one in the save are one card again, as
 * they were in the battle saved.
 */
export function cardLoader(): (saved: SavedCard) => Card {
    const made = new Map<string, Card>()
    const load = (saved: SavedCard): Card => {
        if(typeof saved === "string") return CARD_NAMES.of(saved)
        const key = JSON.stringify(saved)
        const known = made.get(key)
        if(known) return known
        const card = "fused" in saved ? new FusionCard(saved.fused.map(load))
            : "merged" in saved ? new MergedCard(...pair(saved.merged.map(load)))
                : new RandomCard(...pair(saved.random.map(load)))
        made.set(key, card)
        return card
    }
    return load
}

/** @throws {@link Error} For anything but two cards. */
function pair(cards: readonly Card[]): [Card, Card] {
    if(cards.length !== 2) throw new Error(`A card holding two cards holds ${cards.length}: the save is corrupted.`)
    return [cards[0], cards[1]]
}

/**
 * The decks the cards in hand go back to, the same cards side by side. Two cards made of the same cards load
 * as one, so without that order a save would change on being loaded. The cards of a kind keep their order,
 * the last of them going back first.
 */
function savedHomes(homes: UnitState["homes"]): (readonly [SavedCard, number])[] {
    const kinds = new Map<string, (readonly [SavedCard, number])[]>()
    for(const [card, deck] of homes){
        const saved = savedCard(card)
        const key = JSON.stringify(saved)
        const kind = kinds.get(key) ?? []
        kind.push([saved, deck])
        kinds.set(key, kind)
    }
    return [...kinds.values()].flat()
}

function savedUnit(unit: UnitState, team: number, pile: (cards: readonly Card[]) => SavedCard[]): SavedUnit {
    const { spec } = unit
    return {
        name: spec.name, sprite: spec.sprite ?? null, team, controller: spec.controller,
        position: [spec.position.x, spec.position.y], direction: [spec.direction.x, spec.direction.y],
        hearts: spec.hearts.map(heart => [heart.kind.name, heart.isEmpty]),
        hand: unit.hand.map(savedCard),
        decks: unit.decks.map(deck => ({ pile: pile(deck.pile), discard: deck.discard.map(savedCard) })),
        cursor: unit.cursor, homes: savedHomes(unit.homes),
        items: (spec.items ?? []).map(item => item.name),
        usables: (spec.usables ?? []).map(each => [each.usable.name, each.charges]),
        statuses: unit.statuses.map(status => [status.type.name, savedStatus(status)]),
        bases: unit.bases,
        decisive: spec.decisive ?? true,
        zone: spec.zone ? savedArea(spec.zone) : null,
    }
}

function savedStatus(status: Status): StatusData {
    return STATUS_NAMES.of(status.type.name).codec.save(status)
}

function loadedUnit(unit: SavedUnit, teams: readonly Team[], card: (saved: SavedCard) => Card): UnitState {
    const cards = (saved: readonly SavedCard[]) => saved.map(card)
    return {
        spec: {
            name: unit.name, sprite: unit.sprite, team: teams[unit.team], controller: unit.controller,
            position: new Vector2(...unit.position), direction: new Vector2(...unit.direction),
            hearts: unit.hearts.map(([kind, isEmpty]) => new Heart(HEART_NAMES.of(kind), isEmpty)),
            decks: unit.decks.map(() => []), items: unit.items.map(name => ITEM_NAMES.of(name)),
            usables: unit.usables.map(([name, charges]) => new Carried(USABLE_NAMES.of(name), charges)),
            decisive: unit.decisive, zone: unit.zone ? loadedArea(unit.zone) : null,
        },
        hand: cards(unit.hand),
        decks: unit.decks.map(deck => ({ pile: cards(deck.pile), discard: cards(deck.discard) })),
        cursor: unit.cursor, homes: unit.homes.map(([saved, deck]) => [card(saved), deck]),
        statuses: unit.statuses.map(([kind, data]) => STATUS_NAMES.of(kind).codec.load(data)),
        bases: unit.bases,
    }
}
