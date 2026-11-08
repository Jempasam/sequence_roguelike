import { ALL_FLOORS, BATTLE, BOSS, ELITE, Journey, redHearts, Rng } from "@game/core/mecard"
import type { FightType, FloorType, Monster } from "@game/core/mecard"

import { normalize, UsageError } from "./errors"
import { sameFighter } from "./fighters"
import type { Body, Fighter, Roster } from "./fighters"
import { fight } from "./fight"
import type { Combatant, FightResult } from "./fight"
import { MAX_FOES } from "./outputs"
import type { Atom } from "./outputs"
import { parseStrategy } from "./strategies"
import type { Strategy } from "./strategies"

export const FIGHT_TYPES: Readonly<Record<"battle"|"elite"|"boss", FightType>> = { battle: BATTLE, elite: ELITE, boss: BOSS }

/** What the battles of a run share, whatever the cell they measure. */
export interface Setup {
    readonly roster: Roster

    /** The fighters the partners of a team are drawn from. */
    readonly pool: readonly Fighter[]
    readonly level: number
    readonly layers: { readonly from: number, readonly to: number }
    readonly fightType: FightType
    readonly maxRounds: number

    /** How many rounds in a row without any life gained or lost make a battle blocked, none to never. */
    readonly stall: number

    /** Is a battle that times out given to the side that hurt the other the most, if any did? */
    readonly softWin: boolean
    readonly seed: number

    /** The AI of the allies and of the foes that are kits, and what some fighters are played by instead. */
    readonly allies: Strategy
    readonly foes: Strategy
    readonly overrides: ReadonlyMap<string, Strategy>
}

/** The AI of the monsters of the game: the one of a run, with no usable to use. */
const MONSTER_AI = parseStrategy("deck-usables", "")

/** A hash of texts and numbers, a seed. */
function hash(...parts: readonly (string|number)[]): number {
    let value = 0x811c9dc5
    for(const char of parts.join("|")){
        value ^= char.codePointAt(0) ?? 0
        value = Math.imul(value, 0x01000193)
    }
    return value >>> 0
}

/** What a monster brings as a foe, as a run makes it: more hearts at a higher level, a deck kept in order. */
function hostileBody(monster: Monster, level: number): Body {
    return {
        hearts: redHearts(monster.hearts + level - 1),
        decks: [[...monster.cards]],
        items: [],
        usables: [],
        bases: { draw: monster.draw, firstDraw: monster.draw, ordered: true, size: monster.size ?? 1 },
    }
}

/** Some of the candidates, drawn without putting back. */
function draw<T>(candidates: readonly T[], count: number, rng: Rng): T[] {
    const left = [...candidates]
    rng.shuffle(left)
    return left.slice(0, count)
}

/** The strategy of a fighter: the one it was given, or its side's. */
function strategyFor(fighter: Fighter, setup: Setup, side: "allies"|"foes"): Strategy {
    return setup.overrides.get(normalize(fighter.name)) ?? setup[side]
}

function ally(fighter: Fighter, setup: Setup): Combatant {
    return { name: fighter.name, body: fighter.body(), strategy: strategyFor(fighter, setup, "allies"), hostile: false }
}

function foe(fighter: Fighter, setup: Setup, index: number): Combatant {
    if(fighter.monster) return monsterFoe(fighter.monster, setup, index)
    return { name: fighter.name, body: fighter.body(), strategy: strategyFor(fighter, setup, "foes"), hostile: false }
}

function monsterFoe(monster: Monster, setup: Setup, index: number): Combatant {
    return {
        name: `${monster.name} ${index + 1}`, body: hostileBody(monster, setup.level), strategy: MONSTER_AI, hostile: true,
    }
}

/** Monsters as the foes of a battle, numbered in the order they stand. */
function monstersOf(monsters: readonly Monster[], setup: Setup): Combatant[] {
    return monsters.map((each, index) => monsterFoe(each, setup, index))
}

/** How many maps are drawn looking for a fight of the kind asked before there is said to be none. */
const MAP_DRAWS = 50

/**
 * The monsters of a fight of a floor, as the game would lay them: a map of the floor is drawn, and a fight of
 * the kind and of the layers asked is picked on it.
 *
 * @throws {@link UsageError} When no map drawn holds a fight of that kind in those layers.
 */
function fightOf(floor: FloorType, setup: Setup, rng: Rng): Monster[] {
    const { from, to } = setup.layers
    for(let drawn = 0; drawn < MAP_DRAWS; drawn++){
        const journey = new Journey(rng)
        floor.create(setup.level).fillMap(journey)
        const fights = journey.places.filter(place => {
            return place.type === setup.fightType && place.layer >= from && place.layer <= to
        })
        const picked = rng.pick(fights)
        if(picked) return [...picked.monsters]
    }
    const kind = Object.entries(FIGHT_TYPES).find(([, type]) => type === setup.fightType)?.[0]
    throw new UsageError(
        `--fight ${kind} --layer ${from}-${to} : aucun combat de ce genre dans « ${floor.name} » `
        + `(${MAP_DRAWS} cartes tirées).`,
    )
}

