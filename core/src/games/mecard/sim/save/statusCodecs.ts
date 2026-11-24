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
import { SOAKED, SOAKS } from "../status/subs/Soaked"
import { RITUAL_STATUS, RITUAL_STATUSES } from "../status/subs/RitualStatus"
import { ELEMENT_COATING, ELEMENT_COATINGS } from "../status/subs/ElementCoating"
import { POTION_COATING, POTION_COATINGS } from "../status/subs/PotionCoating"
import { ENCHANTED, ENCHANTMENTS } from "../status/subs/EnchantedBlade"

import { ELEMENT_CODECS, potionNamed } from "./catalogNames"

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
            const potion = potionNamed(name)
            return variants.of({ potion, sign: sign === -1 ? -1 : 1, factor: Number(factor) })
        },
    }
}

/** The codec of the variants of a kind of status made for an element: the element, as it is written by its codecs. */
function elementCodec(
    prefix: string, family: StatusType, variants: StatusVariants<Element, ElementType>,
): Codec<StatusType> {
    return {
        prefix,
        is: type => elementOf(type, family) !== null,
        serialize: type => {
            const element = elementOf(type, family)
            if(!element) throw new Error(`${type} is no variant of ${family} made for an element.`)
            return ELEMENT_CODECS.save(element)
        },
        parse: text => variants.of(ELEMENT_CODECS.load(text)),
    }
}

/**
 * How the kinds of status are written down: the ones alone in their kind by name, the variants of a kind by
 * what sets them apart. A new kind of status with variants is a codec more here.
 */
export const STATUS_CODECS = new Codecs<StatusType>("status", [
    routeCodec("status", STATUS_TYPES),
    doseCodec("coated", COATED, COATS),
    doseCodec("potion-coating", POTION_COATING, POTION_COATINGS),
    elementCodec("element-coating", ELEMENT_COATING, ELEMENT_COATINGS),
    doseCodec("soaked", SOAKED, SOAKS),
    doseCodec("barrel", SPLASHING, BARRELS),
    doseCodec("puddle", PUDDLE_HAZARD, PUDDLES),
    elementCodec("ritual", RITUAL_STATUS, RITUAL_STATUSES),
    elementCodec("enchanted", ENCHANTED, ENCHANTMENTS),
    elementCodec("burning", BURNING_GROUND, BURNING_GROUNDS),
    elementCodec("whirling", WHIRLING, WHIRLWINDS),
    elementCodec("surging", SURGING, WAVES),
    elementCodec("rocky", ROCKY, BOULDERS),
])
