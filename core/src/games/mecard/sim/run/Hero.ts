import type { Text } from "../../../../semantic"
import { colored, rgba } from "../base/Rgba"
import { Vector2 } from "../base/Vector2"
import type { Rgba } from "../base/Rgba"
import { Arena } from "../battle/Arena"
import { Battle } from "../battle/Battle"
import { Team } from "../battle/Team"
import { UnitStats } from "../battle/Unit"
import type { Controller, StatBases } from "../battle/Unit"
import type { Card } from "../card/Card"
import type { Kit } from "../catalog/kits"
import type { Monster } from "../catalog/monsters"
import { Carried } from "../usable/Usable"
import { Heart } from "../heart/Heart"
import { RED_HEART } from "../heart/subs/RedHeartKind"
import type { Item } from "../item/Item"
import type { Visual } from "../base/Visual"

/** The color the names of the heroes and of their team are written in. */
export const HERO_COLOR: Rgba = rgba(0.35, 0.6, 1)

/**
 * A character of the party, kept from one battle to the next: a hero the players plan, or an ally a bot
 * plays. What it is lies in its deck, its hearts, its items and the bases of its stats.
 */
export interface Hero {
    readonly name: string

    /** How it looks, none for one with no picture. */
    readonly sprite: Visual|null

    readonly controller: Controller

    /** Its decks, drawn from in turn, in order: it may have none. */
    readonly decks: Card[][]

    hearts: Heart[]
    readonly items: Item[]

    /** What it carries to use once, during a preparation. */
    readonly usables: Carried[]

    /** The bases of its stats that are not those of every unit. */
    readonly bases: Partial<StatBases>

    /** Its name. */
    toString(): string

    /** Its name, in the color of the heroes. */
    toSemString(): Text
}

/** What a character of the party is made of, without what it tells of itself. */
export type HeroSpec = Omit<Hero, "toString"|"toSemString">

/** A character of the party, telling itself by its name. */
export function hero(spec: HeroSpec): Hero {
    return { ...spec, toString: () => spec.name, toSemString: () => colored(HERO_COLOR, spec.name) }
}

/** A hero the players plan, from a kit, its hearts full. */
export function heroOf(kit: Kit, name = kit.name): Hero {
    return hero({
        name, sprite: kit.sprite, controller: "player", decks: [[...kit.cards]],
        hearts: Heart.groups(kit.hearts), items: [...kit.items],
        usables: kit.usables.map(usable => new Carried(usable)), bases: {},
    })
}

/**
 * An ally a bot plays, from a kind of monster: its hearts and its draw, its deck shuffled as a hero's is,
 * so it is less to be relied on than the loop it plays as a monster.
 */
export function allyOf(monster: Monster, name: string): Hero {
    return hero({
        name, sprite: monster.sprite, controller: "bot", decks: [[...monster.cards]],
        hearts: redHearts(monster.hearts),
        items: [],
        usables: [], bases: { draw: monster.draw, firstDraw: monster.draw, size: monster.size ?? 1 },
    })
}

/** A kind of monster the players plan, as a hero: the ally it would be, in their hands. */
export function recruitOf(monster: Monster, name: string): Hero {
    return hero({ ...allyOf(monster, name), controller: "player" })
}

/**
 * The stats a character enters a battle with: its bases, through the modifiers of its items. Read from its
 * unit alone in a battle of its own, its items plugged in as a battle plugs them.
 */
export function statsOf(character: Hero): UnitStats {
    const battle = new Battle(new Arena(1, 1), 0)
    return battle.add({
        name: character.name, team: new Team(character.name), controller: character.controller,
        position: Vector2.ZERO, direction: Vector2.UP, hearts: character.hearts, decks: character.decks,
        items: character.items, usables: character.usables, bases: character.bases,
    }).stats
}

/** Every card of a character, deck after deck. */
export function allCards(character: Hero): Card[] {
    return character.decks.flat()
}

/** The first deck of a character, made when it has none. */
export function firstDeck(character: Hero): Card[] {
    if(character.decks.length === 0) character.decks.push([])
    return character.decks[0]
}

/** Full red hearts. */
export function redHearts(count: number): Heart[] {
    return Heart.many(RED_HEART, count)
}


//// Merging ////

/** The stats two merged characters add up: how much they draw and how many cards their chain holds. */
const ADDED_STATS: readonly (keyof StatBases)[] = ["draw", "firstDraw", "chainSize"]

/** Stats as a unit starts with, the bases a character falls back on. */
const DEFAULT_STATS = new UnitStats()

/** The base of a stat of a character: its own, else that of every unit. */
export function baseOf<K extends keyof StatBases>(character: Hero, name: K): StatBases[K] {
    return character.bases[name] ?? DEFAULT_STATS[name].base as StatBases[K]
}

/**
 * Two characters made one, as the mad doctor does: their hearts, their decks, each kept apart, their
 * items and what they carry put together; their draws and the size of their chain added up; every other
 * stat the higher of the two. The players plan it when they planned either.
 */
export function merged(first: Hero, second: Hero): Hero {
    const bases: Partial<Record<keyof StatBases, number|boolean>> = {}
    for(const name of Object.keys(DEFAULT_STATS) as (keyof StatBases)[]){
        const a = baseOf(first, name)
        const b = baseOf(second, name)
        if(typeof a === "boolean" || typeof b === "boolean") bases[name] = a === true || b === true
        else bases[name] = ADDED_STATS.includes(name) ? a + b : Math.max(a, b)
    }
    // The hearts of the base life first, then the other kinds, which are the first lost.
    const hearts = Heart.copies([...first.hearts, ...second.hearts])
    const red = hearts.filter(heart => heart.kind.base)
    const special = hearts.filter(heart => !heart.kind.base)
    const either = first.controller === "player" || second.controller === "player"
    return hero({
        name: `${first.name}-${second.name}`, sprite: first.sprite ?? second.sprite,
        controller: either ? "player" : "bot",
        decks: [...first.decks, ...second.decks], hearts: [...red, ...special],
        items: [...first.items, ...second.items], usables: [...first.usables, ...second.usables],
        bases: bases as Partial<StatBases>,
    })
}
