import { ALL_FLOORS } from "@game/core/mecard"
import type { FloorType, Monster } from "@game/core/mecard"

import { closest, normalize, UsageError } from "./errors"
import type { Fighter, Roster } from "./fighters"
import { GROUPS } from "./fighters"

/** The allies of a battle: a size, the others drawn at random, or the partners named. */
export type TeamSpec =
    | { readonly kind: "size", readonly size: number }
    | { readonly kind: "with", readonly partners: readonly Fighter[] }

/** Who they fight. */
export type OpponentSpec =
    | { readonly kind: "monsters" }
    | { readonly kind: "biome", readonly floor: FloorType }
    | { readonly kind: "kits", readonly pool: "all"|"custom"|"official" }
    | { readonly kind: "fixed", readonly fighters: readonly Fighter[] }
    | { readonly kind: "encounter", readonly monsters: readonly Monster[] }

/** One kind of battle a column measures: a team against opponents. */
export interface Atom {
    readonly team: TeamSpec
    readonly opponent: OpponentSpec

    /** Two atoms with the same key are the same battles. */
    readonly key: string
}

/** A column of the table: the battles it pools. `total` pools those of all the others. */
export interface OutputColumn {
    readonly label: string
    readonly total: boolean
    readonly atoms: readonly Atom[]
}

/** How many allies a team holds at most, what the bottom of the arena has room for. */
export const MAX_ALLIES = 6

/** How many monsters an encounter holds at most, what the top of the arena has room for. */
export const MAX_FOES = 7

/** The size `team` stands for. */
const TEAM_SIZE = 3

/** The name of a biome in English, as `--out` accepts it. */
const BIOME_ALIASES: ReadonlyMap<string, string> = new Map([["grotte", "cave"], ["foret", "forest"], ["enfer", "hell"]])

/** How a biome is written in `--out`: its English name when it has one, else its own. */
export function biomeKey(floor: FloorType): string {
    const own = normalize(floor.name)
    return BIOME_ALIASES.get(own) ?? own
}

/** The outputs measured when none is asked: the full comparison. */
export function defaultOutputs(): string {
    return ["total", "solo", "team", ...ALL_FLOORS.map(biomeKey), "kits"].join(",")
}

function biomeNamed(text: string): FloorType|undefined {
    const wanted = normalize(text)
    return ALL_FLOORS.find(floor => normalize(floor.name) === wanted || biomeKey(floor) === wanted)
}

const TEAM_FORMS = "solo, team, team:N (N de 1 à 6), with:<combattant>[+<combattant>] ou with:<groupe>"
const OPPONENT_FORMS = "monsters, un biome, kits, kits:custom, kits:official, kit:<combattant> ou kit:<groupe>, encounter:Gobelin*3+Archer"

/** A part of a column, one value or several when it names a group, each with the label it takes. */
interface Part<T> {
    readonly spec: T
    readonly label: string
}

/** The fighters of a `+`-joined list of names. */
function namedFighters(text: string, roster: Roster, option: string): Fighter[] {
    return text.split("+").map(name => roster.one(name, option))
}

function teamParts(text: string, roster: Roster, option: string): Part<TeamSpec>[]|null {
    const word = normalize(text)
    if(word === "solo") return [{ spec: { kind: "size", size: 1 }, label: text }]
    if(word === "team") return [{ spec: { kind: "size", size: TEAM_SIZE }, label: text }]
    const sized = /^team:(.*)$/.exec(word)
    if(sized){
        if(!/^\d+$/.test(sized[1]) || Number(sized[1]) < 1 || Number(sized[1]) > MAX_ALLIES){
            throw new UsageError(`${option} : « ${text} » : team:N attend N de 1 à ${MAX_ALLIES}.`)
        }
        return [{ spec: { kind: "size", size: Number(sized[1]) }, label: text }]
    }
    const partnered = /^with:(.*)$/i.exec(text.trim())
    if(!partnered) return null
    const names = partnered[1].trim()
    if(names === "") throw new UsageError(`${option} : « ${text} » : with: attend un combattant ou un groupe.`)
    const group = roster.group(names)
    if(group){
        if(group.length === 0) throw new UsageError(`${option} : « ${text} » : le groupe est vide.`)
        return group.map(fighter => ({ spec: { kind: "with", partners: [fighter] }, label: `with:${fighter.name}` }))
    }
    const partners = namedFighters(names, roster, option)
    if(partners.length + 1 > MAX_ALLIES) throw new UsageError(`${option} : « ${text} » : une équipe compte ${MAX_ALLIES} combattants au plus.`)
    return [{ spec: { kind: "with", partners }, label: text }]
}

