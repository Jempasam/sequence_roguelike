import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import {
    ALL_CARDS, ALL_ITEMS, ALL_KITS, ALL_MONSTERS, ALL_PETS, ALL_USABLES, HEART_KINDS, KIT_HEARTS, monster, RED_HEART,
    visual,
} from "@game/core/mecard"
import type { Card, HeartKind, Item, Kit, Monster, Usable } from "@game/core/mecard"

import { normalize, UsageError, unknownName } from "./errors"

/** Some hearts of one kind. */
export interface HeartGroup {
    readonly kind: HeartKind
    readonly count: number
}

/** A kit defined on the command line: the kit, the red hearts it starts with and the hearts of other kinds. */
export interface DefinedKit {
    readonly kit: Kit
    readonly hearts: number
    readonly bonus: readonly HeartGroup[]
}

/** Every kit and monster the user defined. */
export interface Definitions {
    readonly kits: readonly DefinedKit[]
    readonly monsters: readonly Monster[]
}

export const NO_DEFINITIONS: Definitions = { kits: [], monsters: [] }

/** The definitions gathered so far while they are read. */
interface Collected {
    readonly kits: DefinedKit[]
    readonly monsters: Monster[]
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

/** What the definitions read so far hold, for a later one to start from. */
class Known {

    public readonly kits: DefinedKit[] = []
    public readonly monsters: Monster[] = []

    /** Add a definition, refusing a name that one before already took. */
    public add(name: string, where: string): void {
        const wanted = normalize(name)
        const taken = [...this.kits.map(defined => defined.kit.name), ...this.monsters.map(each => each.name)]
        if(taken.some(each => normalize(each) === wanted)){
            throw new UsageError(`${where} : le nom « ${name} » est déjà défini par une autre définition.`)
        }
    }

    /**
     * What `@name` stands for: a definition made before, else a kit of the game, else a monster or a pet.
     *
     * @throws {@link UsageError} When nothing has the name, or a kit and a monster do.
     */
    public base(text: string, where: string): Base {
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
            items: [],
            usables: [],
            hearts: each.hearts,
            bonus: [],
            sprite: each.sprite,
            monster: each,
        })
        const defined = [...this.kits.map(each => each.kit.name), ...this.monsters.map(each => each.name)]
        if(kind === null || kind === "kit"){
            const own = this.kits.find(each => normalize(each.kit.name) === wanted)
            const official = ALL_KITS.find(each => normalize(each.name) === wanted)
            if(own) found.push(kitBase(own.kit, own.hearts, own.bonus))
            else if(official) found.push(kitBase(official, KIT_HEARTS, []))
        }
        if(kind === null || kind === "monster" || kind === "pet"){
            const own = this.monsters.find(each => normalize(each.name) === wanted)
            const pool = kind === "pet" ? ALL_PETS : kind === "monster" ? ALL_MONSTERS : [...ALL_MONSTERS, ...ALL_PETS]
            const official = pool.find(each => normalize(each.name) === wanted)
            if(own) found.push(monsterBase(own))
            else if(official) found.push(monsterBase(official))
        }
        if(found.length === 0){
            const names = [
                ...defined, ...ALL_KITS.map(kit => kit.name), ...ALL_MONSTERS.map(each => each.name),
                ...ALL_PETS.map(each => each.name),
            ]
            throw new UsageError(`${where} : ${unknownName("base @", name, names).message}`)
        }
        if(found.length > 1){
            throw new UsageError(`${where} : « ${name} » existe comme kit et comme monstre : écrire @kit:${name} ou @monster:${name}.`)
        }
        return found[0]
    }
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
 * @param where - How an error names it: `--def « Name »`, or the line of the file.
 * @throws {@link UsageError} On whatever is wrong with it, said with the name and the thing at fault.
 */
