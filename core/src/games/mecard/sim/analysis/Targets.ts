import { Rarity } from "../card/Rarity"
import { FusionCard } from "../card/subs/composite/FusionCard"
import { MergedCard } from "../card/subs/composite/MergedCard"
import { ElementCard } from "../card/subs/spell/ElementCard"
import { monster } from "../catalog/monsters"
import { BodyElement } from "../element/subs/BodyElement"
import type { Boon } from "../element/subs/body/Boon"
import { HeartsBoon } from "../element/subs/body/HeartsBoon"
import { PotionBoon } from "../element/subs/body/PotionBoon"
import type { Potion } from "../potion/Potion"
import { potionOfStatus } from "../potion/subs/potions"
import type { StatusType } from "../status/Status"
import { STATUS_TYPES } from "../status/statusTypes"

import type { EffectUse } from "./effects"
import { heartsOf, KINDS, spriteOf } from "./Kinds"
import type { Target } from "./Kinds"
import { NoResultError } from "./NoResult"
import { fusionName } from "./roundChains"
import { range } from "./Sizes"

/** The lengths of the chains the targets that only keep one chain ask for. */
const CHAIN_DEFAULTS = {
    run: range(1, 2), bite: range(1, 3), main: range(2, 3), pool: 0, identity: range(2, 4),
}

/**
 * A fusion of the chain that stands for the unit, named after its rarest card that does more than go or aim
 * and after the unit, "Estoc de Gobelin".
 */
export const FUSION_TARGET: Target<FusionCard> = {
    id: "fusion",
    label: "collage",
    defaults: CHAIN_DEFAULTS,
    build(anatomy, analysis, sizes) {
        const { chosen } = analysis.identity(sizes)
        if(chosen.length === 0) throw new NoResultError("aucune chaîne ne représente cette unité")
        return new FusionCard(chosen, { name: fusionName(chosen, anatomy.name) ?? anatomy.name })
    },
}

/**
 * A merge of the most telling cards the unit plays that merge into one, named as the fusion is.
 */
export const MERGED_TARGET: Target<MergedCard> = {
    id: "merged",
    label: "mélange",
    defaults: CHAIN_DEFAULTS,
    build(anatomy, analysis, sizes) {
        const { chosen } = analysis.melange(sizes)
        if(chosen.length < 2) throw new NoResultError("aucun mélange possible")
        return new MergedCard(chosen, { name: fusionName(chosen, anatomy.name) ?? anatomy.name })
    },
}

/**
 * The potion that puts a status on, none for a status a save could not write down by its name: those that are
 * a variant of a kind, made for a potion or an element.
 */
function potionOf(type: StatusType): Potion|null {
    return STATUS_TYPES.includes(type) ? potionOfStatus(type) : null
}

/** The first effect of those ranked that puts a status on, as a potion pouring it. */
function firstPotion(uses: readonly EffectUse[]): Potion|null {
    for(const { effect } of uses){
        const potion = effect.kind === "status" ? potionOf(effect.type) : null
        if(potion) return potion
    }
    return null
}

/** The first effect of those ranked that a body can give for a unit: a status put on, or hearts. */
function firstBoon(uses: readonly EffectUse[]): Boon|null {
    for(const { effect } of uses){
        if(effect.kind === "hearts") return new HeartsBoon(effect.heart, effect.count)
        const potion = potionOf(effect.type)
        if(potion) return new PotionBoon(potion)
    }
    return null
}

/** The neutral effects, ranked, as the potions that put them on. */
function neutralPotions(uses: readonly EffectUse[]): Potion[] {
    return uses.flatMap(({ effect }) => {
        const potion = effect.kind === "status" ? potionOf(effect.type) : null
        return potion ? [potion] : []
    })
}

/**
 * An element made of the unit, rare: a body that plays the chain that stands for the unit, with as many blue
 * hearts as the unit has, pouring the first negative effect it is known for and giving the first positive
 * one. A side with none takes a neutral effect, the first for the negative side, the next for the positive
 * one (the same when there is no other). None when it has no chain, or lacks both a side's effect and a
 * neutral one: nothing is made up to fill the place.
 */
export const ELEMENT_TARGET: Target<ElementCard> = {
    id: "element",
    label: "élément",
    defaults: CHAIN_DEFAULTS,
    build(anatomy, analysis, sizes) {
        const { chosen } = analysis.identity(sizes)
        if(chosen.length === 0){
            throw new NoResultError("aucun élément possible : aucune chaîne ne représente cette unité")
        }
        const effects = analysis.effects(sizes)
        const neutral = neutralPotions(effects.neutral)
        const negative = firstPotion(effects.negative) ?? neutral[0] ?? null
        const standIn = neutral.find(potion => potion !== negative) ?? neutral[0]
        const positive = firstBoon(effects.positive) ?? (standIn ? new PotionBoon(standIn) : null)
        if(!negative || !positive){
            const missing = [negative ? null : "négatif", positive ? null : "positif"]
            throw new NoResultError(
                `aucun élément possible : pas d'effet ${missing.filter(side => side !== null).join(" ni ")} ni neutre`,
            )
        }
        const body = monster({
            name: anatomy.name, sprite: spriteOf(anatomy), hearts: heartsOf(anatomy), draw: chosen.length,
            cards: chosen,
        })
        return new ElementCard(new BodyElement(body, negative, positive), Rarity.RARE)
    },
}

/** Every target a conversion ends in: the kinds, and what is only built. */
export const TARGETS: readonly Target<unknown>[] = [
    ...KINDS, FUSION_TARGET, MERGED_TARGET, ELEMENT_TARGET,
] as readonly Target<unknown>[]
