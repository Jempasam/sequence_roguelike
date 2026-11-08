import { choiceOf, integerOf, isSet, listOf, parseArgs, valueOf, valuesOf } from "./args"
import type { OptionSpec } from "./args"
import { loadDefinitions } from "./define"
import { normalize, UsageError } from "./errors"
import { Roster } from "./fighters"
import type { Fighter } from "./fighters"
import { defaultOutputs, parseOutputs } from "./outputs"
import type { Atom, OutputColumn } from "./outputs"
import { FORMATS, SHOWN } from "./report"
import type { Format, Presentation, Shown } from "./report"
import { FIGHT_TYPES, validateFights, validateTeams } from "./scenario"
import type { Setup } from "./scenario"
import { parseStrategy } from "./strategies"
import type { Strategy } from "./strategies"

export const OPTIONS: readonly OptionSpec[] = [
    { name: "of" },
    { name: "out" },
    { name: "def", repeatable: true },
    { name: "pool" },
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
    { name: "show" },
    { name: "sort" },
    { name: "top" },
    { name: "flip", flag: true },
    { name: "format" },
    { name: "quiet", flag: true },
]

/** Everything a run needs, from the command line, checked before any battle is played. */
export interface Plan {
    /** The rows of the table. */
    readonly subjects: readonly Fighter[]

    /** The columns of the table. */
    readonly columns: readonly OutputColumn[]

    /** One table is made for each AI of the allies the user listed. */
    readonly variants: readonly { readonly name: string, readonly setup: Setup }[]

    /** How many battles each cell plays. */
    readonly games: number

    /** How many threads play the battles, or `auto` to let the size of the run decide. */
    readonly jobs: number|"auto"
    readonly presentation: Presentation
    readonly quiet: boolean

    /** The command line it was read from: a thread playing battles reads it again to get the same plan. */
    readonly args: readonly string[]

    /** What was ignored or may surprise, told on the error output. */
    readonly warnings: readonly string[]
}

/** How many battles each cell plays by default. */
const DEFAULT_GAMES = 30

/** The seed of a run that is given none: the same one, so that runs can be compared. */
const DEFAULT_SEED = 1

/** How the allies are played when `--ai` does not say, the foes that are kits being played like them. */
const DEFAULT_AI = "lookahead"

/** The most rounds a battle plays by default before it counts as a timeout. */
const DEFAULT_MAX_ROUNDS = 60

/** How many rounds in a row without any life gained or lost make a battle blocked, by default. */
const DEFAULT_STALL = 10

/** The most threads `--jobs` accepts. */
const MAX_JOBS = 64

/** How the AI of the allies and the foes are read from `--ai`. */
interface Ais {
    readonly allies: readonly Strategy[]
    readonly foes: Strategy|null
    readonly overrides: ReadonlyMap<string, Strategy>
}

function parseAis(text: string|undefined, roster: Roster): Ais {
    const allies: Strategy[] = []
    const overrides = new Map<string, Strategy>()
    let foes: Strategy|null = null
    for(const item of listOf(text ?? DEFAULT_AI, "--ai")){
        const equals = item.indexOf("=")
        if(equals < 0){
            allies.push(parseStrategy(item, "--ai"))
            continue
        }
        const who = item.slice(0, equals).trim()
        const strategy = parseStrategy(item.slice(equals + 1), "--ai")
        if(normalize(who) === "foes") foes = strategy
        else overrides.set(normalize(roster.one(who, "--ai").name), strategy)
    }
    if(allies.length === 0) allies.push(parseStrategy(DEFAULT_AI, "--ai"))
    return { allies, foes, overrides }
}

function parseLayers(text: string): { from: number, to: number } {
    const match = /^(\d+)(?:-(\d+))?$/.exec(text.trim())
    if(!match) throw new UsageError(`--layer : « ${text} » invalide : n ou a-b attendu (0 est la première couche).`)
    const from = Number(match[1])
    const to = match[2] === undefined ? from : Number(match[2])
    if(from > to) throw new UsageError(`--layer : « ${text} » : a doit être ≤ b.`)
    return { from, to }
}

/** The fighters of a list of names and groups, none twice. */
function fightersOf(items: readonly string[], roster: Roster, option: string): Fighter[] {
    const found: Fighter[] = []
    for(const item of items){
        for(const fighter of roster.many(item, option)){
            if(!found.includes(fighter)) found.push(fighter)
        }
    }
    return found
}

/**
 * Read the command line of `sim` into what a run needs, the user's mistakes told one by one with what to do.
 *
 * @throws {@link UsageError} On any option or definition that is wrong: nothing is played before that.
 */
