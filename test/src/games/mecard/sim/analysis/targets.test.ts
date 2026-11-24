import { describe, expect, test } from "vitest"
import {
    ALL_BOOSTERS, ALL_MONSTERS, analysisOf, BOOSTER_KIND, BURN, convert, convertMany, DODGE, ELEMENT_TARGET,
    ENRAGED, FRENZIED, FUSION_TARGET, HeartsBoon, KIT_KIND, KINDS, MERGED_TARGET, MONSTER_KIND, NoResultError,
    POISON_POTION, POISONED, potionOfStatus, PotionBoon, RED_HEART, SLOWNESS_POTION, TARGETS,
} from "@game/core/mecard"
import type { BodyElement, ElementCard, Target } from "@game/core/mecard"

const SOURCES = KINDS.flatMap(source => source.all().map(value => ({ source, value })))

/** What a target builds from a source, or why there is nothing. */
function attempt(target: Target<{ name: string }>, source: typeof SOURCES[number]): { name: string }|string {
    try {
        return convert(source.source, source.value, target)
    }
    catch(error){
        if(error instanceof NoResultError) return error.why
        throw error
    }
}

describe("the element target", () => {
    test("every source → an element of the effects it is known for, or the reason there is none", () => {
        const failures: string[] = []
        let made = 0
        for(const entry of SOURCES){
            const label = `${entry.source.id}:${entry.source.nameOf(entry.value)}`
            const result = attempt(ELEMENT_TARGET as Target<{ name: string }>, entry)
            if(typeof result === "string"){
                if(!result.startsWith("aucun élément possible")) failures.push(`${label}: ${result}`)
                continue
            }
            made++
            const { element } = result as unknown as ElementCard
            const body = element as BodyElement
            if(body.negative.polarity === "positive") failures.push(`${label}: negative is ${body.negative.name}`)
            const { positive } = body
            if(positive instanceof PotionBoon && positive.potion.polarity === "negative"){
                failures.push(`${label}: positive is ${positive.name}`)
            }
            const again = attempt(ELEMENT_TARGET as Target<{ name: string }>, entry)
            if(typeof again === "string" || again.name !== result.name) failures.push(`${label}: not deterministic`)
        }
        expect(failures).toEqual([])
        expect(made).toBeGreaterThanOrEqual(0)
    })

    test("a monster with slowness and one that heals → fused, an element: slowness against, red hearts for", () => {
        const sources = [
            { kind: MONSTER_KIND, value: ALL_MONSTERS.find(each => each.name === "Mage de glace")! },
            { kind: MONSTER_KIND, value: ALL_MONSTERS.find(each => each.name === "Gobelin soigneur")! },
        ]
        const card = convertMany(sources, ELEMENT_TARGET)
        const element = card.element as BodyElement
        expect(element.negative).toBe(SLOWNESS_POTION)
        expect(element.positive).toBeInstanceOf(HeartsBoon)
        expect((element.positive as HeartsBoon).heart).toBe(RED_HEART)
        expect(element.monster.name).toBe("Mage de glace-Gobelin soigneur")
        expect(element.monster.cards.length).toBe(element.monster.draw)
    })

    test("a monster with slowness only → no element, and the positive effect is the one missing", () => {
        const slime = ALL_MONSTERS.find(each => each.name === "Slime")!
        const run = (): unknown => convert(MONSTER_KIND, slime, ELEMENT_TARGET)
        expect(run).toThrow(NoResultError)
        expect(run).toThrow("pas d'effet positif")
    })

    test("a monster that heals only → no element, and the negative effect is the one missing", () => {
        const healer = ALL_MONSTERS.find(each => each.name === "Gobelin soigneur")!
        expect(() => convert(MONSTER_KIND, healer, ELEMENT_TARGET)).toThrow("pas d'effet négatif")
    })

    test("every source → each side holds only the states of its polarity, the same each time", () => {
        const failures: string[] = []
        for(const { source, value } of SOURCES){
            const label = `${source.id}:${source.nameOf(value)}`
            const first = analysisOf(source.anatomy(value)).effects(source.defaults)
            const again = analysisOf(source.anatomy(value)).effects(source.defaults)
            const polarityOf = (uses: typeof first.negative): string[] => {
                return uses.map(({ effect }) => effect.kind === "status" ? effect.type.polarity : "hearts")
            }
            if(!polarityOf(first.negative).every(polarity => polarity === "negative")) failures.push(`${label}: negative`)
            if(!polarityOf(first.positive).every(polarity => polarity === "positive" || polarity === "hearts")){
                failures.push(`${label}: positive`)
            }
            if(!polarityOf(first.neutral).every(polarity => polarity === "neutral")) failures.push(`${label}: neutral`)
            if(JSON.stringify(polarityOf(first.neutral)) !== JSON.stringify(polarityOf(again.neutral))){
                failures.push(`${label}: not deterministic`)
            }
        }
        expect(failures).toEqual([])
    })

    test("a unit with neutral effects only → the first stands in against, the next for", () => {
        const mind = ALL_MONSTERS.find(each => each.name === "Contrôleur mental")!
        const element = convert(MONSTER_KIND, mind, ELEMENT_TARGET).element as BodyElement
        expect(element.negative).toBe(potionOfStatus(ENRAGED))
        expect((element.positive as PotionBoon).potion).toBe(potionOfStatus(FRENZIED))
    })

    test("a unit with one neutral effect only → the same on both sides", () => {
        const berserker = ALL_MONSTERS.find(each => each.name === "Berserker")!
        const element = convert(MONSTER_KIND, berserker, ELEMENT_TARGET).element as BodyElement
        expect(element.negative).toBe(potionOfStatus(ENRAGED))
        expect((element.positive as PotionBoon).potion).toBe(potionOfStatus(ENRAGED))
    })

    test("a unit with a positive effect and a neutral one → the neutral stands in against, the positive stays", () => {
        const hypnotist = KIT_KIND.all().find(each => each.name === "Hypnotiseur")!
        const element = convert(KIT_KIND, hypnotist, ELEMENT_TARGET).element as BodyElement
        expect(element.negative).toBe(potionOfStatus(FRENZIED))
        expect((element.positive as PotionBoon).potion).toBe(potionOfStatus(DODGE))
    })

    test("a negative effect found → never replaced by a neutral one", () => {
        const mage = ALL_MONSTERS.find(each => each.name === "Mage de feu")!
        const healer = ALL_MONSTERS.find(each => each.name === "Gobelin soigneur")!
        const mind = ALL_MONSTERS.find(each => each.name === "Contrôleur mental")!
        const element = convertMany([
            { kind: MONSTER_KIND, value: mage }, { kind: MONSTER_KIND, value: healer },
            { kind: MONSTER_KIND, value: mind },
        ], ELEMENT_TARGET).element as BodyElement
        expect(element.negative).toBe(potionOfStatus(BURN))
    })

    test("a unit with nothing at all → told there is no negative, positive or neutral effect", () => {
        const goblin = ALL_MONSTERS.find(each => each.name === "Gobelin")!
        expect(() => convert(MONSTER_KIND, goblin, ELEMENT_TARGET)).toThrow("ni neutre")
    })

    test("a booster of poisons → the negative effects of its potions found, only the positive one missing", () => {
        const poisons = ALL_BOOSTERS.find(each => each.name === "Poisons")!
        const effects = analysisOf(BOOSTER_KIND.anatomy(poisons)).effects(BOOSTER_KIND.defaults)
        const names = effects.negative.flatMap(({ effect }) => effect.kind === "status" ? [effect.type.name] : [])
        expect(names).toContain(POISONED.name)
        const run = (): unknown => convert(BOOSTER_KIND, poisons, ELEMENT_TARGET)
        expect(run).toThrow("pas d'effet positif")
        expect(run).not.toThrow("pas d'effet négatif")
    })

    test("a monster that burns → the burn found as its negative effect, though the game has no potion of it", () => {
        const mage = ALL_MONSTERS.find(each => each.name === "Mage de feu")!
        const effects = analysisOf(MONSTER_KIND.anatomy(mage)).effects(MONSTER_KIND.defaults)
        expect(effects.negative.some(({ effect }) => effect.kind === "status" && effect.type === BURN)).toBe(true)
        expect(() => convert(MONSTER_KIND, mage, ELEMENT_TARGET)).not.toThrow("pas d'effet négatif")
    })

    test("a monster that burns and one that heals → an element: burn against, hearts for", () => {
        const mage = ALL_MONSTERS.find(each => each.name === "Mage de feu")!
        const healer = ALL_MONSTERS.find(each => each.name === "Gobelin soigneur")!
        const card = convertMany([
            { kind: MONSTER_KIND, value: mage }, { kind: MONSTER_KIND, value: healer },
        ], ELEMENT_TARGET)
        const element = card.element as BodyElement
        expect(element.negative).toBe(potionOfStatus(BURN))
        expect(element.positive).toBeInstanceOf(HeartsBoon)
        expect(element.name).toBe("Mage de feu-Gobelin soigneur")
        expect(element.key).toBe("Mage de feu-Gobelin soigneur (brûlure/1 cœurs rouge)")
    })

    test("a booster of poisons and a monster that heals → an element: poison against, hearts for", () => {
        const poisons = ALL_BOOSTERS.find(each => each.name === "Poisons")!
        const healer = ALL_MONSTERS.find(each => each.name === "Gobelin soigneur")!
        const card = convertMany([
            { kind: BOOSTER_KIND, value: poisons }, { kind: MONSTER_KIND, value: healer },
        ], ELEMENT_TARGET)
        const element = card.element as BodyElement
        expect(element.negative).toBe(POISON_POTION)
        expect(element.positive).toBeInstanceOf(HeartsBoon)
    })
})

