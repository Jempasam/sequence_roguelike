import type { Card } from "../card/Card"
import { SECRET_CARD } from "../card/subs/SecretCard"
import { FLOOR_TYPES } from "../catalog/floors"
import { ALL_CARDS, USABLES, ITEMS } from "../catalog/index"
import { MONSTERS } from "../catalog/monsters"
import type { Monster } from "../catalog/monsters"
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
import { BURNING_GROUND, BurningGround } from "../hazard/subs/BurningGround"
import type { ContactHazard } from "../hazard/subs/ContactHazard"
import { MINE_HAZARD, Mined } from "../hazard/subs/Mine"
import { Puddle, PUDDLE_HAZARD } from "../hazard/subs/Puddle"
import { Rocky, ROCKY } from "../hazard/subs/Rocky"
import { Surging, SURGING } from "../hazard/subs/Surging"
import { Whirling, WHIRLING } from "../hazard/subs/Whirling"
import { QUICK_HEART } from "../heart/subs/QuickHeartKind"
import { RED_HEART } from "../heart/subs/RedHeartKind"
import { SHIELD_HEART } from "../heart/subs/ShieldHeartKind"
import { SOLID_HEART } from "../heart/subs/SolidHeartKind"
import { THORN_HEART } from "../heart/subs/ThornHeartKind"
import { TIME_HEART } from "../heart/subs/TimeHeartKind"
import { VITAL_HEART } from "../heart/subs/VitalHeartKind"
import type { Item } from "../item/Item"
import type { Dose, Potion } from "../potion/Potion"
import { POTIONS } from "../potion/subs/potions"
import type { RoundStatus } from "../status/RoundStatus"
import type { Status, StatusType } from "../status/Status"
import { BLOODLUST, Bloodlust } from "../status/subs/Bloodlust"
import { BURN, Burn } from "../status/subs/Burn"
import { Coated, COATED } from "../status/subs/Coated"
import { CONFUSED, Confusion } from "../status/subs/Confusion"
import { Dodge, DODGE } from "../status/subs/Dodge"
import { Fleeting, FLEETING } from "../status/subs/Fleeting"
import { FRENZIED, Frenzy } from "../status/subs/Frenzy"
import { GRAND_RITUAL, GrandRitual } from "../status/subs/GrandRitual"
import { Healing, HEALING } from "../status/subs/Healing"
import { Poison, POISONED } from "../status/subs/Poison"
import { ENRAGED, Rage } from "../status/subs/Rage"
import { Rooted, ROOTED } from "../status/subs/Rooted"
import { SLOWED, Slowness } from "../status/subs/Slowness"
import { Splashing, SPLASHING } from "../status/subs/Splashing"
import { Vulnerability, VULNERABLE } from "../status/subs/Vulnerability"
import { WEAKENED, Weakness } from "../status/subs/Weakness"

/** Every kind of heart, as saved by name. */
export const HEART_KINDS: readonly HeartKind[] = [
    RED_HEART, SHIELD_HEART, THORN_HEART, GLASS_HEART, TIME_HEART, SOLID_HEART, BLUE_HEART, PINK_HEART,
    BLACK_HEART, EXPLOSIVE_HEART, VITAL_HEART, QUICK_HEART,
]

/** What a status holds, written down: a number, or a potion and its numbers. */
export type StatusData = number|readonly (string|number)[]

/** How a kind of status is written down: what it holds, and the status back from it. */
export interface StatusCodec {
    readonly type: StatusType
    save(status: Status): StatusData
    load(data: StatusData): Status
}

/** The potions by name. */
export const POTION_NAMES = new Map<string, Potion>(POTIONS.map(potion => [potion.name, potion]))

/** A dose and a level, written down: the potion by name, its sign, its factor, the level. */
export function savedDose(dose: Dose, level: number): (string|number)[] {
    return [dose.potion.name, dose.sign, dose.factor, level]
}

/**
 * A dose and a level, read back.
 *
 * @throws {@link Error} For data that is not a potion and its numbers.
 */
export function loadedDose(data: StatusData): { dose: Dose, level: number } {
    if(typeof data === "number") throw new Error("A potion was saved as a number: the save is corrupted.")
    const [name, sign, factor, level] = data
    const potion = POTION_NAMES.get(String(name))
    if(!potion) throw new Error(`No potion is named "${name}": the save comes from another version.`)
    return { dose: { potion, sign: sign === -1 ? -1 : 1, factor: Number(factor) }, level: Number(level) }
}

