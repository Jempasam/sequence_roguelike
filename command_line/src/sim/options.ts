import { existsSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { allFightTypes } from "@game/core-src/games/mecard/sim/catalog/fightTypes"

import { choiceOf, integerOf, isSet, listOf, parseArgs, valueOf, valuesOf } from "./args"
import type { OptionSpec } from "./args"
import { normalize, UsageError } from "./errors"
import { Roster } from "./fighters"
import { checkSizes, parseMatch, rowsOf } from "./match"
import type { Row } from "./match"
import { DEFAULT_OUTPUTS, parseOutputs } from "./outputs"
import { FORMATS } from "./report"
import type { Format, Presentation } from "./report"
import { FIGHT_CATEGORIES, fightsFinder } from "./scenario"
import type { Ais, Setup } from "./scenario"
import { parseStrategy, SMART } from "./strategies"
import type { Strategy } from "./strategies"

export const OPTIONS: readonly OptionSpec[] = [
    { name: "match", repeatable: true },
    { name: "out" },
    { name: "ai" },
    { name: "level" },
    { name: "layer" },
    { name: "fight" },
    { name: "games" },
    { name: "seed" },
    { name: "max-rounds" },
    { name: "stall" },
    { name: "soft-win", flag: true },
    { name: "jobs" },
    { name: "sort" },
    { name: "top" },
    { name: "flip", flag: true },
    { name: "format" },
    { name: "quiet", flag: true },
    { name: "log" },
]

/** The options that no longer exist, and what to write instead. */
const REMOVED: Readonly<Record<string, string>> = {
    of: "le sujet est une source de --match : --match \"{kit:Mage}/…\" ou {kits} pour un kit après l'autre (sim --help match).",
    pool: "les coéquipiers se décrivent dans --match : random:kits pour un kit au hasard, random:[kit:A,kit:B] dans une liste.",
    show: "ses valeurs sont maintenant des colonnes de --out : --out winrate,n,ci,rounds (sim --help out).",
    def: "un combattant se définit dans --match : kit(Nom=Carte*2,item:X,heart:rouge*4), monster(Nom=size:2,draw:2,heart:rouge*5,Carte,Carte) ; pour plusieurs, un fichier lu comme une source : --match \"{@mes-kits.def}/…\" avec [kit(…),kit(…)] dedans (sim --help define).",
}

/** Everything a run needs, from the command line, checked before any battle is played. */
export interface Plan {
    /** The rows of the table. */
    readonly rows: readonly Row[]

    /** What the table shows besides its rows. */
    readonly presentation: Presentation

    /** One table is made for each AI of the kits the user listed. */
    readonly variants: readonly { readonly name: string, readonly setup: Setup }[]

    /** How many battles each cell plays. */
    readonly games: number

    /** How many threads play the battles, or `auto` to let the size of the run decide. */
    readonly jobs: number|"auto"
    readonly quiet: boolean

    /** The file every battle is written to in full, none without `--log`. */
    readonly log: string|null

    /** The command line it was read from: a thread playing battles reads it again to get the same plan. */
    readonly args: readonly string[]

    /** What was ignored or may surprise, told on the error output. */
    readonly warnings: readonly string[]
}

/** How many battles each cell plays by default. */
const DEFAULT_GAMES = 30

/** The seed of a run that is given none: the same one, so that runs can be compared. */
const DEFAULT_SEED = 1

/** The most rounds a battle plays by default before it counts as a timeout. */
const DEFAULT_MAX_ROUNDS = 60

/** How many rounds in a row without any life gained or lost make a battle blocked, by default. */
const DEFAULT_STALL = 10

/** The most threads `--jobs` accepts. */
const MAX_JOBS = 64

/** The AI of kits, monsters and pets when `--ai` does not say: those of the game. */
const GAME_AI = { kit: SMART, monster: "deck", pet: "deck" } as const

/** How `--ai` is read: one AI for the kits of each table, and who plays the others. */
interface ReadAis {
    /** One table is made for each: the AIs of the kits. */
    readonly kits: readonly Strategy[]
    readonly rest: Omit<Ais, "kit">
}

function parseAis(text: string|undefined, roster: Roster, defined: readonly string[]): ReadAis {
    const kits: Strategy[] = []
    let monster: Strategy|null = null
    let pet: Strategy|null = null
    let allies: Strategy|null = null
    let foes: Strategy|null = null
    const byName = new Map<string, Strategy>()
    const once = (taken: Strategy|null, key: string): void => {
        if(taken !== null) throw new UsageError(`--ai : ${key}= est donné deux fois.`)
    }
    for(const item of text === undefined ? [] : listOf(text, "--ai")){
        const equals = item.indexOf("=")
        if(equals < 0){
            kits.push(parseStrategy(item, "--ai"))
            continue
        }
        const who = item.slice(0, equals).trim()
        const strategy = parseStrategy(item.slice(equals + 1), "--ai")
        switch(normalize(who)){
            case "kit": kits.push(strategy); break
            case "monster": once(monster, "monster"); monster = strategy; break
            case "pet": once(pet, "pet"); pet = strategy; break
            case "allies": once(allies, "allies"); allies = strategy; break
            case "foes": once(foes, "foes"); foes = strategy; break
            default: {
                // A fighter defined in the descriptions is named as well as one of the game.
                const own = defined.find(name => normalize(name) === normalize(who))
                byName.set(normalize(own ?? roster.one(who, "--ai").name), strategy)
            }
        }
    }
    if(kits.length === 0) kits.push(parseStrategy(GAME_AI.kit, "--ai"))
    return {
        kits,
        rest: {
            monster: monster ?? parseStrategy(GAME_AI.monster, "--ai"),
            pet: pet ?? parseStrategy(GAME_AI.pet, "--ai"),
            allies, foes, byName,
        },
    }
}

function parseLayers(text: string): { from: number, to: number } {
    const match = /^(\d+)(?:-(\d+))?$/.exec(text.trim())
    if(!match) throw new UsageError(`--layer : « ${text} » invalide : n ou a-b attendu (0 est la première couche).`)
    const from = Number(match[1])
    const to = match[2] === undefined ? from : Number(match[2])
    if(from > to) throw new UsageError(`--layer : « ${text} » : a doit être ≤ b.`)
    return { from, to }
}

/**
 * Read the command line of `sim` into what a run needs, the user's mistakes told one by one with what to do.
 *
 * @throws {@link UsageError} On any option or definition that is wrong: nothing is played before that.
 */
export async function planOf(args: readonly string[]): Promise<Plan> {
    for(const arg of args){
        const name = /^--([^=]*)/.exec(arg)?.[1]
        if(name !== undefined && name in REMOVED) throw new UsageError(`--${name} n'existe plus : ${REMOVED[name]}`)
    }
    const parsed = parseArgs(args, OPTIONS)
    const warnings: string[] = []
    const roster = new Roster()

    const matches = valuesOf(parsed, "match")
    if(matches.length === 0){
        throw new UsageError("--match : aucune description. Exemple : --match \"{kits}/random:fight:cave\" (chaque kit seul contre un combat de grotte ; sim --help match).")
    }
    const outputs = parseOutputs(listOf(valueOf(parsed, "out") ?? DEFAULT_OUTPUTS, "--out"))

    const level = integerOf(valueOf(parsed, "level") ?? "1", "--level", 1)
    const layers = parseLayers(valueOf(parsed, "layer") ?? "0-3")
    const fightText = valueOf(parsed, "fight") ?? "battle"
    const categoryIds = Object.keys(FIGHT_CATEGORIES) as (keyof typeof FIGHT_CATEGORIES)[]
    const asCategory = categoryIds.find(id => id === fightText)
    if(asCategory === undefined && !allFightTypes().some(type => type.id === fightText)){
        throw new UsageError(
            `--fight : « ${fightText} » invalide. Valeurs permises : ${categoryIds.join(", ")}, ou l'id d'un combat précis `
            + "(npm run cli -- list fights).",
        )
    }
    const fightType = FIGHT_CATEGORIES[asCategory ?? "battle"]
    const fightId = asCategory === undefined ? fightText : undefined
    const games = integerOf(valueOf(parsed, "games") ?? String(DEFAULT_GAMES), "--games", 1)
    const seed = integerOf(valueOf(parsed, "seed") ?? String(DEFAULT_SEED), "--seed", 0, 2 ** 32 - 1)
    const maxRounds = integerOf(valueOf(parsed, "max-rounds") ?? String(DEFAULT_MAX_ROUNDS), "--max-rounds", 1)
    const stall = integerOf(valueOf(parsed, "stall") ?? String(DEFAULT_STALL), "--stall", 0)
    const jobsText = valueOf(parsed, "jobs") ?? "auto"
    const jobs = jobsText === "auto" ? "auto" : integerOf(jobsText, "--jobs", 1, MAX_JOBS)

    const top = valueOf(parsed, "top")
    const format: Format = choiceOf(valueOf(parsed, "format") ?? "table", "--format", FORMATS)
    const presentation: Presentation = {
        columns: outputs.columns,
        total: outputs.total,
        sort: valueOf(parsed, "sort") ?? null,
        top: top === undefined ? null : integerOf(top, "--top", -1000, 1000),
        flip: isSet(parsed, "flip"),
        format,
    }
    if(presentation.top === 0) throw new UsageError("--top : 0 ne garde aucune ligne.")
    if(presentation.sort !== null && normalize(presentation.sort) !== "name" && !outputs.columns.some(column => column === normalize(presentation.sort ?? ""))){
        throw new UsageError(`--sort : colonne « ${presentation.sort} » inconnue. Colonnes : name, ${outputs.columns.join(", ")}.`)
    }

    const log = logFileOf(valueOf(parsed, "log"))
    const base = {
        roster,
        level,
        layers,
        fightType,
        maxRounds,
        stall,
        softWin: isSet(parsed, "soft-win"),
        seed,
        journal: log !== null,
        fightsOf: fightsFinder({ level, layers, fightType, fightId, seed }),
    }
    const world = { roster, fightsOf: base.fightsOf }
    const descriptions = matches.map(text => parseMatch(text, roster))
    const rows = descriptions.flatMap(description => rowsOf(description, world))
    const ais = parseAis(valueOf(parsed, "ai"), roster, descriptions.flatMap(description => description.defined))
    const labels = new Set<string>()
    for(const row of rows){
        if(labels.has(row.label)) throw new UsageError(`--match : la ligne « ${row.label} » est décrite deux fois.`)
        labels.add(row.label)
    }
    checkSizes(rows, world)
    for(const name of ["layer", "fight"]){
        if(isSet(parsed, name) && !matches.some(text => /(fight|biome):/i.test(text))){
            warnings.push(`--${name} ignoré : aucune description ne prend de combat ni de monstre d'un biome (fight:, biome:).`)
        }
    }
    const variants = ais.kits.map(kit => ({
        name: kit.name,
        setup: { ...base, ai: { ...ais.rest, kit } },
    }))
    return { rows, presentation, variants, games, jobs, quiet: isSet(parsed, "quiet"), log, args, warnings }
}

/**
 * The file `--log` writes to, checked before any battle: its folder must exist, and it must not be a folder.
 *
 * @throws {@link UsageError} When it cannot be written there.
 */
function logFileOf(text: string|undefined): string|null {
    if(text === undefined) return null
    const file = resolve(text.trim())
    if(text.trim() === "") throw new UsageError("--log : chemin de fichier vide. Exemple : --log combat.txt.")
    const folder = dirname(file)
    if(!existsSync(folder) || !statSync(folder).isDirectory()){
        throw new UsageError(`--log : le dossier « ${folder} » n'existe pas. Le créer, ou écrire le journal ailleurs.`)
    }
    if(existsSync(file) && statSync(file).isDirectory()){
        throw new UsageError(`--log : « ${file} » est un dossier. Donner un nom de fichier, par exemple ${join(file, "combat.txt")}.`)
    }
    return file
}
