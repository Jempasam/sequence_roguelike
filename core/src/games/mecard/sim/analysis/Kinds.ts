import { rgba } from "../base/Rgba"
import { visual } from "../base/Visual"
import type { Visual } from "../base/Visual"
import type { Card } from "../card/Card"
import { readsWhole } from "../card/CardChain"
import { beast } from "../card/CardType"
import type { BeastHearts } from "../card/CardType"
import { BeastCard } from "../card/subs/beast/BeastCard"
import { ModuleCard } from "../card/subs/mechanic/ModuleCard"
import { WAIT } from "../card/subs/movement/Wait"
import { booster } from "../catalog/boosters"
import type { Booster } from "../catalog/boosters"
import { ALL_BOOSTERS } from "../catalog/boosters"
import { ALL_CARDS, UNLIMITED_CARDS } from "../catalog/cards"
import { ALL_KITS, deckAround } from "../catalog/kits"
import type { Kit } from "../catalog/kits"
import { ALL_MONSTERS, monster } from "../catalog/monsters"
import type { Monster } from "../catalog/monsters"
import { ALL_PETS } from "../catalog/pets"
import type { Pet } from "../catalog/pets"
import { RED_HEART } from "../heart/subs/RedHeartKind"

import { orderedAnatomy, unorderedAnatomy } from "./Anatomy"
import type { Analysis, Anatomy } from "./Anatomy"
import { analysisOf } from "./analysisOf"
import { combineAnatomies } from "./combine"
import { alternated } from "./draws"
import { MergedAnalysis } from "./MergedAnalysis"
import { profileOf, RUN_PROFILE } from "./Profile"
import { range } from "./Sizes"
import type { Sizes } from "./Sizes"
import { bestSet, interchangeable } from "./UnorderedParts"

/**
 * A kind of thing a conversion ends in: a type of the game, with how it is built from an analysis. Some are
 * only built, never started from: a fusion, a mix, an element.
 */
export interface Target<T> {
    readonly id: string

    /** What it is called to the player. */
    readonly label: string

    /** The lengths it builds with, when the caller gives none. */
    readonly defaults: Sizes

    /**
     * What is built of an analysis, with the lengths of `sizes`. Always the same for the same analysis.
     *
     * @throws {@link NoResultError} When the unit has nothing this is made of, and why.
     */
    build(anatomy: Anatomy, analysis: Analysis, sizes: Sizes): T
}

/**
 * A kind of thing a conversion starts from and ends in: a type of the game, as the part of a catalog that
 * holds it, with how it is read into an anatomy and built back from one.
 */
export interface Kind<T> extends Target<T> {

    /** All of its kind the game has. */
    all(): readonly T[]

    nameOf(value: T): string

    /** What a source of this kind is, put in the form every kind is. */
    anatomy(value: T): Anatomy
}

// --- What kinds share ---

/** The look a thing with no body of its own is given when it is made a unit. */
const FALLBACK_SPRITE = visual("units/robot")

/** How many hearts what has none is given. */
const DEFAULT_HEARTS = 4

/** The hearts of an anatomy, counted all together. */
export function heartsOf(anatomy: Anatomy): number {
    const count = anatomy.hearts.reduce((sum, group) => sum + group.count, 0)
    return count > 0 ? count : DEFAULT_HEARTS
}

export function spriteOf(anatomy: Anatomy): Visual {
    return anatomy.sprite ?? FALLBACK_SPRITE
}

/** The cards of lists, each once, in the order they are first met. */
function distinct(...lists: readonly (readonly Card[])[]): Card[] {
    return [...new Set(lists.flat())]
}

/** Does a card play by itself? */
function reads(card: Card): boolean {
    return readsWhole([card])
}

/** A chain brought to `size` cards, the places before it filled with `fillers` one after the other. */
function padded(chain: readonly Card[], size: number, fillers: readonly Card[]): Card[] {
    const missing = Math.max(0, size - chain.length)
    return [...Array.from({ length: missing }, (_, index) => fillers[index % fillers.length]), ...chain]
}

/** The cards of a list repeated one after the other until there are `size`. */
function cycled(cards: readonly Card[], size: number): Card[] {
    if(cards.length === 0) return []
    return Array.from({ length: size }, (_, index) => cards[index % cards.length])
}

/** What the monsters and the pets are drawn in rounds of. */
const PET_ROUND = 3

/**
 * How many links a booster made of another thing has at least, and how many cards may stand in each beside
 * the card of the link. A booster has a pool for each link of a chain and draws one card of each pool, so a
 * draw gives the whole chain. A chain too short is completed by whole chains, never by a part of one.
 */