function opponentParts(text: string, roster: Roster, option: string): Part<OpponentSpec>[]|null {
    const word = normalize(text)
    if(word === "monsters") return [{ spec: { kind: "monsters" }, label: text }]
    const floor = biomeNamed(text)
    if(floor) return [{ spec: { kind: "biome", floor }, label: text }]
    if(word === "kits") return [{ spec: { kind: "kits", pool: "all" }, label: text }]
    const restricted = /^kits:(.*)$/.exec(word)
    if(restricted){
        if(restricted[1] !== "custom" && restricted[1] !== "official"){
            throw new UsageError(`${option} : « ${text} » : kits:custom ou kits:official attendu.`)
        }
        const pool = restricted[1]
        const kits = roster.group("kits") ?? []
        if(!kits.some(kit => (pool === "custom") === kit.custom)){
            throw new UsageError(`${option} : « ${text} » : ${pool === "custom" ? "aucun kit défini avec --def" : "aucun kit du jeu"}.`)
        }
        return [{ spec: { kind: "kits", pool }, label: text }]
    }
    const fixed = /^kit:(.*)$/i.exec(text.trim())
    if(fixed){
        const names = fixed[1].trim()
        if(names === "") throw new UsageError(`${option} : « ${text} » : kit: attend un combattant ou un groupe.`)
        const group = roster.group(names)
        if(group) return group.map(fighter => ({ spec: { kind: "fixed", fighters: [fighter] }, label: `kit:${fighter.name}` }))
        return [{ spec: { kind: "fixed", fighters: namedFighters(names, roster, option) }, label: text }]
    }
    const encountered = /^encounter:(.*)$/i.exec(text.trim())
    if(encountered){
        const monsters = encountered[1].split("+").flatMap(entry => {
            const match = /^(.*?)\s*(?:\*\s*(\d+))?$/.exec(entry.trim())
            const fighter = roster.one(match?.[1] ?? entry, option)
            if(!fighter.monster) throw new UsageError(`${option} : « ${fighter.name} » est un kit, pas un monstre : encounter: ne prend que des monstres.`)
            return Array.from({ length: Number(match?.[2] ?? 1) }, () => fighter.monster as Monster)
        })
        if(monsters.length === 0 || monsters.length > MAX_FOES){
            throw new UsageError(`${option} : « ${text} » : une rencontre compte de 1 à ${MAX_FOES} monstres, reçu ${monsters.length}.`)
        }
        return [{ spec: { kind: "encounter", monsters }, label: text }]
    }
    return null
}

function teamKey(team: TeamSpec): string {
    return team.kind === "size" ? `size:${team.size}` : `with:${team.partners.map(each => `${each.kind}:${each.name}`).join("+")}`
}

function opponentKey(opponent: OpponentSpec): string {
    switch(opponent.kind){
        case "monsters": return "monsters"
        case "biome": return `biome:${opponent.floor.name}`
        case "kits": return `kits:${opponent.pool}`
        case "fixed": return `fixed:${opponent.fighters.map(each => `${each.kind}:${each.name}`).join("+")}`
        case "encounter": return `encounter:${opponent.monsters.map(each => each.name).join("+")}`
    }
}

function atom(team: TeamSpec, opponent: OpponentSpec): Atom {
    return { team, opponent, key: `${teamKey(team)}|${opponentKey(opponent)}` }
}

/**
 * Read one output of `--out`: `[team/]opponent`. A team alone fights monsters, an opponent alone is met by a
 * team of one and by a team of three, pooled. A group makes one column for each of its members.
 */
function parseOutput(text: string, roster: Roster): OutputColumn[] {
    const option = "--out"
    const slash = text.indexOf("/")
    const solo: TeamSpec = { kind: "size", size: 1 }
    const team: TeamSpec = { kind: "size", size: TEAM_SIZE }
    if(slash >= 0){
        const teamText = text.slice(0, slash).trim()
        const opponentText = text.slice(slash + 1).trim()
        const teams = teamParts(teamText, roster, option)
        if(!teams) throw new UsageError(`${option} : « ${teamText} » (avant le /) n'est pas une équipe. Équipes : ${TEAM_FORMS}.`)
        const opponents = opponentParts(opponentText, roster, option)
        if(!opponents) throw new UsageError(`${option} : « ${opponentText} » (après le /) n'est pas un adversaire. Adversaires : ${OPPONENT_FORMS}.`)
        return teams.flatMap(each => opponents.map(other => ({
            label: `${each.label}/${other.label}`, total: false, atoms: [atom(each.spec, other.spec)],
        })))
    }
    const teams = teamParts(text, roster, option)
    if(teams){
        return teams.map(each => ({ label: each.label, total: false, atoms: [atom(each.spec, { kind: "monsters" })] }))
    }
    const opponents = opponentParts(text, roster, option)
    if(opponents){
        return opponents.map(other => ({
            label: other.label, total: false, atoms: [atom(solo, other.spec), atom(team, other.spec)],
        }))
    }
    const names = [
        "total", "solo", "team", ...ALL_FLOORS.map(biomeKey), "monsters", "kits", ...GROUPS.map(group => `with:${group}`),
    ]
    const near = closest(text, names)
    const hint = near.length > 0 ? ` Vouliez-vous ${near.map(name => `« ${name} »`).join(", ")} ?` : ""
    throw new UsageError(`${option} : sortie invalide « ${text} ».${hint} Équipes : ${TEAM_FORMS}. Adversaires : ${OPPONENT_FORMS} (voir SIM.md).`)
}

/**
 * Read `--out`: the columns of the table, in the order given.
 *
 * @throws {@link UsageError} On an output that is not one, a name that does not exist, or `total` with
 * nothing to pool.
 */
export function parseOutputs(items: readonly string[], roster: Roster): OutputColumn[] {
    const columns = items.flatMap(item => normalize(item) === "total"
        ? [{ label: "total", total: true, atoms: [] as Atom[] }]
        : parseOutput(item, roster))
    if(!columns.some(column => !column.total)) throw new UsageError("--out : total ne pool rien tout seul, ajouter d'autres sorties (solo, team, kits…).")
    const labels = new Set<string>()
    for(const column of columns){
        if(labels.has(column.label)) throw new UsageError(`--out : « ${column.label} » est demandé deux fois.`)
        labels.add(column.label)
    }
    return columns
}
