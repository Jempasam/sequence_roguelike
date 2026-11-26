import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { ALL_FLOORS, Rng } from "@game/core/mecard"
import type { FloorType, Monster } from "@game/core/mecard"

import { parseDefinition } from "./define"
import { closest, normalize, UsageError } from "./errors"
import { kitFighter, monsterFighter } from "./fighters"
import type { Fighter, Roster } from "./fighters"
import { BiomeMonsters, Cross, Fights, GetSource, Group, Named, Random, Repeat, SetSource, Sum, Union } from "./sources"
import type { Source, SourceWorld } from "./sources"

/** How many members a team holds at most: what the bottom of the arena has room for. */
export const MAX_ALLIES = 6

/** How many members the foes hold at most: what the top of the arena has room for. */
export const MAX_FOES = 7

/** The most rows a description may give: a typo like `{kits}/{kits}/{kits}` is more likely than a table of that size. */
const MAX_ROWS = 5_000

/** The name of a biome in English, as a description accepts it. */
const BIOME_ALIASES: ReadonlyMap<string, string> = new Map([["grotte", "cave"], ["foret", "forest"], ["enfer", "hell"]])

/** How a biome is written in a description: its English name when it has one, else its own. */
export function biomeKey(floor: FloorType): string {
    const own = normalize(floor.name)
    return BIOME_ALIASES.get(own) ?? own
}

function biomeNamed(text: string): FloorType|undefined {
    const wanted = normalize(text)
    return ALL_FLOORS.find(floor => normalize(floor.name) === wanted || biomeKey(floor) === wanted)
}

/** One part of a side of a description: a source, and whether the rows walk its fights. */
export interface Root {
    readonly source: Source

    /** Is it written between braces, so that each of its fights is a row? */
    readonly walked: boolean
}

/** A battle described: the sources of the allies, and those of the foes. */
export interface Description {
    readonly text: string
    readonly allies: readonly Root[]
    readonly foes: readonly Root[]

    /** The names of the fighters the description defines in place, `kit(…)`, `pet(…)` and `monster(…)`. */
    readonly defined: readonly string[]
}

/** A source in a row: the fight of it that the row plays, none when it offers a single one. */
export interface Pick {
    readonly source: Source
    readonly index: number|null
}

/** A line of the table: the battle one combination of the walked fights gives. */
export interface Row {
    /** What the line is called: the description with each walked source replaced by the fight of the row. */
    readonly label: string

    /** What the seed of its battles comes from: the same for the same row, whatever the other rows are. */
    readonly key: string
    readonly allies: readonly Pick[]
    readonly foes: readonly Pick[]
}

// --- Reading the text ---

/** The separators of a text that are not inside parentheses, brackets or braces. */
function splitTop(text: string, separator: string): string[] {
    const parts: string[] = []
    let depth = 0
    let start = 0
    for(let at = 0; at < text.length; at++){
        const char = text[at]
        if(char === "(" || char === "[" || char === "{") depth++
        else if(char === ")" || char === "]" || char === "}") depth--
        else if(char === separator && depth === 0){
            parts.push(text.slice(start, at))
            start = at + 1
        }
    }
    parts.push(text.slice(start))
    return parts
}

/** The inside of `word(…)` when the text is exactly that, the parenthesis closing at the very end. */
function call(text: string, word: string): string|null {
    const head = `${word}(`
    if(!text.toLowerCase().startsWith(head) || !text.endsWith(")")) return null
    const inner = text.slice(head.length, -1)
    return balanced(inner) ? inner : null
}

/** Do the parentheses, brackets and braces of a text open and close in order? */
function balanced(text: string): boolean {
    let depth = 0
    for(const char of text){
        if(char === "(" || char === "[" || char === "{") depth++
        else if(char === ")" || char === "]" || char === "}") depth--
        if(depth < 0) return false
    }
    return depth === 0
}