const BOOSTER_MIN_LINKS = 2
const BOOSTER_ALTERNATIVES = 3

/** How many red hearts a kit made of another thing is given, at least and at most. */
const KIT_MIN_HEARTS = 3
const KIT_MAX_HEARTS = 6

// --- The kinds ---

export const MONSTER_KIND: Kind<Monster> = {
    id: "monster",
    label: "monstre",
    defaults: { run: range(1, 3), bite: range(1, 3), main: range(2, 3), pool: 0, identity: range(2, 4) },
    all: () => ALL_MONSTERS,
    nameOf: value => value.name,
    anatomy: value => orderedAnatomy(value.name, value.cards, {
        sprite: value.sprite, roundSize: value.draw, hearts: [{ kind: RED_HEART, count: value.hearts }],
    }),
    build(anatomy, analysis, sizes) {
        const [run, bite, main] = [analysis.run(sizes), analysis.bite(sizes), analysis.main(sizes)]
        const draw = Math.max(1, run.length, bite.length, main.length)
        const fillers = [...analysis.support(sizes).filter(reads), WAIT]
        return monster({
            name: anatomy.name, sprite: spriteOf(anatomy), hearts: heartsOf(anatomy), draw,
            cards: [run, bite, main].flatMap(row => padded(row, draw, fillers)),
        })
    },
}

export const PET_KIND: Kind<Pet> = {
    id: "pet",
    label: "familier",
    defaults: { run: range(1, 2), bite: range(1, 3), main: range(2, 3), pool: 9, identity: range(2, 4) },
    all: () => ALL_PETS,
    nameOf: value => value.name,
    anatomy: value => unorderedAnatomy(value.name, value.cards, {
        sprite: value.sprite, hearts: [{ kind: RED_HEART, count: value.hearts }],
    }),
    build(anatomy, analysis, sizes) {
        const pool = distinct(
            analysis.run(sizes), analysis.bite(sizes), analysis.support(sizes), analysis.main(sizes),
            analysis.rest(),
        )
        return monster({
            name: anatomy.name, sprite: spriteOf(anatomy), hearts: heartsOf(anatomy), draw: PET_ROUND,
            cards: cycled(pool, sizes.pool),
        })
    },
}

export const KIT_KIND: Kind<Kit> = {
    id: "kit",
    label: "aventurier",
    defaults: { run: range(1, 2), bite: range(1, 3), main: range(2, 3), pool: 8, identity: range(2, 4) },
    all: () => ALL_KITS,
    nameOf: value => value.name,
    anatomy: value => unorderedAnatomy(value.name, value.cards, {
        sprite: value.sprite, hearts: value.hearts, unlimited: value.unlimited ?? UNLIMITED_CARDS,
    }),
    build(anatomy, analysis, sizes) {
        const everything = distinct(anatomy.unlimited, analysis.rest())
        const moves = bestSet(everything.filter(reads), RUN_PROFILE, 2)
        const unlimited = distinct(moves, UNLIMITED_CARDS).slice(0, 2)
        const cards = distinct(
            analysis.bite(sizes), analysis.main(sizes), analysis.support(sizes), analysis.run(sizes),
        )
            .filter(card => !unlimited.includes(card))
            .slice(0, sizes.pool)
        const reds = Math.min(KIT_MAX_HEARTS, Math.max(KIT_MIN_HEARTS, heartsOf(anatomy)))
        return {
            name: anatomy.name, sprite: spriteOf(anatomy), cards: deckAround(...cards), unlimited,
            items: [], usables: [], hearts: [{ kind: RED_HEART, count: reds }],
        }
    },
}

export const BOOSTER_KIND: Kind<Booster> = {
    id: "booster",
    label: "booster",
    defaults: { run: range(1, 2), bite: range(1, 3), main: range(2, 4), pool: 0, identity: range(2, 4) },
    all: () => ALL_BOOSTERS,
    nameOf: value => value.name,
    anatomy: value => unorderedAnatomy(value.name, alternated(value.pools.map(({ pool }) => pool))),
    build(anatomy, analysis, sizes) {
        // Chaîne principale //
        const links = [...analysis.main(sizes)]
        // Chaînes de complément //
        for(const chain of [analysis.bite(sizes), analysis.run(sizes)]){
            if(links.length >= BOOSTER_MIN_LINKS) break
            links.push(...chain.filter(card => !links.includes(card)))
        }
        // Un pool par maillon //
        const everything = analysis.rest()
        const pools = links.map(link => {
            const among = interchangeable(everything, link, profileOf(link))
            return { count: 1, pool: [link, ...among.slice(0, BOOSTER_ALTERNATIVES)] }
        })
        return booster({
            name: anatomy.name, color: rgba(0.75, 0.75, 0.75), icon: links[0] ?? WAIT, pools,
        })
    },
}

