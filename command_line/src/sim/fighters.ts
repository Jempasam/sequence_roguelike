import { ALL_KITS } from "@game/core-src/games/mecard/sim/catalog/kits"
import { ALL_MONSTERS } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { ALL_PETS } from "@game/core-src/games/mecard/sim/catalog/pets"
import { Heart } from "@game/core-src/games/mecard/sim/heart/Heart"
import { allyOf, foeOf, heroOf, redHearts } from "@game/core-src/games/mecard/sim/run/Hero"
import { Carried } from "@game/core-src/games/mecard/sim/usable/Usable"
import type { UnitSpec } from "@game/core-src/games/mecard/sim/battle/Unit"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"
import type { Kit } from "@game/core-src/games/mecard/sim/catalog/kits"
import type { Monster } from "@game/core-src/games/mecard/sim/catalog/monsters"
import type { HeartGroup } from "@game/core-src/games/mecard/sim/heart/Heart"
import type { Item } from "@game/core-src/games/mecard/sim/item/Item"
import type { Usable } from "@game/core-src/games/mecard/sim/usable/Usable"

import { heartsOfKit } from "./define"
import { normalize, UsageError, unknownName } from "./errors"

export type FighterKind = "kit"|"monster"|"pet"

/** What a fighter brings to a battle, made new each time: nothing leaks from one battle to the next. */
export interface Body {
    readonly hearts: Heart[]
    readonly decks: Card[][]

    /** The cards it plays unlimited, as the game gives them: a hero's step and turns, none for a monster. */
    readonly unlimited: readonly Card[]
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

    /** What it brings as a foe of a floor of a level, none for a kit, which brings the same on both sides. */
    readonly foeBody: ((level: number) => Body)|null
}

/** Are two fighters the same one: a kind and a name are what tell them apart. */
export function sameFighter(first: Fighter, second: Fighter): boolean {
    return first.kind === second.kind && first.name === second.name
}

/** The groups of fighters a name may stand for. */
export const GROUPS = ["kits", "monsters", "pets", "all"] as const
export type Group = typeof GROUPS[number]

const KIND_NAMES: Record<FighterKind, string> = { kit: "kit", monster: "monstre", pet: "familier" }

export function kitFighter(kit: Kit, hearts: number, bonus: readonly HeartGroup[], custom: boolean): Fighter {
    return {
        name: kit.name, kind: "kit", custom, monster: null, foeBody: null,
        body(): Body {
            const hero = heroOf(kit)
            return {
                hearts: [...redHearts(hearts), ...bonus.flatMap(group => Heart.many(group.kind, group.count))],
                decks: hero.decks,
                unlimited: hero.unlimited,
                items: hero.items,
                usables: hero.usables,
                bases: hero.bases,
            }
        },
    }
}

/**
 * A fighter made of a monster or a pet.
 *
 * @param usables - What it can use on either side, which no monster of the game has.
 */
export function monsterFighter(
    monster: Monster, kind: "monster"|"pet", custom: boolean, usables: readonly Usable[] = [],
): Fighter {
    const bodyOf = ({ hearts, decks, unlimited, items, bases }: ReturnType<typeof foeOf>): Body => ({
        hearts, decks, unlimited, items, bases,
        usables: usables.map(usable => new Carried(usable)),
    })
    return {
        name: monster.name, kind, custom, monster,
        body(): Body {
            // A monster keeps its deck in order, a pet is shuffled as a hero's is.
            return bodyOf(kind === "monster" ? foeOf(monster, monster.name) : allyOf(monster, monster.name))
        },
        foeBody(level: number): Body {
            return bodyOf(foeOf(monster, monster.name, level))
        },
    }
}

/** Every fighter, found by name. */
export class Roster {

    public readonly fighters: readonly Fighter[]

    /** The kits, monsters and pets of the game: what the user defines is written in the descriptions. */
    constructor() {
        this.fighters = [
            ...ALL_KITS.map(kit => kitFighter(kit, heartsOfKit(kit).hearts, heartsOfKit(kit).bonus, false)),
            ...ALL_MONSTERS.map(each => monsterFighter(each, "monster", false)),
            ...ALL_PETS.map(each => monsterFighter(each, "pet", false)),
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
