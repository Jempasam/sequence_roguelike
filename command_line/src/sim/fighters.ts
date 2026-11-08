import { ALL_KITS, ALL_MONSTERS, ALL_PETS, allyOf, Heart, heroOf, KIT_HEARTS, redHearts } from "@game/core/mecard"
import type { Carried } from "@game/core/mecard"
import type { Card, Item, Kit, Monster, UnitSpec } from "@game/core/mecard"

import type { Definitions, HeartGroup } from "./define"
import { normalize, UsageError, unknownName } from "./errors"

export type FighterKind = "kit"|"monster"|"pet"

/** What a fighter brings to a battle, made new each time: nothing leaks from one battle to the next. */
export interface Body {
    readonly hearts: Heart[]
    readonly decks: Card[][]
    readonly items: Item[]
    readonly usables: Carried[]
    readonly bases: NonNullable<UnitSpec["bases"]>
}

/** Someone the simulation can measure or fight: a kit, a monster or a pet, of the game or the user's. */
export interface Fighter {
    readonly name: string
    readonly kind: FighterKind

    /** Was it defined by the user? */
    readonly custom: boolean

    /** The monster it is, when it is one: it then fights as the game's monsters do. */
    readonly monster: Monster|null

    /** What it brings when it fights on the side of the heroes: a kit as a hero, a monster as an ally. */
    body(): Body
}

/** Are two fighters the same one: a kind and a name are what tell them apart. */
export function sameFighter(first: Fighter, second: Fighter): boolean {
    return first.kind === second.kind && first.name === second.name
}

/** The groups of fighters a name may stand for. */
export const GROUPS = ["kits", "monsters", "pets", "all"] as const
export type Group = typeof GROUPS[number]

const KIND_NAMES: Record<FighterKind, string> = { kit: "kit", monster: "monstre", pet: "familier" }

function kitFighter(kit: Kit, hearts: number, bonus: readonly HeartGroup[], custom: boolean): Fighter {
    return {
        name: kit.name, kind: "kit", custom, monster: null,
        body(): Body {
            const hero = heroOf(kit)
            return {
                hearts: [...redHearts(hearts), ...bonus.flatMap(group => Heart.many(group.kind, group.count))],
                decks: hero.decks,
                items: hero.items,
                usables: hero.usables,
                bases: hero.bases,
            }
        },
    }
}

function monsterFighter(monster: Monster, kind: "monster"|"pet", custom: boolean): Fighter {
    return {
        name: monster.name, kind, custom, monster,
        body(): Body {
            const hero = allyOf(monster, monster.name)
            return {
                hearts: hero.hearts, decks: hero.decks, items: [], usables: [], bases: hero.bases,
            }
        },
    }
}

/** Every fighter, found by name. */
export class Roster {

    public readonly fighters: readonly Fighter[]

    /** The kits and the monsters the user defined replace those of the game that have their name. */
    constructor(definitions: Definitions) {
        const kitNames = new Set(definitions.kits.map(defined => normalize(defined.kit.name)))
        const monsterNames = new Set(definitions.monsters.map(each => normalize(each.name)))
        this.fighters = [
            ...ALL_KITS
                .filter(kit => !kitNames.has(normalize(kit.name)))
                .map(kit => kitFighter(kit, KIT_HEARTS, [], false)),
            ...definitions.kits.map(defined => kitFighter(defined.kit, defined.hearts, defined.bonus, true)),
            ...ALL_MONSTERS.filter(each => !monsterNames.has(normalize(each.name))).map(each => monsterFighter(each, "monster", false)),
            ...ALL_PETS.filter(each => !monsterNames.has(normalize(each.name))).map(each => monsterFighter(each, "pet", false)),
            ...definitions.monsters.map(each => monsterFighter(each, "monster", true)),
        ]
    }

    /** The members of a group, none when the text is no group. */
    public group(text: string): Fighter[]|null {
        switch(normalize(text)){
            case "kits": return this.fighters.filter(each => each.kind === "kit")
            case "monsters": return this.fighters.filter(each => each.kind === "monster")
            case "pets": return this.fighters.filter(each => each.kind === "pet")
            case "all": return [...this.fighters]
            default: return null
        }
    }

    /**
     * The fighter a text names: `Name`, or `kit:Name`, `monster:Name`, `pet:Name` when the name alone is
     * ambiguous.
     *
     * @param option - How an error names where the text came from.
     * @throws {@link UsageError} When nothing has the name, or several do.
     */
    public one(text: string, option: string): Fighter {
        const typed = /^(kit|monster|pet):(.*)$/i.exec(text.trim())
        const kind = typed ? typed[1].toLowerCase() as FighterKind : null
        const name = (typed?.[2] ?? text).trim()
        const wanted = normalize(name)
        const found = this.fighters.filter(
            each => normalize(each.name) === wanted && (kind === null || each.kind === kind),
        )
        if(found.length === 0){
            const pool = this.fighters.filter(each => kind === null || each.kind === kind)
            const error = unknownName(kind === null ? "combattant" : KIND_NAMES[kind], name, pool.map(each => each.name))
            throw new UsageError(`${option} : ${error.message}`)
        }
        if(found.length > 1){
            const kinds = found.map(each => each.kind)
            const alternatives = kinds.map(each => `${each}:${name}`).join(" ou ")
            const as = kinds.map(each => KIND_NAMES[each]).join(" et comme ")
            throw new UsageError(`${option} : « ${name} » existe comme ${as} : écrire ${alternatives}.`)
        }
        return found[0]
    }

    /** The fighters a text names: a group, or one fighter. */
    public many(text: string, option: string): Fighter[] {
        return this.group(text) ?? [this.one(text, option)]
    }
}