describe("fusion and mix targets", () => {
    for(const target of [FUSION_TARGET, MERGED_TARGET] as Target<{ name: string }>[]){
        test(`every source → a ${target.id} that is the same each time, or the reason there is none`, () => {
            const failures: string[] = []
            for(const entry of SOURCES){
                const label = `${entry.source.id}:${entry.source.nameOf(entry.value)}`
                const first = attempt(target, entry)
                const second = attempt(target, entry)
                const [one, other] = [first, second].map(result => typeof result === "string" ? result : result.name)
                if(one !== other) failures.push(`${label}: not deterministic`)
                if(typeof first !== "string" && !first.name.includes(" de ") && !first.name.includes(" & ")){
                    failures.push(`${label}: named ${first.name}`)
                }
            }
            expect(failures).toEqual([])
        })

        test(`a source with a mix → a ${target.id} is found, never nothing for no reason`, () => {
            const results = SOURCES.map(entry => attempt(target, entry))
            expect(results.some(result => typeof result !== "string")).toBe(true)
        })
    }

    test("targets → the element is only built too", () => {
        expect(KINDS.map(kind => kind.id)).not.toContain(ELEMENT_TARGET.id)
        expect(TARGETS.map(target => target.id)).toContain(ELEMENT_TARGET.id)
    })

    test("targets → the fusion and the mix are only built, never offered as sources", () => {
        const sources = new Set(KINDS.map(kind => kind.id))
        expect(sources.has(FUSION_TARGET.id)).toBe(false)
        expect(sources.has(MERGED_TARGET.id)).toBe(false)
        const ids = TARGETS.map(target => target.id)
        expect(ids).toEqual(expect.arrayContaining([FUSION_TARGET.id, MERGED_TARGET.id]))
    })
})
