import { visual } from "@game/core-src/games/mecard/sim/base/Visual"
import { ALL_CARDS } from "@game/core-src/games/mecard/sim/catalog/cards"
import { ALL_ITEMS } from "@game/core-src/games/mecard/sim/catalog/items"
import { ALL_KITS, KIT_HEARTS } from "@game/core-src/games/mecard/sim/catalog/kits"
import { ALL_MONSTERS, monster } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { ALL_PETS } from "@game/core-src/games/mecard/sim/catalog/pets"
import { ALL_USABLES } from "@game/core-src/games/mecard/sim/catalog/usables"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import { HEART_KINDS } from "@game/core-src/games/mecard/sim/save/catalogNames"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"
import type { Kit } from "@game/core-src/games/mecard/sim/catalog/kits"
import type { Monster } from "@game/core-src/games/mecard/sim/catalog/monsters"
import type { HeartGroup } from "@game/core-src/games/mecard/sim/heart/Heart"
import type { HeartKind } from "@game/core-src/games/mecard/sim/heart/HeartKind"
import type { Item } from "@game/core-src/games/mecard/sim/item/Item"
import type { Usable } from "@game/core-src/games/mecard/sim/usable/Usable"

import { normalize, UsageError, unknownName } from "./errors"

export type { HeartGroup }

/** The hearts of a kit of the game: how many red ones, and the groups of the other kinds. */
export function heartsOfKit(kit: Kit): { hearts: number, bonus: HeartGroup[] } {
    return {
        hearts: kit.hearts.filter(group => group.kind === RED_HEART).reduce((sum, group) => sum + group.count, 0),
        bonus: kit.hearts.filter(group => group.kind !== RED_HEART),
    }
}

/** A kit defined on the command line: the kit, the red hearts it starts with and the hearts of other kinds. */
export interface DefinedKit {
    readonly kit: Kit
    readonly hearts: number
    readonly bonus: readonly HeartGroup[]
}

/** A monster defined on the command line: the monster, with the usables only the simulation gives one. */
export interface DefinedMonster extends Monster {
    readonly usables: readonly Usable[]
}

/**
 * The largest number of copies one element asks for: a typo like `Avancer*1000` is more likely than a deck
 * of that size.
 */
const MAX_COPIES = 99

/** How a kit defined from nothing looks, a key nothing resolves. */
const CUSTOM_SPRITE = visual("units/custom")

/** The things a definition names, found by name. */
interface Namespace<T extends { readonly name: string }> {
    readonly what: string
    readonly all: readonly T[]
}

const CARDS: Namespace<Card> = { what: "carte", all: ALL_CARDS }
const ITEMS: Namespace<Item> = { what: "objet", all: ALL_ITEMS }
const USABLES: Namespace<Usable> = { what: "usable", all: ALL_USABLES }

function find<T extends { readonly name: string }>(space: Namespace<T>, name: string): T|undefined {
    const wanted = normalize(name)
    return space.all.find(each => normalize(each.name) === wanted)
}

/** What a definition starts from, with the deck and what it carries. */
interface Base {
    readonly name: string
    readonly cards: readonly Card[]
    readonly items: readonly Item[]
    readonly usables: readonly Usable[]
    readonly hearts: number
    readonly bonus: readonly HeartGroup[]
    readonly sprite: Kit["sprite"]
    readonly monster: Monster|null
}

/**
 * What `@name` stands for in a definition: a kit of the game, else a monster or a pet.
 *
 * @throws {@link UsageError} When nothing has the name, or a kit and a monster do.
 */
function baseOf(text: string, where: string): Base {
    const typed = /^(kit|monster|pet):(.*)$/i.exec(text)
    const kind = typed?.[1].toLowerCase() ?? null
    const name = (typed?.[2] ?? text).trim()
    const wanted = normalize(name)
    const found: Base[] = []
    const kitBase = (kit: Kit, hearts: number, bonus: readonly HeartGroup[]): Base => ({
        name: kit.name,
        cards: kit.cards,
        items: kit.items,
        usables: kit.usables,
        hearts,
        bonus,
        sprite: kit.sprite,
        monster: null,
    })
    const monsterBase = (each: Monster): Base => ({
        name: each.name,
        cards: each.cards,
        items: each.items ?? [],
        usables: [],
        hearts: each.hearts,
        bonus: [],
        sprite: each.sprite,
        monster: each,
    })
    if(kind === null || kind === "kit"){
        const official = ALL_KITS.find(each => normalize(each.name) === wanted)
        if(official){
            const { hearts, bonus } = heartsOfKit(official)
            found.push(kitBase(official, hearts, bonus))
        }
    }
    if(kind === null || kind === "monster" || kind === "pet"){
        const pool = kind === "pet" ? ALL_PETS : kind === "monster" ? ALL_MONSTERS : [...ALL_MONSTERS, ...ALL_PETS]
        const official = pool.find(each => normalize(each.name) === wanted)
        if(official) found.push(monsterBase(official))
    }
    if(found.length === 0){
        const names = [...ALL_KITS.map(kit => kit.name), ...ALL_MONSTERS.map(each => each.name), ...ALL_PETS.map(each => each.name)]
        throw new UsageError(`${where} : ${unknownName("base @", name, names).message}`)
    }
    if(found.length > 1){
        throw new UsageError(`${where} : « ${name} » existe comme kit et comme monstre : écrire @kit:${name} ou @monster:${name}.`)
    }
    return found[0]
}

