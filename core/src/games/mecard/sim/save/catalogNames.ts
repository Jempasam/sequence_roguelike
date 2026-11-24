import { Codecs, routeCodec } from "../base/Codec"
import type { Codec } from "../base/Codec"
import { Visual } from "../base/Visual"
import type { VisualData } from "../base/Visual"
import type { Card } from "../card/Card"
import { Rarity } from "../card/Rarity"
import { beast } from "../card/CardType"
import { BeastCard } from "../card/subs/beast/BeastCard"
import { ElementCard } from "../card/subs/spell/ElementCard"
import { SECRET_CARD } from "../card/subs/SecretCard"
import { CompositeCard } from "../card/subs/composite/CompositeCard"
import { FusionCard } from "../card/subs/composite/FusionCard"
import { MergedCard } from "../card/subs/composite/MergedCard"
import { ModuleCard } from "../card/subs/mechanic/ModuleCard"
import { RandomCard } from "../card/subs/composite/RandomCard"
import { ALL_FLOORS } from "../catalog/floors"
import { ALL_CARDS, ALL_USABLES, ALL_ITEMS, VARIANT_CARDS } from "../catalog/index"
import { ALL_MONSTERS, monster as monsterOf } from "../catalog/monsters"
import type { Monster } from "../catalog/monsters"
import { ALL_PETS } from "../catalog/pets"
import type { Element } from "../element/Element"
import type { FloorType } from "../floor/Floor"
import { BASE_ELEMENTS, COMPOUNDS } from "../element/reactions"
import { BodyElement } from "../element/subs/BodyElement"
import { HeartsBoon } from "../element/subs/body/HeartsBoon"
import { PotionBoon } from "../element/subs/body/PotionBoon"
import type { Usable } from "../usable/Usable"
import type { HeartKind } from "../heart/HeartKind"
import { BLACK_HEART } from "../heart/subs/BlackHeartKind"
import { BLUE_HEART } from "../heart/subs/BlueHeartKind"
import { EXPLOSIVE_HEART } from "../heart/subs/ExplosiveHeartKind"
import { GLASS_HEART } from "../heart/subs/GlassHeartKind"
import { GREEN_HEART } from "../heart/subs/GreenHeartKind"
import { PINK_HEART } from "../heart/subs/PinkHeartKind"
import { QUICK_HEART } from "../heart/subs/QuickHeartKind"
import { RED_HEART } from "../heart/subs/RedHeartKind"
import { SHIELD_HEART } from "../heart/subs/ShieldHeartKind"
import { SOLID_HEART } from "../heart/subs/SolidHeartKind"
import { THORN_HEART } from "../heart/subs/ThornHeartKind"
import { TIME_HEART } from "../heart/subs/TimeHeartKind"
import { VITAL_HEART } from "../heart/subs/VitalHeartKind"
import type { Item } from "../item/Item"
import type { Potion } from "../potion/Potion"
import { potionOfStatus, POTIONS } from "../potion/subs/potions"
import { STATUS_TYPES } from "../status/statusTypes"

/** Every kind of heart, as saved by name. */
export const HEART_KINDS: readonly HeartKind[] = [
    RED_HEART, SHIELD_HEART, THORN_HEART, GLASS_HEART, TIME_HEART, SOLID_HEART, BLUE_HEART, PINK_HEART,
    BLACK_HEART, EXPLOSIVE_HEART, VITAL_HEART, QUICK_HEART, GREEN_HEART,
]

/** The potions of the catalog by name. */
export const POTION_NAMES = new Map<string, Potion>(POTIONS.map(potion => [potion.name, potion]))

/**
 * The potion of a name: one of the catalog, else the one that puts on the kind of status of that name, which
 * is how an element made of a status with no potion of the catalog is written down.
 *
 * @throws {@link Error} When neither has the name: a save of another version, or a corrupted one.
 */
export function potionNamed(name: string): Potion {
    const potion = POTION_NAMES.get(String(name))
    if(potion) return potion
    const type = STATUS_TYPES.find(each => each.name === String(name))
    if(!type) throw new Error(`No potion is named "${name}": the save comes from another version.`)
    return potionOfStatus(type)
}

/**
 * Values found by their name, as a save writes them down: a name names one value of its kind, which the
 * catalog guarantees and a test checks.
 */
class Names<T extends { readonly name: string }> {


    constructor(
        /** What they are, for the error of a name not found. */
        public readonly kind: string,

        values: readonly T[],
    ){
        this.#values = new Map(values.map(value => [value.name, value]))
    }


    /**
     * The value of a name.
     *
     * @throws {@link Error} When none has that name: a save of another version, or a corrupted one.
     */
    public of(name: string): T {
        const value = this.#values.get(name)
        if(!value) throw new Error(`No ${this.kind} is named "${name}": the save comes from another version.`)
        return value
    }