/** What a file written over several lines with comments gives as a source: one line, no comment, no blank. */
function oneLineOf(path: string, option: string): string {
    const absolute = resolve(path)
    let text: string
    try {
        text = readFileSync(absolute, "utf8")
    }
    catch(error){
        const code = (error as { code?: string }).code
        throw new UsageError(`${option} : @${path} : fichier ${code === "ENOENT" ? "introuvable" : "illisible"} (${absolute}).`)
    }
    const line = text.split(/\r?\n/).map(each => each.replace(/#.*$/, "")).join("").replace(/\s+/g, "")
    if(line === "") throw new UsageError(`${option} : @${path} : le fichier ne décrit aucune source.`)
    return line
}

// --- The sources ---

/** What the parsing of a source needs: where fighters are found, and what has been defined in place so far. */
interface Reading {
    readonly roster: Roster
    readonly option: string

    /** The names of the fighters defined in place by the description, for `--ai Nom=…` to know them. */
    readonly names: Set<string>

    /** The names `set:` gave so far, in the order the description is read: a `get:` needs one before it. */
    readonly defined: Set<string>

    /** How many unions the source being read is inside: a `set:` there would not always be done. */
    readonly unions: { depth: number }
}

/** What a name of `set:` and `get:` is made of. */
const SAVED_NAME = /^[A-Za-z0-9_-]+$/

const GROUP_NAMES = ["kits", "monsters", "pets", "all"] as const

/** The fighter a definition written in place stands for. */
function definedInPlace(kind: "kit"|"pet"|"monster", inner: string, text: string, reading: Reading): Fighter {
    const label = `${reading.option} « ${text} »`
    const made = parseDefinition(inner, reading.option)
    if(kind === "kit"){
        if(!("kit" in made)) throw new UsageError(`${label} : kit(…) définit un kit : utiliser monster(…) ou pet(…) pour un monstre ou un familier (draw:N, size:N).`)
        reading.names.add(made.kit.name)
        return kitFighter(made.kit, made.hearts, made.bonus, true)
    }
    if("kit" in made) throw new UsageError(`${label} : ${kind}(…) définit un monstre (heart:rouge*N, draw:N, size:N) : utiliser kit(…) pour un kit.`)
    if(made.size === undefined && !inner.includes("@")){
        throw new UsageError(`${label} : ${kind}(…) demande size:N, la taille de la chaîne, et le deck en entier dans l'ordre où il se joue.`)
    }
    reading.names.add(made.name)
    return monsterFighter(made, kind, true, made.usables)
}

function groupOf(text: string, reading: Reading): Source|null {
    const word = normalize(text)
    if(!(GROUP_NAMES as readonly string[]).includes(word)) return null
    const members = reading.roster.group(word) ?? []
    if(members.length === 0) throw new UsageError(`${reading.option} : « ${text} » : le groupe est vide.`)
    return new Group(text, members)
}

function floorOf(text: string, kind: "fight"|"biome", reading: Reading): FloorType {
    const floor = biomeNamed(text)
    if(floor) return floor
    const names = ALL_FLOORS.map(biomeKey)
    const near = closest(text, names)
    const hint = near.length > 0 ? ` Vouliez-vous ${near.map(name => `« ${name} »`).join(", ")} ?` : ` Biomes : ${names.join(", ")}.`
    throw new UsageError(`${reading.option} : « ${kind}:${text} » : biome inconnu.${hint}`)
}

function parseSource(raw: string, reading: Reading): Source {
    const text = raw.trim()
    const { option } = reading
    if(text === "") throw new UsageError(`${option} : source vide (un + ou une virgule en trop ?).`)
    if(text.toLowerCase().startsWith("random:")){
        return new Random(text, parseSource(text.slice("random:".length), reading))
    }
    if(text.toLowerCase().startsWith("set:")){
        const named = /^set:([^:]*):(.*)$/i.exec(text)
        if(!named || named[2].trim() === "") throw new UsageError(`${option} : « ${text} » : set:NOM:source attendu (set:k:random:kits).`)
        const name = named[1].trim()
        if(!SAVED_NAME.test(name)) throw new UsageError(`${option} : « ${text} » : le nom « ${name} » ne prend que des lettres, chiffres, _ et -.`)
        if(reading.defined.has(name)) throw new UsageError(`${option} : « ${text} » : set:${name} est déjà défini ; un autre nom, ou get:${name} pour le relire.`)
        if(reading.unions.depth > 0){
            throw new UsageError(`${option} : « ${text} » : set: dans une union [ ] n'est pas toujours fait (une seule partie est résolue) ; le mettre avant, ou en dehors.`)
        }
        const inner = parseSource(named[2], reading)
        reading.defined.add(name)
        return new SetSource(text, name, inner)
    }
    const repeated = /^(.*\S)\s*\*\s*(\d+)$/.exec(text)
    if(repeated && balanced(repeated[1])){
        const copies = Number(repeated[2])
        if(copies < 1 || copies > MAX_FOES) throw new UsageError(`${option} : « ${text} » : *N attend N de 1 à ${MAX_FOES}.`)
        return new Repeat(text, parseSource(repeated[1], reading), copies)
    }
    if(text.startsWith("@")){
        const line = oneLineOf(text.slice(1).trim(), option)
        if(splitTop(line, "+").length > 1){
            throw new UsageError(`${option} : ${text} : un fichier décrit une seule source ; pour en réunir plusieurs, [A,B] ou cross(A,B).`)
        }
        return parseSource(line, reading)
    }
    if(text.toLowerCase().startsWith("get:")){
        const name = text.slice("get:".length).trim()
        if(!SAVED_NAME.test(name)) throw new UsageError(`${option} : « ${text} » : get:NOM attendu, le nom ne prend que des lettres, chiffres, _ et -.`)
        if(!reading.defined.has(name)){
            throw new UsageError(
                `${option} : « ${text} » : aucun set:${name} avant (dans l'ordre de lecture : alliés puis adversaires, de gauche à droite).`,
            )
        }
        return new GetSource(text, name)
    }
    for(const [word, make] of [
        ["cross", (parts: Source[]) => parts.slice(1).reduce((first, second) => new Cross(text, first, second), parts[0])],
        ["sum", (parts: Source[]) => new Sum(text, parts)],
    ] as const){
        const inner = call(text, word)
        if(inner === null) continue
        const parts = splitTop(inner, ",").map(part => parseSource(part, reading))
        if(parts.length < 2) throw new UsageError(`${option} : « ${text} » : ${word}( ) attend au moins deux sources séparées par des virgules.`)
        return make(parts)
    }
    if(text.startsWith("[") && text.endsWith("]") && balanced(text.slice(1, -1))){
        reading.unions.depth++
        try {
            return new Union(text, splitTop(text.slice(1, -1), ",").map(part => parseSource(part, reading)))
        }
        finally {
            reading.unions.depth--
        }
    }
    for(const kind of ["kit", "pet", "monster"] as const){
        const inner = call(text, kind)
        if(inner !== null) return new Named(text, definedInPlace(kind, inner, text, reading))
    }
    const biome = /^(fight|biome):(.*)$/i.exec(text)
    if(biome){
        const kind = biome[1].toLowerCase() as "fight"|"biome"
        const floor = floorOf(biome[2].trim(), kind, reading)
        return kind === "fight" ? new Fights(text, floor) : new BiomeMonsters(text, floor)
    }
    const group = groupOf(text, reading)
    if(group) return group
    return new Named(text, reading.roster.one(text, option))
}

function parseRoot(raw: string, reading: Reading): Root {
    const text = raw.trim()
    if(text.startsWith("{")){
        if(!text.endsWith("}") || !balanced(text.slice(1, -1))){
            throw new UsageError(`${reading.option} : « ${text} » : les accolades doivent entourer une source entière : {kits}.`)
        }
        const inner = text.slice(1, -1)
        if(/[{}]/.test(inner)) throw new UsageError(`${reading.option} : « ${text} » : des accolades dans des accolades.`)
        return { source: parseSource(inner, reading), walked: true }
    }
    if(/[{}]/.test(text)){
        throw new UsageError(
            `${reading.option} : « ${text} » : { } n'entoure qu'une source de la racine d'une équipe (écrire {kits}, pas random:{kits} ni [{kits},A]).`,
        )
    }
    return { source: parseSource(text, reading), walked: false }
}

/** A side of a description: its roots, `encounter:Gobelin*3+Archer` being monsters named. */
function parseSide(raw: string, side: string, reading: Reading): Root[] {
    const text = raw.trim()
    if(text === "") throw new UsageError(`${reading.option} : le côté des ${side} est vide : au moins une source est attendue.`)
    const encounter = /^encounter:(.*)$/i.exec(text)
    if(encounter){
        return splitTop(encounter[1], "+").map(part => {
            const copies = /^(.*?)\s*\*\s*(\d+)$/.exec(part.trim())
            const name = copies ? copies[1] : part.trim()
            const count = copies ? Number(copies[2]) : 1
            const fighter = reading.roster.one(/^(kit|monster|pet):/i.test(name) ? name : `monster:${name}`, reading.option)
            if(!fighter.monster) throw new UsageError(`${reading.option} : « ${fighter.name} » est un kit, pas un monstre : encounter: ne prend que des monstres.`)
            if(count < 1 || count > MAX_FOES) throw new UsageError(`${reading.option} : « ${part.trim()} » : *N attend N de 1 à ${MAX_FOES}.`)
            return { source: new Repeat(part.trim(), new Named(part.trim(), fighter), count), walked: false }
        })
    }
    return splitTop(text, "+").map(part => parseRoot(part, reading))
}

/**
 * Read the description of a battle: `allies/foes`, each side sources joined by `+`.
 *
 * @throws {@link UsageError} On a description that is wrong, said with the part at fault.
 */
export function parseMatch(text: string, roster: Roster): Description {
    const option = "--match"
    const sides = splitTop(text, "/")
    if(sides.length !== 2){
        throw new UsageError(
            `${option} : « ${text} » : une description s'écrit alliés/adversaires (un seul / hors parenthèses), par exemple {kits}/random:fight:cave.`,
        )
    }
    const reading: Reading = { roster, option, names: new Set(), defined: new Set(), unions: { depth: 0 } }
    const allies = parseSide(sides[0], "alliés", reading)
    const foes = parseSide(sides[1], "adversaires", reading)
    return { text, allies, foes, defined: [...reading.names] }
}

// --- The rows ---

function names(fighters: readonly Fighter[]): string {
    return fighters.map(fighter => fighter.name).join("+")
}

/** The rows of a description: a row for each combination of the fights of the sources written between braces. */
export function rowsOf(description: Description, world: SourceWorld): Row[] {
    const roots = [...description.allies.map(root => ({ root, side: "allies" })), ...description.foes.map(root => ({ root, side: "foes" }))]
    const counts = roots.map(({ root }) => root.source.count(world))
    roots.forEach(({ root }, at) => {
        const count = counts[at]
        if(root.walked && count === 0){
            throw new UsageError(`--match : « ${root.source.text} » n'offre aucun combat à parcourir.`)
        }
        if(!root.walked && count !== 1){
            throw new UsageError(
                `--match : « ${root.source.text} » offre ${count} combats : l'entourer de { } pour les parcourir (un par ligne), ou écrire random:${root.source.text} pour en tirer un.`,
            )
        }
    })
    const walked = roots.map((_, at) => at).filter(at => roots[at].root.walked)
    const total = walked.reduce((product, at) => product * counts[at], 1)
    if(total > MAX_ROWS) throw new UsageError(`--match : « ${description.text} » donne ${total} lignes (${MAX_ROWS} au plus).`)

    // What each fight of a walked source is called: who plays in it, and its number when two fights are the same crowd.
    const fightNames = roots.map(({ root }, at) => {
        return root.walked ? Array.from({ length: counts[at] }, (_, index) => labelOf(root.source, index, world)) : []
    })
    const distinct = fightNames.map(list => new Set(list).size === list.length)
    const called = (at: number, index: number): string => distinct[at] ? fightNames[at][index] : `${fightNames[at][index]}#${index}`

    const rows: Row[] = []
    const indexes = walked.map(() => 0)
    for(let row = 0; row < total; row++){
        // The indexes of the walked sources, the last one turning fastest.
        let rest = row
        for(let at = walked.length - 1; at >= 0; at--){
            indexes[at] = rest % counts[walked[at]]
            rest = Math.floor(rest / counts[walked[at]])
        }
        const indexOf = (at: number): number|null => walked.includes(at) ? indexes[walked.indexOf(at)] : null
        const picks: Pick[] = roots.map(({ root }, at) => ({ source: root.source, index: indexOf(at) }))
        const placesOf = (side: string): number[] => roots.flatMap(({ side: own }, at) => own === side ? [at] : [])
        const written = (side: string, text: (at: number) => string): string => placesOf(side).map(text).join("+")
        const label = (at: number): string => {
            const index = indexOf(at)
            return index === null ? roots[at].root.source.text : called(at, index)
        }
        // The seed names who plays, not how it was written: the same fighters in the same row, the same battles.
        const seed = (at: number): string => {
            const index = indexOf(at)
            return index === null ? labelOf(roots[at].root.source, 0, world) : called(at, index)
        }
        rows.push({
            label: `${written("allies", label)}/${written("foes", label)}`,
            key: `${written("allies", seed)}/${written("foes", seed)}`,
            allies: placesOf("allies").map(at => picks[at]),
            foes: placesOf("foes").map(at => picks[at]),
        })
    }
    const labels = new Set<string>()
    for(const row of rows){
        if(labels.has(row.label)) throw new UsageError(`--match : la ligne « ${row.label} » est décrite deux fois.`)
        labels.add(row.label)
    }
    return rows
}

/**
 * What a source is called in the label of a row: the fighters of its fight, or the source as written when the
 * fight is only known in a battle, because it draws or gives back what another source kept.
 */
function labelOf(source: Source, index: number, world: SourceWorld): string {
    if(/(random|get):/i.test(source.text)) return source.text
    const members = source.get(index, { ...world, rng: new Rng(0), taken: new Set(), saved: new Map() })
    return names(members)
}

/** Check, before any battle, that no side holds more than the arena has room for, as far as it is known. */
export function checkSizes(rows: readonly Row[], world: SourceWorld): void {
    for(const row of rows){
        // One draw for the row, as in a battle: what a `set:` of the allies kept is there for the foes' `get:`.
        const draw = { ...world, rng: new Rng(0), taken: new Set<string>(), saved: new Map() }
        const sizeOf = (picks: readonly Pick[]): number => picks.reduce((sum, { source, index }) => {
            return sum + source.get(index ?? 0, draw).length
        }, 0)
        const allies = sizeOf(row.allies)
        if(allies > MAX_ALLIES) throw new UsageError(`--match : « ${row.label} » : ${allies} alliés, ${MAX_ALLIES} au plus.`)
        const foes = sizeOf(row.foes)
        if(foes > MAX_FOES) throw new UsageError(`--match : « ${row.label} » : ${foes} adversaires, ${MAX_FOES} au plus.`)
    }
}

/** A monster of a fight, for what the world gives the sources. */
export type FightsOf = (floor: FloorType) => readonly (readonly Monster[])[]