/** An element, `Name` or `Name*3`. */
function counted(text: string, where: string): { name: string, count: number } {
    const match = /^(.*?)\s*\*\s*(.*)$/.exec(text)
    if(!match) return { name: text.trim(), count: 1 }
    if(!/^\d+$/.test(match[2]) || Number(match[2]) < 1 || Number(match[2]) > MAX_COPIES){
        throw new UsageError(`${where} : « ${text} » : après * un nombre entre 1 et ${MAX_COPIES} est attendu.`)
    }
    return { name: match[1].trim(), count: Number(match[2]) }
}

/** A whole number a key of a definition is given. */
function numberOf(text: string, key: string, where: string): number {
    if(!/^\d+$/.test(text.trim()) || Number(text) < 1) throw new UsageError(`${where} : ${key}: attend un entier ≥ 1, reçu « ${text} ».`)
    return Number(text)
}

/** How many names a removal error lists of what is there. */
const LISTED_NAMES = 8

/**
 * Remove copies of something from a list by name, the first ones found.
 *
 * @param from - Where they are looked for, as an error names it: `le deck de @Lancier`.
 * @throws {@link UsageError} When the list holds fewer copies than asked, said with how many it holds.
 */
function removeFrom<T extends { readonly name: string }>(
    list: T[], name: string, count: number, from: string, where: string,
): void {
    const wanted = normalize(name)
    const present = list.filter(each => normalize(each.name) === wanted).length
    if(present < count){
        const names = [...new Set(list.map(each => each.name))]
        const listed = names.length === 0 ? "" : ` (${names.slice(0, LISTED_NAMES).join(", ")}${names.length > LISTED_NAMES ? ", …" : ""})`
        const reason = present === 0 ? `« ${name} » n'est pas dans ${from}${listed}` : `il n'y en a que ${present} dans ${from}`
        throw new UsageError(`${where} : -${name}${count > 1 ? `*${count}` : ""} : ${reason}.`)
    }
    for(let done = 0; done < count; done++){
        list.splice(list.findIndex(each => normalize(each.name) === wanted), 1)
    }
}

/** What a definition says of the thing it defines, before it is made. */
interface Draft {
    cards: Card[]
    items: Item[]
    usables: Usable[]
    hearts: number|null

    /** The hearts of other kinds than red, one group for each kind. */
    bonus: HeartGroup[]
    draw: number|null
    size: number|null
}

/**
 * Read one definition, `Name=element,element`, into a kit or a monster.
 *
 * @param text - The definition.
 * @param label - How an error names where it is written: `--match`.
 * @throws {@link UsageError} On whatever is wrong with it, said with the name and the thing at fault.
 */
export function parseDefinition(text: string, label: string): DefinedKit|DefinedMonster {
    const equals = text.indexOf("=")
    if(equals < 0) throw new UsageError(`${label} « ${text} » : une définition s'écrit Nom=élément,élément (le = manque).`)
    const name = text.slice(0, equals).trim()
    if(name === "") throw new UsageError(`${label} « ${text} » : le nom avant le = est vide.`)
    const where = `${label} « ${name} »`
    const elements = text.slice(equals + 1).split(",").map(element => element.trim())
    if(elements.some(element => element === "")) throw new UsageError(`${where} : élément vide (virgule en trop ?).`)
    if(elements.length === 0) throw new UsageError(`${where} : aucun élément.`)

    const baseTexts = elements.filter(element => element.startsWith("@"))
    if(baseTexts.length > 1) throw new UsageError(`${where} : une seule base @ est permise, reçu ${baseTexts.join(" et ")}.`)
    const base = baseTexts.length === 1 ? baseOf(baseTexts[0].slice(1), where) : null
    const rest = elements.filter(element => !element.startsWith("@"))
    const owner = base ? `@${base.name}` : "la définition"

    const monstrous = base?.monster != null || rest.some(element => /^(draw|size):/i.test(element))
    const draft: Draft = {
        cards: [...base?.cards ?? []], items: [...base?.items ?? []], usables: [...base?.usables ?? []],
        hearts: base?.hearts ?? null,
        bonus: [...base?.bonus ?? []],
        draw: base?.monster?.draw ?? null,
        size: base?.monster?.size ?? null,
    }
    for(const element of rest) applyElement(element, draft, { where, owner, monstrous })

    if(draft.cards.length === 0) throw new UsageError(`${where} : le deck est vide (aucune carte).`)
    if(monstrous){
        if(draft.hearts === null || draft.hearts < 1) throw new UsageError(`${where} : un monstre sans @Base a besoin de heart:rouge*N.`)
        if(draft.draw === null) throw new UsageError(`${where} : un monstre sans @Base a besoin de draw:N.`)
        const made = monster({
            name, sprite: base?.sprite ?? CUSTOM_SPRITE,
            hearts: draft.hearts, draw: draft.draw,
            ...draft.size === null ? {} : { size: draft.size },
            cards: draft.cards,
            items: draft.items,
        })
        return { ...made, usables: draft.usables }
    }
    // A kit that names no heart starts with the usual red ones; one that names some has exactly those.
    const hearts = draft.hearts ?? (draft.bonus.length === 0 ? KIT_HEARTS : 0)
    if(hearts + draft.bonus.reduce((sum, group) => sum + group.count, 0) < 1){
        throw new UsageError(`${where} : aucun cœur : ajouter heart:rouge*N (ou un autre type).`)
    }
    return {
        kit: {
            name,
            sprite: base?.sprite ?? CUSTOM_SPRITE,
            cards: draft.cards,
            items: draft.items,
            usables: draft.usables,
            hearts: [{ kind: RED_HEART, count: hearts }, ...draft.bonus],
        },
        hearts,
        bonus: draft.bonus,
    }
}

