import { Codecs, routeCodec } from "../base/Codec"
import type { Codec } from "../base/Codec"
import { BURNING_GROUND, BURNING_GROUNDS } from "../hazard/subs/BurningGround"
import { PUDDLE_HAZARD, PUDDLES } from "../hazard/subs/Puddle"
import { BOULDERS, ROCKY } from "../hazard/subs/Rocky"
import { SURGING, WAVES } from "../hazard/subs/Surging"
import { WHIRLING, WHIRLWINDS } from "../hazard/subs/Whirling"
import { doseKey } from "../potion/Potion"
import type { Dose } from "../potion/Potion"
import type { Element } from "../element/Element"
import type { StatusType } from "../status/Status"
import { STATUS_TYPES } from "../status/statusTypes"
import { doseOf, elementOf } from "../status/StatusVariants"
import type { StatusVariants } from "../status/StatusVariants"
import type { DoseType, ElementType } from "../status/StatusVariants"
import { BARRELS, SPLASHING } from "../status/subs/Splashing"
import { COATED, COATS } from "../status/subs/Coated"
import { GRAND_RITUAL, GRAND_RITUALS } from "../status/subs/GrandRitual"

import { ELEMENT_NAMES, POTION_NAMES } from "./catalogNames"

/**
 * The codec of the variants of a kind of status made for a dose: the dose, as {@link doseKey} writes it, read
 * back as the variant of that dose.
 *
 * @throws {@link Error} When read back, for a dose of a potion the catalog does not have.
 */
function doseCodec(
    prefix: string, family: StatusType, variants: StatusVariants<Dose, DoseType>,
): Codec<StatusType> {
    return {
        prefix,
        is: type => doseOf(type, family) !== null,
        serialize: type => {
            const dose = doseOf(type, family)
            if(!dose) throw new Error(`${type} is no variant of ${family} made for a dose.`)
            return doseKey(dose)
        },
        parse: text => {
            const [name, sign, factor] = JSON.parse(text) as [string, number, number]
            const potion = POTION_NAMES.get(String(name))
            if(!potion) throw new Error(`No potion is named "${name}": the save comes from another version.`)
            return variants.of({ potion, sign: sign === -1 ? -1 : 1, factor: Number(factor) })
        },
    }
}

/** The codec of the variants of a kind of status made for an element: the element, by its name. */
function elementCodec(
    prefix: string, family: StatusType, variants: StatusVariants<Element, ElementType>,
): Codec<StatusType> {
    return {
        prefix,
        is: type => elementOf(type, family) !== null,
        serialize: type => {
            const element = elementOf(type, family)
            if(!element) throw new Error(`${type} is no variant of ${family} made for an element.`)
            return element.name
        },
        parse: name => variants.of(ELEMENT_NAMES.of(name)),
    }
}

/**
 * How the kinds of status are written down: the ones alone in their kind by name, the variants of a kind by
 * what sets them apart. A new kind of status with variants is a codec more here.
 */
export const STATUS_CODECS = new Codecs<StatusType>("status", [
    routeCodec("status", STATUS_TYPES),
    doseCodec("coated", COATED, COATS),
    doseCodec("barrel", SPLASHING, BARRELS),
    doseCodec("puddle", PUDDLE_HAZARD, PUDDLES),
    elementCodec("ritual", GRAND_RITUAL, GRAND_RITUALS),
    elementCodec("burning", BURNING_GROUND, BURNING_GROUNDS),
    elementCodec("whirling", WHIRLING, WHIRLWINDS),
    elementCodec("surging", SURGING, WAVES),
    elementCodec("rocky", ROCKY, BOULDERS),
])