    /** Is a value the one of its name? */
    public has(value: T): boolean {
        return this.#values.get(value.name) === value
    }


    readonly #values: ReadonlyMap<string, T>
}

/** The codecs of the cards: those of the catalog, the secret one among them, then the ones holding cards. */
export const CARD_CODECS: Codecs<Card> = new Codecs<Card>("card", [
    variantCodec(),
    routeCodec("card", [...ALL_CARDS, SECRET_CARD]),
    cardsCodec("fused", FusionCard, (cards, name) => FusionCard.ofChain(cards, name === undefined ? {} : { name })),
    cardsCodec("merged", MergedCard, (cards, name) => MergedCard.ofChain(cards, name === undefined ? {} : { name })),
    cardsCodec("random", RandomCard, cards => new RandomCard(...pair(cards))),
    moduleCodec(),
    beastCodec(),
    monsterElementCardCodec(),
])

/**
 * The codecs of the elements: the base ones and the compounds by name, then the ones made from a monster.
 * A status made for an element writes its element with them, so an element of a card is one a save can hold.
 */
export const ELEMENT_CODECS: Codecs<Element> = new Codecs<Element>("element", [
    routeCodec("base", [...BASE_ELEMENTS, ...COMPOUNDS]),
    monsterElementCodec(),
    bodyElementCodec(),
])

/**
 * The codec of an element made from a monster of the game and two potions: the monster and the potions, each
 * by its name. The first format of an element of a body, still read, and still written for those.
 */
function monsterElementCodec(): Codec<Element> {
    return {
        prefix: "monster",
        is: element => {
            return element instanceof BodyElement
                && MONSTER_NAMES.has(element.monster)
                && element.positive instanceof PotionBoon
        },
        serialize: element => {
            const { monster, negative, positive } = element as BodyElement
            return JSON.stringify([monster.name, negative.name, (positive as PotionBoon).potion.name])
        },
        parse: text => {
            const [monster, negative, positive] = JSON.parse(text) as [string, string, string]
            return BodyElement.ofPotions(
                MONSTER_NAMES.of(monster), potionNamed(negative), potionNamed(positive),
            )
        },
    }
}

/**
 * The codec of any other element of a body: a body an analysis built is none of the game's, so it is written
 * whole, with its cards, and so are the effects, a potion by its name, hearts by their kind and number.
 */
function bodyElementCodec(): Codec<Element> {
    return {
        prefix: "body",
        is: element => element instanceof BodyElement,
        serialize: element => {
            const { monster, negative, positive } = element as BodyElement
            const saved: SavedBodyElement = {
                body: {
                    name: monster.name,
                    sprite: monster.sprite.toData(),
                    hearts: monster.hearts,
                    draw: monster.draw,
                    ...monster.size === undefined ? {} : { size: monster.size },
                    cards: monster.cards.map(card => CARD_CODECS.save(card)),
                },
                negative: negative.name,
                positive: positive instanceof HeartsBoon
                    ? { hearts: positive.heart.name, count: positive.count }
                    : { potion: (positive as PotionBoon).potion.name },
            }
            return JSON.stringify(saved)
        },
        parse: text => {
            const saved = JSON.parse(text) as SavedBodyElement
            const { body } = saved
            const monster = monsterOf({
                name: body.name,
                sprite: Visual.of(body.sprite),
                hearts: body.hearts,
                draw: body.draw,
                ...body.size === undefined ? {} : { size: body.size },
                cards: body.cards.map(card => CARD_CODECS.load(card)),
            })
            const positive = "hearts" in saved.positive
                ? new HeartsBoon(HEART_NAMES.of(saved.positive.hearts), saved.positive.count)
                : new PotionBoon(potionNamed(saved.positive.potion))
            return new BodyElement(monster, potionNamed(saved.negative), positive)
        },
    }
}

/** An element of a body as {@link bodyElementCodec} writes it. */
interface SavedBodyElement {
    readonly body: {
        readonly name: string
        readonly sprite: VisualData
        readonly hearts: number
        readonly draw: number
        readonly size?: number
        readonly cards: readonly string[]
    }
    readonly negative: string
    readonly positive: { readonly potion: string }|{ readonly hearts: string, readonly count: number }
}

/** The codec of the element card of an element made from a monster, whose rarity is always the same. */
function monsterElementCardCodec(): Codec<Card> {
    return {
        prefix: "monsterElement",
        is: card => card instanceof ElementCard && card.element instanceof BodyElement,
        serialize: card => ELEMENT_CODECS.save((card as ElementCard).element),
        parse: text => new ElementCard(ELEMENT_CODECS.load(text), Rarity.RARE),
    }
}