/** The kind of heart a name stands for. */
function heartKindOf(name: string, where: string): HeartKind {
    const wanted = normalize(name)
    const found = HEART_KINDS.find(kind => normalize(kind.name) === wanted)
    if(found === undefined){
        throw new UsageError(`${where} : ${unknownName("cœur", name, HEART_KINDS.map(kind => kind.name)).message}`)
    }
    return found
}

/** Add red hearts to what a definition starts with, or remove some of them. */
function changeRed(draft: Draft, count: number, removing: boolean, where: string): void {
    const present = draft.hearts ?? 0
    if(removing && present < count){
        throw new UsageError(`${where} : -heart:rouge*${count} : il n'y en a que ${present}.`)
    }
    draft.hearts = removing ? present - count : present + count
}

/** Add hearts of a kind to the groups of a kit, or remove some of them. */
function changeHearts(draft: Draft, kind: HeartKind, count: number, removing: boolean, where: string): void {
    const at = draft.bonus.findIndex(group => group.kind === kind)
    const present = at < 0 ? 0 : draft.bonus[at].count
    if(removing){
        if(present < count){
            throw new UsageError(`${where} : -heart:${kind.name}*${count} : il n'y en a que ${present}.`)
        }
        if(present === count) draft.bonus.splice(at, 1)
        else draft.bonus[at] = { kind, count: present - count }
        return
    }
    if(at < 0) draft.bonus.push({ kind, count })
    else draft.bonus[at] = { kind, count: present + count }
}

/** Apply one element of a definition to what it builds. */
function applyElement(
    element: string, draft: Draft, context: { where: string, owner: string, monstrous: boolean },
): void {
    const { where, owner, monstrous } = context
    const keyed = /^(draw|size):(.*)$/i.exec(element)
    if(keyed){
        const key = keyed[1].toLowerCase()
        const value = numberOf(keyed[2], key, where)
        if(key === "draw") draft.draw = value
        else draft.size = value
        return
    }
    const removing = element.startsWith("-")
    const body = removing ? element.slice(1).trim() : element
    const hearts = /^heart:(.*)$/i.exec(body)
    if(hearts){
        const { name, count } = counted(hearts[1], where)
        if(name === "") throw new UsageError(`${where} : « ${element} » : nom de cœur manquant.`)
        const kind = heartKindOf(name, where)
        if(kind === RED_HEART) changeRed(draft, count, removing, where)
        else if(monstrous) throw new UsageError(`${where} : heart:${name} refusé sur un monstre (il n'a que des cœurs rouges).`)
        else changeHearts(draft, kind, count, removing, where)
        return
    }
    const prefixed = /^(item|usable|card):(.*)$/i.exec(body)
    const kind = prefixed?.[1].toLowerCase() ?? "card"
    const { name, count } = counted(prefixed?.[2] ?? body, where)
    if(name === "") throw new UsageError(`${where} : « ${element} » : nom manquant.`)
    const space = kind === "item" ? ITEMS : kind === "usable" ? USABLES : CARDS
    const list: { name: string }[] = kind === "item" ? draft.items : kind === "usable" ? draft.usables : draft.cards
    if(removing){
        removeFrom(list, name, count, `${kind === "item" ? "les objets" : kind === "usable" ? "les usables" : "le deck"} de ${owner}`, where)
        return
    }
    const found = find(space as Namespace<{ name: string }>, name)
    if(found === undefined){
        throw new UsageError(`${where} : ${unknownName(space.what, name, space.all.map(each => each.name)).message}`)
    }
    for(let index = 0; index < count; index++) list.push(found)
}