export const MODULE_KIND: Kind<ModuleCard> = {
    id: "module",
    label: "module",
    defaults: { run: range(1, 2), bite: range(1, 3), main: range(2, 4), pool: 0, identity: range(2, 4) },
    all: () => ALL_CARDS.filter((card): card is ModuleCard => card instanceof ModuleCard),
    nameOf: value => value.name,
    anatomy: value => orderedAnatomy(value.name, value.cards),
    build: (anatomy, analysis, sizes) => {
        return new ModuleCard(`Module ${anatomy.name.replace(/^Module /, "")}`, analysis.main(sizes))
    },
}

export const BEAST_KIND: Kind<BeastCard> = {
    id: "beast",
    label: "bête",
    defaults: { run: range(1, 2), bite: range(1, 3), main: range(2, 3), pool: 0, identity: range(2, 4) },
    all: () => ALL_CARDS.filter((card): card is BeastCard => card instanceof BeastCard),
    nameOf: value => value.name,
    anatomy: ({ beast: value }) => orderedAnatomy(value.name, [...value.run, ...value.bite], {
        sprite: value.sprite, hearts: value.hearts, run: value.run, bite: value.bite, body: value.body,
    }),
    build(anatomy, analysis, sizes) {
        const hearts: readonly BeastHearts[] = anatomy.hearts.length > 0
            ? anatomy.hearts
            : [{ kind: RED_HEART, count: DEFAULT_HEARTS }]
        return new BeastCard(beast({
            name: anatomy.name, sprite: spriteOf(anatomy), hearts,
            run: analysis.run(sizes), bite: analysis.bite(sizes), body: analysis.roles(sizes),
        }))
    },
}

/** Every kind a conversion starts from or ends in. */
export const KINDS: readonly Kind<unknown>[] = [
    MONSTER_KIND, PET_KIND, KIT_KIND, BOOSTER_KIND, MODULE_KIND, BEAST_KIND,
] as readonly Kind<unknown>[]

// --- Converting ---

/**
 * What a thing of a kind becomes as a thing of another: it is read into an anatomy, analysed in the way its
 * cards are ordered, and built as the target builds, with its own lengths unless `sizes` gives others.
 * The same thing always gives the same result.
 */
export function convert<A, B>(
    source: Kind<A>, value: A, target: Target<B>, sizes: Sizes = target.defaults,
): B {
    const anatomy = source.anatomy(value)
    return target.build(anatomy, analysisOf(anatomy), sizes)
}

/** A thing of a kind, as a source of a conversion. */
export interface Source<T = unknown> {
    readonly kind: Kind<T>
    readonly value: T
}

/**
 * What several things become as a thing of a kind: each is analysed on its own, the analyses are made one
 * and the target builds from it, named after all of them. With one source it is exactly `convert`.
 */
export function convertMany<B>(
    sources: readonly Source[], target: Target<B>, sizes: Sizes = target.defaults,
): B {
    if(sources.length === 0) throw new Error("convertMany : at least one source is needed")
    const anatomies = sources.map(({ kind, value }) => kind.anatomy(value))
    const anatomy = combineAnatomies(anatomies)
    if(anatomies.length === 1) return target.build(anatomy, analysisOf(anatomy), sizes)
    return target.build(anatomy, new MergedAnalysis(anatomies.map(analysisOf), anatomy), sizes)
}

/** A pet made of a thing of a kind. */
export function petOf<A>(source: Kind<A>, value: A, sizes?: Sizes): Pet {
    return convert(source, value, PET_KIND, sizes)
}

/** A monster made of a thing of a kind. */
export function monsterOf<A>(source: Kind<A>, value: A, sizes?: Sizes): Monster {
    return convert(source, value, MONSTER_KIND, sizes)
}

/** A kit made of a thing of a kind. */
export function kitOf<A>(source: Kind<A>, value: A, sizes?: Sizes): Kit {
    return convert(source, value, KIT_KIND, sizes)
}

/** A module made of a thing of a kind. */
export function moduleOf<A>(source: Kind<A>, value: A, sizes?: Sizes): ModuleCard {
    return convert(source, value, MODULE_KIND, sizes)
}

/** A beast made of a thing of a kind. */
export function beastOf<A>(source: Kind<A>, value: A, sizes?: Sizes): BeastCard {
    return convert(source, value, BEAST_KIND, sizes)
}

/** A booster made of a thing of a kind. */
export function boosterOf<A>(source: Kind<A>, value: A, sizes?: Sizes): Booster {
    return convert(source, value, BOOSTER_KIND, sizes)
}