function parseDefinition(text: string, label: string, known: Known): DefinedKit|Monster {
    const equals = text.indexOf("=")
    if(equals < 0) throw new UsageError(`${label} « ${text} » : une définition s'écrit Nom=élément,élément (le = manque).`)
    const name = text.slice(0, equals).trim()
    if(name === "") throw new UsageError(`${label} « ${text} » : le nom avant le = est vide.`)
    const where = `${label} « ${name} »`
    known.add(name, where)
    const elements = text.slice(equals + 1).split(",").map(element => element.trim())
    if(elements.some(element => element === "")) throw new UsageError(`${where} : élément vide (virgule en trop ?).`)
    if(elements.length === 0) throw new UsageError(`${where} : aucun élément.`)

    const baseTexts = elements.filter(element => element.startsWith("@"))
    if(baseTexts.length > 1) throw new UsageError(`${where} : une seule base @ est permise, reçu ${baseTexts.join(" et ")}.`)
    const base = baseTexts.length === 1 ? known.base(baseTexts[0].slice(1), where) : null
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
        return monster({
            name, sprite: base?.sprite ?? CUSTOM_SPRITE,
            hearts: draft.hearts, draw: draft.draw,
            ...draft.size === null ? {} : { size: draft.size },
            cards: draft.cards,
        })
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
    if((kind === "item" || kind === "usable") && monstrous){
        throw new UsageError(`${where} : ${kind}: refusé sur un monstre (un monstre n'a ni objet ni usable).`)
    }
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

/** Read the definitions of a text: one per line or separated by `;`, `#` starting a comment line. */
function parseText(text: string, label: (line: number) => string, known: Known, out: Collected): void {
    text.split(/\r?\n/).forEach((line, index) => {
        if(line.trim().startsWith("#")) return
        for(const part of line.split(";")){
            if(part.trim() === "") continue
            const made = parseDefinition(part, label(index + 1), known)
            if("kit" in made){
                known.kits.push(made)
                out.kits.push(made)
            }
            else {
                known.monsters.push(made)
                out.monsters.push(made)
            }
        }
    })
}

/** What a module gives: its kits and monsters. */
function fromModule(exported: Record<string, unknown>, path: string, known: Known, out: Collected): void {
    const kits = exported["kits"] ?? []
    const monsters = exported["monsters"] ?? []
    if(!Array.isArray(kits) || !Array.isArray(monsters)){
        throw new UsageError(`--def ${path} : le module doit exporter kits et/ou monsters sous forme de listes.`)
    }
    for(const kit of kits as Kit[]){
        if(typeof kit?.name !== "string" || !Array.isArray(kit.cards)) throw new UsageError(`--def ${path} : un kit exporté n'a pas de name et de cards.`)
        known.add(kit.name, `--def ${path} « ${kit.name} »`)
        const defined: DefinedKit = {
            kit: {
                ...kit,
                sprite: kit.sprite ?? CUSTOM_SPRITE,
                items: kit.items ?? [],
                usables: kit.usables ?? [],
            },
            hearts: KIT_HEARTS,
            bonus: [],
        }
        known.kits.push(defined)
        out.kits.push(defined)
    }
    for(const each of monsters as Monster[]){
        if(typeof each?.name !== "string" || !Array.isArray(each.cards)) throw new UsageError(`--def ${path} : un monstre exporté n'a pas de name et de cards.`)
        known.add(each.name, `--def ${path} « ${each.name} »`)
        known.monsters.push(each)
        out.monsters.push(each)
    }
}

/**
 * Read every `--def` value: a definition or several separated by `;`, or `@file` (`.txt`, one definition per
 * line; `.ts`, `.js` or `.mjs` exporting `kits` and `monsters`).
 *
 * @throws {@link UsageError} On a definition or a file that is wrong, said with where.
 */
export async function loadDefinitions(values: readonly string[]): Promise<Definitions> {
    const known = new Known()
    const out = { kits: [] as DefinedKit[], monsters: [] as Monster[] }
    for(const value of values){
        if(!value.startsWith("@")){
            parseText(value, () => "--def", known, out)
            continue
        }
        const path = value.slice(1)
        const absolute = resolve(path)
        if(/\.(ts|js|mjs)$/i.test(path)){
            let loaded: Record<string, unknown>
            try {
                loaded = await import(pathToFileURL(absolute).href) as Record<string, unknown>
            }
            catch(error){
                throw new UsageError(`--def @${path} : module illisible (${error instanceof Error ? error.message : String(error)}).`)
            }
            fromModule(loaded, `@${path}`, known, out)
            continue
        }
        let text: string
        try {
            text = await readFile(absolute, "utf8")
        }
        catch(error){
            const code = (error as { code?: string }).code
            throw new UsageError(`--def @${path} : fichier ${code === "ENOENT" ? "introuvable" : "illisible"} (${absolute}).`)
        }
        parseText(text, line => `--def @${path} ligne ${line}`, known, out)
    }
    return out
}
