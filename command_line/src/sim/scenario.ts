import { BATTLE, BOSS, ELITE, foeOf, Journey, Rng } from "@game/core/mecard"
import type { FightType, FloorType, Monster } from "@game/core/mecard"

import { normalize, UsageError } from "./errors"
import type { Body, Fighter, FighterKind, Roster } from "./fighters"
import { fight } from "./fight"
import type { Combatant, FightResult } from "./fight"
import { MAX_FOES } from "./match"
import type { Pick, Row } from "./match"
import { takenKey } from "./sources"
import type { SourceDraw } from "./sources"
import type { Strategy } from "./strategies"

export const FIGHT_TYPES: Readonly<Record<"battle"|"elite"|"boss", FightType>> = { battle: BATTLE, elite: ELITE, boss: BOSS }

/**
 * Who plays what: the AI of a fighter is the one named for it, else the one of its side, else the one of its
 * kind, which the game gives a default.
 */
export interface Ais {
    readonly kit: Strategy
    readonly monster: Strategy
    readonly pet: Strategy

    /** What plays every fighter of a side, when the user says so. */
    readonly allies: Strategy|null
    readonly foes: Strategy|null

    /** What plays a fighter named, by the normalized name. */
    readonly byName: ReadonlyMap<string, Strategy>
}

/** What the battles of a run share, whatever the row they measure. */
export interface Setup {
    readonly roster: Roster
    readonly level: number
    readonly layers: { readonly from: number, readonly to: number }
    readonly fightType: FightType
    readonly maxRounds: number

    /** How many rounds in a row without any life gained or lost make a battle blocked, none to never. */
    readonly stall: number

    /** Is a battle that times out given to the side that hurt the other the most, if any did? */
    readonly softWin: boolean
    readonly seed: number
    readonly ai: Ais

    /** Every fight of a biome the run can pick, found once. */
    fightsOf(floor: FloorType): readonly (readonly Monster[])[]

    /** Is every battle written down in full, for `--log`? */
    readonly journal?: boolean
}

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
    const { hearts, decks, unlimited, items, usables, bases } = foeOf(monster, monster.name, level)
    return { hearts, decks, unlimited, items, usables, bases }
}

/** The strategy of a fighter: the one named for it, else its side's, else its kind's. */
function strategyFor(fighter: Fighter, setup: Setup, side: "allies"|"foes"): Strategy {
    const { ai } = setup
    const kind: FighterKind = fighter.kind
    return ai.byName.get(normalize(fighter.name)) ?? ai[side] ?? ai[kind]
}

function ally(fighter: Fighter, setup: Setup): Combatant {
    return { name: fighter.name, body: fighter.body(), strategy: strategyFor(fighter, setup, "allies"), hostile: false }
}

function foe(fighter: Fighter, setup: Setup, index: number): Combatant {
    const strategy = strategyFor(fighter, setup, "foes")
    if(fighter.monster){
        return {
            name: `${fighter.monster.name} ${index + 1}`, body: hostileBody(fighter.monster, setup.level), strategy, hostile: true,
        }
    }
    return { name: fighter.name, body: fighter.body(), strategy, hostile: false }
}

/** How many maps are drawn looking for a fight of the kind asked before there is said to be none. */
const MAP_DRAWS = 50

/**
 * Every fight of a biome that a run can pick, as the game would lay them: a map of the floor is drawn from
 * the seed, and the fights of the kind and of the layers asked on it are listed, in the order of the map.
 *
 * @throws {@link UsageError} When no map drawn holds a fight of that kind in those layers.
 */
function fightsOfFloor(floor: FloorType, setup: { level: number, layers: { from: number, to: number }, fightType: FightType, seed: number }): Monster[][] {
    const { from, to } = setup.layers
    const rng = new Rng(hash(setup.seed, "fights", floor.name))
    for(let drawn = 0; drawn < MAP_DRAWS; drawn++){
        const journey = new Journey(rng)
        floor.create(setup.level).fillMap(journey)
        const fights = journey.places.filter(place => {
            return place.fight === setup.fightType && place.layer >= from && place.layer <= to
        })
        if(fights.length > 0) return fights.map(place => [...place.monsters])
    }
    const kind = Object.entries(FIGHT_TYPES).find(([, type]) => type === setup.fightType)?.[0]
    throw new UsageError(
        `--fight ${kind} --layer ${from}-${to} : aucun combat de ce genre dans « ${floor.name} » `
        + `(${MAP_DRAWS} cartes tirées).`,
    )
}

/** The fights of the biomes, found when first asked and kept. */
export function fightsFinder(setup: { level: number, layers: { from: number, to: number }, fightType: FightType, seed: number }): Setup["fightsOf"] {
    const known = new Map<FloorType, readonly (readonly Monster[])[]>()
    return floor => {
        let found = known.get(floor)
        if(found === undefined){
            found = fightsOfFloor(floor, setup)
            known.set(floor, found)
        }
        return found
    }
}

/** The members a side gives for a battle: each pick plays its fight, and the kits it takes are no longer free to draw. */
function membersOf(picks: readonly Pick[], draw: SourceDraw, taken: Set<string>): Fighter[] {
    return picks.flatMap(({ source, index }) => {
        const members = source.get(index ?? 0, draw)
        for(const member of members) if(member.kind !== "monster") taken.add(takenKey(member))
        return members
    })
}

/**
 * Play one battle of a row: the allies it describes against the foes it describes. Everything drawn comes
 * from a seed made of the run's seed, the row and the number of the battle, so the result of a row does not
 * depend on the other rows of the table.
 *
 * @param game - The number of the battle in its row, from 0.
 */
export function playGame(row: Row, game: number, aiName: string, setup: Setup): FightResult {
    const seed = hash(setup.seed, aiName, row.key, game)
    const rng = new Rng(seed)
    const taken = new Set<string>()
    const draw: SourceDraw = { roster: setup.roster, fightsOf: setup.fightsOf, rng, taken, saved: new Map() }
    const allies = membersOf(row.allies, draw, taken)
    const foes = membersOf(row.foes, draw, taken).slice(0, MAX_FOES)

    // A battle against kits is played once from each side, so the start does not favor the allies.
    const combatants = foes.map((each, index) => foe(each, setup, index))
    const mirrored = combatants.some(each => !each.hostile) && game % 2 === 1
    const sides = {
        allies: allies.map(each => ally(each, setup)),
        foes: combatants,
    }
    const result = fight({
        ...sides,
        mirrored,
        seed: rng.int(2 ** 31),
        maxRounds: setup.maxRounds,
        stall: setup.stall,
        softWin: setup.softWin,
        defaults: { allies: setup.ai.allies ?? setup.ai.kit, foes: setup.ai.foes ?? setup.ai.kit },
        journal: setup.journal,
    })
    if(!result.log) return result
    const header = [
        `########## ${aiName} | ${row.label} | partie ${game + 1} | graine ${seed} ##########`,
        `Alliés : ${sides.allies.map(each => `${each.name} (${each.strategy.name})`).join(", ")}`,
        `Adversaires : ${combatants.map(each => `${each.name} (${each.strategy.name}${each.hostile ? ", monstre" : ""})`).join(", ")}`,
        `Côtés : ${mirrored ? "alliés en haut (côté des monstres)" : "alliés en bas"}`,
    ]
    return { ...result, log: [...header, ...result.log] }
}
