import { Codecs, routeCodec } from "../base/Codec"
import type { Codec } from "../base/Codec"
import type { Card } from "../card/Card"
import { SECRET_CARD } from "../card/subs/SecretCard"
import { FusionCard } from "../card/subs/composite/FusionCard"
import { MergedCard } from "../card/subs/composite/MergedCard"
import { RandomCard } from "../card/subs/composite/RandomCard"
import { FLOOR_TYPES } from "../catalog/floors"
import { CARDS, USABLES, ITEMS } from "../catalog/index"
import { MONSTERS } from "../catalog/monsters"
import type { Monster } from "../catalog/monsters"
import { PETS } from "../catalog/pets"
import type { Element } from "../element/Element"
import type { FloorType } from "../floor/Floor"
import { BASE_ELEMENTS, COMPOUNDS } from "../element/reactions"
import type { Usable } from "../usable/Usable"
import type { HeartKind } from "../heart/HeartKind"
import { BLACK_HEART } from "../heart/subs/BlackHeartKind"
import { BLUE_HEART } from "../heart/subs/BlueHeartKind"
import { EXPLOSIVE_HEART } from "../heart/subs/ExplosiveHeartKind"
import { GLASS_HEART } from "../heart/subs/GlassHeartKind"
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
import { POTIONS } from "../potion/subs/potions"

/** Every kind of heart, as saved by name. */
export const HEART_KINDS: readonly HeartKind[] = [
    RED_HEART, SHIELD_HEART, THORN_HEART, GLASS_HEART, TIME_HEART, SOLID_HEART, BLUE_HEART, PINK_HEART,
    BLACK_HEART, EXPLOSIVE_HEART, VITAL_HEART, QUICK_HEART,
]

/** The potions by name. */
export const POTION_NAMES = new Map<string, Potion>(POTIONS.map(potion => [potion.name, potion]))

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
    routeCodec("card", [...CARDS, SECRET_CARD]),
    cardsCodec("fused", FusionCard, cards => new FusionCard(cards)),
    cardsCodec("merged", MergedCard, cards => new MergedCard(cards)),
    cardsCodec("random", RandomCard, cards => new RandomCard(...pair(cards))),
])

/** The codec of a kind of card holding cards: its cards, each written down, in order. */
function cardsCodec<C extends Card>(
    prefix: string, kind: abstract new (...args: never[]) => C, make: (cards: readonly Card[]) => C,
): Codec<Card> {
    return {
        prefix,
        is: card => card instanceof kind,
        serialize: card => JSON.stringify((card.contents ?? []).map(each => CARD_CODECS.save(each))),
        parse: text => make((JSON.parse(text) as string[]).map(each => CARD_CODECS.load(each))),
    }
}

/** @throws {@link Error} For anything but two cards. */
function pair(cards: readonly Card[]): [Card, Card] {
    if(cards.length !== 2) throw new Error(`A card holding two cards holds ${cards.length}: the save is corrupted.`)
    return [cards[0], cards[1]]
}

export const ITEM_NAMES = new Names<Item>("item", ITEMS)
export const ELEMENT_NAMES = new Names<Element>("element", [...BASE_ELEMENTS, ...COMPOUNDS])
export const USABLE_NAMES = new Names<Usable>("usable", USABLES)
export const HEART_NAMES = new Names<HeartKind>("heart", HEART_KINDS)
export const MONSTER_NAMES = new Names<Monster>("monster", [...MONSTERS, ...PETS])
export const FLOOR_NAMES = new Names<FloorType>("floor", FLOOR_TYPES)