/** The codec of a beast made during a run, none of the catalog: its body and its cards, each written down. */
function beastCodec(): Codec<Card> {
    return {
        prefix: "beast",
        is: card => card instanceof BeastCard,
        serialize: card => {
            const { name, sprite, hearts, run, bite, body } = (card as BeastCard).beast
            return JSON.stringify({
                name,
                sprite: sprite.toData(),
                hearts: hearts.map(({ kind, count }) => [kind.name, count]),
                run: run.map(each => CARD_CODECS.save(each)),
                bite: bite.map(each => CARD_CODECS.save(each)),
                body: body.map(part => typeof part === "string" ? { place: part } : CARD_CODECS.save(part)),
            })
        },
        parse: text => {
            const saved = JSON.parse(text) as SavedBeast
            return new BeastCard(beast({
                name: saved.name,
                sprite: Visual.of(saved.sprite),
                hearts: saved.hearts.map(([kind, count]) => ({ kind: HEART_NAMES.of(kind), count })),
                run: saved.run.map(each => CARD_CODECS.load(each)),
                bite: saved.bite.map(each => CARD_CODECS.load(each)),
                body: saved.body.map(part => typeof part === "string" ? CARD_CODECS.load(part) : part.place),
            }))
        },
    }
}

/** A beast as {@link beastCodec} writes it. */
interface SavedBeast {
    readonly name: string
    readonly sprite: VisualData
    readonly hearts: readonly (readonly [string, number])[]
    readonly run: readonly string[]
    readonly bite: readonly string[]
    readonly body: readonly (string|{ readonly place: "run"|"bite" })[]
}

/**
 * The codec of a card with variants: its name and its place among its variants, so identity tells the
 * variants apart. Asked before the catalog, which would write the one of the catalog by its name alone.
 */
function variantCodec(): Codec<Card> {
    const byName = new Map(VARIANT_CARDS.map(card => [card.name, card]))
    return {
        prefix: "variant",
        is: card => card.variants().size > 0,
        serialize: card => `${card.name}:${[...card.variants().values()].indexOf(card)}`,
        parse: text => {
            const at = text.lastIndexOf(":")
            const family = at < 0 ? undefined : byName.get(text.slice(0, at))
            const variant = family ? [...family.variants().values()][Number(text.slice(at + 1))] : undefined
            if(!variant) throw new Error(`No variant is written as "${text}": the save comes from another version.`)
            return variant
        },
    }
}

/** The codec of a module made during a run, none of the catalog: its name, then its cards, each written down. */
function moduleCodec(): Codec<Card> {
    return {
        prefix: "module",
        is: card => card instanceof ModuleCard,
        serialize: card => {
            const { name, cards } = card as ModuleCard
            return JSON.stringify([name, cards.map(each => CARD_CODECS.save(each))])
        },
        parse: text => {
            const [name, cards] = JSON.parse(text) as [string, string[]]
            return new ModuleCard(String(name), cards.map(each => CARD_CODECS.load(each)))
        },
    }
}

/** The codec of a kind of card holding cards: its cards, each written down, in order. */
function cardsCodec<C extends Card>(
    prefix: string, kind: abstract new (...args: never[]) => C, make: (cards: readonly Card[], name?: string) => C,
): Codec<Card> {
    return {
        prefix,
        is: card => card instanceof kind,
        // Its cards, and its name with them when it was given one of its own: a fusion of a monster.
        serialize: card => {
            const cards = (card.contents ?? []).map(each => CARD_CODECS.save(each))
            return JSON.stringify(card instanceof CompositeCard && card.named ? { name: card.name, cards } : cards)
        },
        parse: text => {
            const saved = JSON.parse(text) as string[]|{ name: string, cards: string[] }
            const [cards, name] = Array.isArray(saved) ? [saved, undefined] : [saved.cards, saved.name]
            return make(cards.map(each => CARD_CODECS.load(each)), name)
        },
    }
}

/** @throws {@link Error} For anything but two cards. */
function pair(cards: readonly Card[]): [Card, Card] {
    if(cards.length !== 2) throw new Error(`A card holding two cards holds ${cards.length}: the save is corrupted.`)
    return [cards[0], cards[1]]
}

export const ITEM_NAMES = new Names<Item>("item", ALL_ITEMS)
export const USABLE_NAMES = new Names<Usable>("usable", ALL_USABLES)
export const HEART_NAMES = new Names<HeartKind>("heart", HEART_KINDS)
export const MONSTER_NAMES = new Names<Monster>("monster", [...ALL_MONSTERS, ...ALL_PETS])
export const FLOOR_NAMES = new Names<FloorType>("floor", ALL_FLOORS)