export async function planOf(args: readonly string[]): Promise<Plan> {
    const parsed = parseArgs(args, OPTIONS)
    const warnings: string[] = []
    const definitions = await loadDefinitions(valuesOf(parsed, "def"))
    const roster = new Roster(definitions)

    const ofText = valueOf(parsed, "of")
    const subjects = ofText === undefined
        ? roster.fighters.filter(fighter => definitions.kits.length + definitions.monsters.length > 0 ? fighter.custom : fighter.kind === "kit")
        : fightersOf(listOf(ofText, "--of"), roster, "--of")
    if(subjects.length === 0) throw new UsageError("--of : aucun combattant à mesurer.")

    const columns = parseOutputs(listOf(valueOf(parsed, "out") ?? defaultOutputs(), "--out"), roster)
    const atoms: Atom[] = []
    for(const column of columns){
        for(const atom of column.atoms) if(!atoms.some(known => known.key === atom.key)) atoms.push(atom)
    }

    const poolText = valueOf(parsed, "pool")
    const pool = fightersOf(listOf(poolText ?? "kits", "--pool"), roster, "--pool")
    if(poolText !== undefined && !atoms.some(atom => atom.team.kind === "size" && atom.team.size > 1)){
        warnings.push("--pool ignoré : aucune sortie ne tire de coéquipiers (team, team:N).")
    }

    const ais = parseAis(valueOf(parsed, "ai"), roster)
    const level = integerOf(valueOf(parsed, "level") ?? "1", "--level", 1)
    const layers = parseLayers(valueOf(parsed, "layer") ?? "0-3")
    const fightType = choiceOf(valueOf(parsed, "fight") ?? "battle", "--fight", Object.keys(FIGHT_TYPES) as (keyof typeof FIGHT_TYPES)[])
    const fightsMonsters = atoms.some(atom => atom.opponent.kind === "monsters" || atom.opponent.kind === "biome")
    for(const name of ["level", "layer", "fight"]){
        if(isSet(parsed, name) && !fightsMonsters && !atoms.some(atom => atom.opponent.kind === "encounter" && name === "level")){
            warnings.push(`--${name} ignoré : aucune sortie ne combat les monstres d'un biome.`)
        }
    }
    const games = integerOf(valueOf(parsed, "games") ?? String(DEFAULT_GAMES), "--games", 1)
    const seed = integerOf(valueOf(parsed, "seed") ?? String(DEFAULT_SEED), "--seed", 0, 2 ** 32 - 1)
    const maxRounds = integerOf(valueOf(parsed, "max-rounds") ?? String(DEFAULT_MAX_ROUNDS), "--max-rounds", 1)
    const stall = integerOf(valueOf(parsed, "stall") ?? String(DEFAULT_STALL), "--stall", 0)
    const jobsText = valueOf(parsed, "jobs") ?? "auto"
    const jobs = jobsText === "auto" ? "auto" : integerOf(jobsText, "--jobs", 1, MAX_JOBS)

    const showText = valueOf(parsed, "show")
    const show = showText === undefined ? [] : listOf(showText, "--show").map(item => choiceOf(item, "--show", SHOWN) as Shown)
    const top = valueOf(parsed, "top")
    const format: Format = choiceOf(valueOf(parsed, "format") ?? "table", "--format", FORMATS)
    const presentation: Presentation = {
        show,
        sort: valueOf(parsed, "sort") ?? null,
        top: top === undefined ? null : integerOf(top, "--top", -1000, 1000),
        flip: isSet(parsed, "flip"),
        format,
    }
    if(presentation.top === 0) throw new UsageError("--top : 0 ne garde aucune ligne.")

    const base = { roster, pool, level, layers, fightType: FIGHT_TYPES[fightType], maxRounds, stall, softWin: isSet(parsed, "soft-win"), seed }
    const variants = ais.allies.map(allies => ({
        name: allies.name,
        setup: { ...base, allies, foes: ais.foes ?? allies, overrides: ais.overrides },
    }))
    validateTeams(subjects, atoms, variants[0].setup)
    validateFights(atoms, variants[0].setup)
    if(presentation.sort !== null && normalize(presentation.sort) !== "name"){
        const sortable = presentation.flip
            ? subjects.map(subject => subject.name)
            : columns.map(column => column.label)
        if(!sortable.some(label => normalize(label) === normalize(presentation.sort ?? ""))){
            throw new UsageError(`--sort : colonne « ${presentation.sort} » inconnue. Colonnes : name, ${sortable.join(", ")}.`)
        }
    }
    return {
        subjects, columns, variants, games, jobs, presentation, quiet: isSet(parsed, "quiet"), warnings, args,
    }
}