/**
 * Check, before any battle, that the floors the cells fight in hold a fight of the kind and the layers asked.
 *
 * @throws {@link UsageError} When a floor holds none.
 */
export function validateFights(atoms: readonly Atom[], setup: Setup): void {
    const floors = new Set<FloorType>()
    for(const { opponent } of atoms){
        if(opponent.kind === "monsters") for(const floor of ALL_FLOORS) floors.add(floor)
        if(opponent.kind === "biome") floors.add(opponent.floor)
    }
    for(const floor of floors) fightOf(floor, setup, new Rng(setup.seed))
}

/**
 * Check, before any battle, that the pool holds enough fighters to complete every team the cells ask for.
 *
 * @throws {@link UsageError} When a subject cannot be given the partners of a team.
 */
export function validateTeams(subjects: readonly Fighter[], atoms: readonly Atom[], setup: Setup): void {
    for(const { team } of atoms){
        if(team.kind !== "size") continue
        for(const subject of subjects){
            const others = setup.pool.filter(each => !sameFighter(each, subject))
            if(others.length < team.size - 1){
                throw new UsageError(
                    `--pool : ${others.length} combattant(s) pour compléter l'équipe de « ${subject.name} » `
                    + `(${team.size - 1} nécessaire(s) pour une équipe de ${team.size}). Élargir --pool.`,
                )
            }
        }
    }
}

/**
 * Play one battle of a cell: the subject, with the team the cell asks for, against the opponents it asks for.
 * Everything drawn comes from a seed made of the run's seed, the subject, the cell and the number of the
 * battle, so the result of a cell does not depend on the other cells of the table.
 *
 * @param game - The number of the battle in its cell, from 0.
 */
export function playGame(
    subject: Fighter, atom: Atom, game: number, aiName: string, setup: Setup,
): FightResult {
    const seed = hash(setup.seed, aiName, subject.kind, subject.name, atom.key, game)
    const rng = new Rng(seed)
    const { team, opponent } = atom

    const partners = team.kind === "with"
        ? [...team.partners]
        : draw(setup.pool.filter(each => !sameFighter(each, subject)), team.size - 1, rng)
    const allies = [subject, ...partners]
    const taken = new Set(allies.map(each => `${each.kind}:${each.name}`))

    const kitsOutside = (pool: "all"|"custom"|"official", count: number): Fighter[] => {
        const kits = (setup.roster.group("kits") ?? []).filter(kit => pool === "all" || (pool === "custom") === kit.custom)
        const others = kits.filter(kit => !taken.has(`${kit.kind}:${kit.name}`))
        const chosen = draw(others, count, rng)
        // Too few kits besides the allies: the allies themselves may be met.
        if(chosen.length >= count) return chosen
        return [...chosen, ...draw(kits.filter(kit => !chosen.includes(kit)), count - chosen.length, rng)]
    }

    let foes: Combatant[]
    switch(opponent.kind){
        case "monsters":
            foes = monstersOf(fightOf(rng.pick(ALL_FLOORS) ?? ALL_FLOORS[0], setup, rng), setup)
            break
        case "biome":
            foes = monstersOf(fightOf(opponent.floor, setup, rng), setup)
            break
        case "encounter":
            foes = monstersOf(opponent.monsters, setup)
            break
        case "kits":
            foes = kitsOutside(opponent.pool, allies.length).map((each, index) => foe(each, setup, index))
            break
        case "fixed": {
            const fixed = [...opponent.fighters]
            const fill = Math.max(0, allies.length - fixed.length)
            const named = new Set(fixed.map(each => `${each.kind}:${each.name}`))
            const others = (setup.roster.group("kits") ?? []).filter(kit => !taken.has(`${kit.kind}:${kit.name}`) && !named.has(`${kit.kind}:${kit.name}`))
            foes = [...fixed, ...draw(others, fill, rng)]
                .slice(0, MAX_FOES)
                .map((each, index) => foe(each, setup, index))
            break
        }
    }

    // A battle against kits is played once from each side, so the start does not favor the allies.
    const mirrored = foes.some(each => !each.hostile) && game % 2 === 1
    return fight({
        allies: allies.map(each => ally(each, setup)),
        foes,
        mirrored,
        seed: rng.int(2 ** 31),
        maxRounds: setup.maxRounds,
        stall: setup.stall,
        softWin: setup.softWin,
        defaults: { allies: setup.allies, foes: setup.foes },
    })
}
