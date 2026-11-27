import { convert, KINDS } from "@game/core-src/games/mecard/sim/analysis/Kinds"
import { NoResultError } from "@game/core-src/games/mecard/sim/analysis/NoResult"
import { profileRows } from "@game/core-src/games/mecard/sim/analysis/profileRows"
import { TARGETS } from "@game/core-src/games/mecard/sim/analysis/Targets"
import { BodyElement } from "@game/core-src/games/mecard/sim/element/subs/BodyElement"
import type { CardMeasure } from "@game/core-src/games/mecard/sim/analysis/CardProbe"
import type { Kind, Target } from "@game/core-src/games/mecard/sim/analysis/Kinds"
import type { Range, Sizes } from "@game/core-src/games/mecard/sim/analysis/Sizes"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"
import type { BeastCard } from "@game/core-src/games/mecard/sim/card/subs/beast/BeastCard"
import type { ElementCard } from "@game/core-src/games/mecard/sim/card/subs/spell/ElementCard"

import { normalize, UsageError, unknownName } from "./sim/errors"

export const CONVERT_USAGE = `Usage :
  npm run cli -- convert <type>:<nom> <cible> [--run a..b] [--bite a..b] [--main a..b] [--pool n]
Types (sources) : ${KINDS.map(kind => kind.id).join(", ")}
Cibles : ${TARGETS.map(target => target.id).join(", ")}
Lit les cartes de la source, les classe par profil (course, morsure...), et construit la cible.
Une cible peut ne rien donner (fusion, merged, element) : le résultat dit alors pourquoi.`

/** A range written `2..4`, or `3` for 3..3. */
function rangeOf(option: string, text: string): Range {
    const match = /^(\d+)(?:\.\.(\d+))?$/.exec(text)
    if(!match) throw new UsageError(`${option} : « ${text} » : un nombre ou a..b attendu.`)
    const min = Number(match[1])
    const max = match[2] === undefined ? min : Number(match[2])
    if(min < 1 || max < min) throw new UsageError(`${option} : « ${text} » : 1 au moins, et a <= b.`)
    return { min, max }
}

function kindNamed(id: string): Kind<unknown> {
    const found = KINDS.find(kind => normalize(kind.id) === normalize(id))
    if(!found) throw unknownName("type", id, KINDS.map(kind => kind.id))
    return found
}

function targetNamed(id: string): Target<unknown> {
    const found = TARGETS.find(target => normalize(target.id) === normalize(id))
    if(!found) throw unknownName("cible", id, TARGETS.map(target => target.id))
    return found
}

/** The thing a `type:nom` stands for. */
function sourceOf(text: string): { kind: Kind<unknown>, value: unknown } {
    const at = text.indexOf(":")
    if(at < 0) throw new UsageError(`« ${text} » : type:nom attendu (monster:Loup).`)
    const kind = kindNamed(text.slice(0, at))
    const name = normalize(text.slice(at + 1))
    const found = kind.all().find(value => normalize(kind.nameOf(value)) === name)
    if(found === undefined){
        throw unknownName(kind.id, text.slice(at + 1), kind.all().map(value => kind.nameOf(value)))
    }
    return { kind, value: found }
}

function names(cards: readonly Card[]): string {
    return cards.map(card => card.name).join(", ")
}

/** What an element is, in a few lines: what it does against a unit, for it, and what it calls. */
function elementLines(card: ElementCard): string[] {
    const { element } = card
    if(!(element instanceof BodyElement)) return [card.name]
    const { monster, negative, positive } = element
    return [
        `contre : ${negative.name}`,
        `pour : ${positive.name}`,
        `corps : ${monster.name}, PV ${monster.hearts}, pioche ${monster.draw}`,
        ...rowsOf(monster.cards, monster.draw),
    ]
}