/** The number a status holds, written down as one. */
function numberOf(data: StatusData): number {
    if(typeof data !== "number") throw new Error("A status holding a number was saved otherwise: the save is corrupted.")
    return data
}

/** How a status lasting rounds is written down: the rounds it has left. */
function roundCodec(type: StatusType, make: (rounds: number) => RoundStatus): StatusCodec {
    return { type, save: status => (status as RoundStatus).rounds, load: rounds => make(numberOf(rounds)) }
}

/** The element a status holds, written down as a name in a list of one or more. */
function elementOf(data: StatusData): Element {
    if(typeof data === "number") throw new Error("An element was saved as a number: the save is corrupted.")
    return ELEMENT_NAMES.of(String(data[0]))
}

/** How a body called by an element is written down: the element, by name. */
function contactCodec(type: StatusType, make: (element: Element) => ContactHazard): StatusCodec {
    return {
        type, save: status => [(status as ContactHazard).element.name], load: data => make(elementOf(data)),
    }
}

/** How each kind of status is written down. */
export const STATUS_CODECS: readonly StatusCodec[] = [
    { type: BURN, save: status => (status as Burn).rounds, load: rounds => new Burn(numberOf(rounds)) },
    { type: ROOTED, save: status => (status as Rooted).steps, load: steps => new Rooted(numberOf(steps)) },
    { type: DODGE, save: () => 0, load: () => new Dodge() },
    { type: FLEETING, save: () => 0, load: () => new Fleeting() },
    {
        type: HEALING, save: status => (status as Healing).halves,
        load: halves => new Healing(numberOf(halves)),
    },
    {
        type: SPLASHING,
        save: status => savedDose((status as Splashing).dose, (status as Splashing).level),
        load: data => {
            const { dose, level } = loadedDose(data)
            return new Splashing(dose, level)
        },
    },
    {
        type: COATED,
        save: status => savedDose((status as Coated).dose, (status as Coated).level),
        load: data => {
            const { dose, level } = loadedDose(data)
            return new Coated(dose, level)
        },
    },
    roundCodec(POISONED, rounds => new Poison(rounds)),
    roundCodec(SLOWED, rounds => new Slowness(rounds)),
    roundCodec(WEAKENED, rounds => new Weakness(rounds)),
    roundCodec(ENRAGED, rounds => new Rage(rounds)),
    roundCodec(CONFUSED, rounds => new Confusion(rounds)),
    roundCodec(VULNERABLE, rounds => new Vulnerability(rounds)),
    roundCodec(FRENZIED, rounds => new Frenzy(rounds)),
    roundCodec(BLOODLUST, rounds => new Bloodlust(rounds)),
    { type: MINE_HAZARD, save: () => 0, load: () => new Mined() },
    {
        type: GRAND_RITUAL,
        save: status => [(status as GrandRitual).element.name, (status as GrandRitual).rounds],
        load: data => new GrandRitual(elementOf(data), Number((data as readonly (string|number)[])[1])),
    },
    {
        type: BURNING_GROUND, save: status => [(status as BurningGround).element.name],
        load: data => new BurningGround(elementOf(data)),
    },
    contactCodec(WHIRLING, element => new Whirling(element)),
    contactCodec(SURGING, element => new Surging(element)),
    contactCodec(ROCKY, element => new Rocky(element)),
    {
        type: PUDDLE_HAZARD,
        save: status => savedDose((status as Puddle).dose, (status as Puddle).level),
        load: data => {
            const { dose, level } = loadedDose(data)
            return new Puddle(dose, level)
        },
    },
]

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

/** The cards by name, the secret one among them. */
export const CARD_NAMES = new Names<Card>("card", [...ALL_CARDS, SECRET_CARD])

export const ITEM_NAMES = new Names<Item>("item", ITEMS)
export const ELEMENT_NAMES = new Names<Element>("element", [...BASE_ELEMENTS, ...COMPOUNDS])
export const USABLE_NAMES = new Names<Usable>("usable", USABLES)
export const HEART_NAMES = new Names<HeartKind>("heart", HEART_KINDS)
export const MONSTER_NAMES = new Names<Monster>("monster", MONSTERS)
export const FLOOR_NAMES = new Names<FloorType>("floor", FLOOR_TYPES)

/** The codecs of the statuses, by the name of their kind. */
export const STATUS_NAMES = new Names("status", STATUS_CODECS.map(codec => ({ name: codec.type.name, codec })))