/** What a thing is, in a few lines. */
function lines(kind: Target<unknown>, value: unknown): string[] {
    switch(kind.id){
        case "fusion":
        case "merged": {
            const card = value as Card & { contents: readonly Card[] }
            return [card.name, `cartes : ${names(card.contents)}`]
        }
        case "element": return elementLines(value as ElementCard)
        case "monster":
        case "pet": {
            const monster = value as { hearts: number, draw: number, cards: readonly Card[] }
            return [`PV ${monster.hearts}, pioche ${monster.draw}`, ...rowsOf(monster.cards, monster.draw)]
        }
        case "kit": {
            const kit = value as { cards: readonly Card[], unlimited?: readonly Card[] }
            return [`cartes : ${names(kit.cards)}`, `illimitées : ${names(kit.unlimited ?? [])}`]
        }
        case "booster": {
            const booster = value as { pools: readonly { count: number, pool: readonly Card[] }[] }
            return booster.pools.map(({ count, pool }) => `${count} parmi ${names(pool)}`)
        }
        case "module": return [`cartes : ${names((value as { cards: readonly Card[] }).cards)}`]
        default: {
            const { beast } = value as BeastCard
            const body = beast.body.map(part => typeof part === "string" ? `<${part}>` : part.name)
            return [
                `course : ${names(beast.run)}`,
                `morsure : ${names(beast.bite)}`,
                `corps : ${body.join(", ")}`,
                `PV ${beast.hearts.reduce((sum, group) => sum + group.count, 0)}`,
            ]
        }
    }
}

/** What a card did played alone, the amounts it moved the dummy or itself by: `moved 2.0, damage 1.0`. */
function measureText(measure: CardMeasure|null): string {
    if(!measure) return ""
    const seen = Object.entries(measure).filter(([, amount]) => amount > 0)
    return ` (${seen.map(([key, amount]) => `${key} ${amount.toFixed(1)}`).join(", ")})`
}

/** The cards of a deck round by round, as the monsters are written. */
function rowsOf(cards: readonly Card[], size: number): string[] {
    const found: string[] = []
    for(let at = 0; at < cards.length; at += size) found.push(`  ${names(cards.slice(at, at + size))}`)
    return found
}

/** The profile of each card of a source, to see why the chains are what they are. */
function profiles(kind: Kind<unknown>, value: unknown): string[] {
    return profileRows(kind, value).map(({ card, profile, measure }) => {
        return `  ${card.name} : ${profile.id}${measureText(measure)}`
    })
}

/** `convert`: what a thing of a type becomes as a thing of another, with how each of its cards was read. */
export function convertCommand(args: readonly string[]): string {
    const words: string[] = []
    const sizes: { run?: Range, bite?: Range, main?: Range, pool?: number } = {}
    for(let at = 0; at < args.length; at++){
        const arg = args[at]
        if(arg === "--help"){
            return CONVERT_USAGE
        }
        if(!arg.startsWith("--")){
            words.push(arg)
            continue
        }
        const value = args[++at]
        if(value === undefined) throw new UsageError(`${arg} : une valeur est attendue.`)
        if(arg === "--run" || arg === "--bite" || arg === "--main"){
            sizes[arg.slice(2) as "run"|"bite"|"main"] = rangeOf(arg, value)
        }
        else if(arg === "--pool") sizes.pool = rangeOf(arg, value).max
        else throw new UsageError(`Option inconnue : ${arg}\n${CONVERT_USAGE}`)
    }
    if(words.length !== 2) throw new UsageError(CONVERT_USAGE)
    const { kind: from, value } = sourceOf(words[0])
    const to = targetNamed(words[1])
    const head = [
        "Source :",
        ...lines(from, value),
        "Profils des cartes :",
        ...profiles(from, value),
    ]
    try {
        const made = convert(from, value, to, { ...to.defaults, ...sizes } satisfies Sizes)
        return [
            `# ${from.id}:${from.nameOf(value)} -> ${to.id}:${nameOfMade(to, made)}`,
            ...head,
            "Résultat :",
            ...lines(to, made),
        ].join("\n")
    }
    catch(error){
        if(!(error instanceof NoResultError)) throw error
        return [`# ${from.id}:${from.nameOf(value)} -> ${to.id}`, ...head, "Résultat :", `  ${error.why}`].join("\n")
    }
}

/** The name of what a target built: a kind names its things, the rest are cards. */
function nameOfMade(target: Target<unknown>, made: unknown): string {
    return "nameOf" in target ? (target as Kind<unknown>).nameOf(made) : (made as Card).name
}
